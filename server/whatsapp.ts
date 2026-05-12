/**
 * WHATSAPP CHANNEL MANAGER — whatsapp-web.js v1.34.7
 *
 * Uses the real WhatsApp Web client (Chromium via Puppeteer) so that
 * channel-admin posting works correctly.  Baileys' protocol-level
 * newsletter send is silently dropped by WhatsApp servers; this approach
 * uses window.WWebJS.sendMessage which the WhatsApp Web frontend uses.
 */

import { createRequire } from "module";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import qrcode from "qrcode";
import { log } from "./index";

const require = createRequire(import.meta.url);
const { Client, LocalAuth } = require("whatsapp-web.js");

const AUTH_DIR    = "./whatsapp-auth-wwebjs";
const CONFIG_FILE = "./whatsapp-config.json";

const CHROMIUM_PATH = "/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium-browser";

type WAStatus = "disconnected" | "connecting" | "qr" | "connected";

interface WAState {
  status: WAStatus;
  qrBase64: string | null;
  phoneNumber: string | null;
  channelJid: string | null;
  targetChatId: string | null;
  error: string | null;
}

interface WAConfig {
  channelJid: string | null;
}

async function loadConfig(): Promise<WAConfig> {
  try {
    if (existsSync(CONFIG_FILE)) {
      const raw = await readFile(CONFIG_FILE, "utf-8");
      const p   = JSON.parse(raw);
      return { channelJid: p.channelJid ?? p.targetChatId ?? null };
    }
  } catch {}
  return { channelJid: null };
}

async function saveConfig(c: WAConfig) {
  try {
    await writeFile(CONFIG_FILE, JSON.stringify(c, null, 2), "utf-8");
  } catch (err) {
    log(`[WhatsApp] Failed to save config: ${err}`);
  }
}

function normalizeNewsletterJid(input: string): string {
  const t = input.trim();
  if (t.endsWith("@newsletter")) return t;
  const urlMatch = t.match(/whatsapp\.com\/channel\/([A-Za-z0-9_-]+)/i);
  if (urlMatch) return `${urlMatch[1]}@newsletter`;
  if (!t.includes("@") && t.length > 8) return `${t}@newsletter`;
  return t;
}

class WhatsAppManager {
  private client: any = null;
  private state: WAState = {
    status: "disconnected",
    qrBase64: null,
    phoneNumber: null,
    channelJid: null,
    targetChatId: null,
    error: null,
  };
  private qrListeners:    Array<(qr: string) => void>    = [];
  private statusListeners: Array<(s: WAState) => void>   = [];
  private shouldReconnect = false;
  private destroying = false;

  constructor() {
    loadConfig().then((cfg) => {
      if (cfg.channelJid) {
        this.state.channelJid   = cfg.channelJid;
        this.state.targetChatId = cfg.channelJid;
        log(`[WhatsApp] Loaded saved channel JID: ${cfg.channelJid}`);
      }
    });
  }

  getState(): WAState { return { ...this.state }; }

  setChannelJid(input: string) {
    const jid = normalizeNewsletterJid(input);
    if (!jid.endsWith("@newsletter")) {
      throw new Error(`Only @newsletter channel JIDs accepted. Got: ${jid}`);
    }
    this.state.channelJid   = jid;
    this.state.targetChatId = jid;
    this.emit();
    saveConfig({ channelJid: jid });
    log(`[WhatsApp] Channel JID set: ${jid}`);
  }

  setTargetChatId(input: string) { this.setChannelJid(input); }

  onQR(cb: (qr: string) => void) {
    this.qrListeners.push(cb);
    if (this.state.qrBase64) cb(this.state.qrBase64);
    return () => { this.qrListeners = this.qrListeners.filter(l => l !== cb); };
  }

  onStatus(cb: (s: WAState) => void) {
    this.statusListeners.push(cb);
    cb({ ...this.state });
    return () => { this.statusListeners = this.statusListeners.filter(l => l !== cb); };
  }

  private emit() {
    const s = { ...this.state };
    this.statusListeners.forEach(l => l(s));
  }

  async connect(): Promise<void> {
    if (this.state.status === "connected" || this.state.status === "connecting" || this.state.status === "qr") {
      return;
    }
    this.shouldReconnect = true;
    this.destroying      = false;
    this.state.status    = "connecting";
    this.state.error     = null;
    this.emit();

    // Non-blocking: launch in background
    this._init().catch((err) => {
      log(`[WhatsApp] Unhandled init error: ${err}`);
      this.state.status = "disconnected";
      this.state.error  = String(err);
      this.emit();
    });
  }

  private async _init(): Promise<void> {
    try {
      // Clean up existing client
      if (this.client) {
        this.destroying = true;
        try { await this.client.destroy(); } catch {}
        this.client    = null;
        this.destroying = false;
      }

      if (!existsSync(AUTH_DIR)) await mkdir(AUTH_DIR, { recursive: true });

      log(`[WhatsApp] Starting whatsapp-web.js client with Chromium…`);

      this.client = new Client({
        authStrategy: new LocalAuth({ dataPath: AUTH_DIR }),
        puppeteer: {
          executablePath: CHROMIUM_PATH,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--no-first-run",
            "--no-zygote",
            "--single-process",
            "--disable-gpu",
            "--disable-software-rasterizer",
            "--disable-extensions",
            "--disable-background-networking",
            "--disable-translate",
          ],
          headless: true,
          timeout: 120000,
        },
      });

      // ── QR ──────────────────────────────────────────────────────────────
      this.client.on("qr", async (qr: string) => {
        try {
          const qrBase64 = await qrcode.toDataURL(qr, { width: 280, margin: 2 });
          this.state.qrBase64 = qrBase64;
          this.state.status   = "qr";
          this.emit();
          this.qrListeners.forEach(l => l(qrBase64));
          log("[WhatsApp] QR ready — scan with the CHANNEL OWNER/ADMIN account");
        } catch (err) {
          log(`[WhatsApp] QR render error: ${err}`);
        }
      });

      // ── Ready ────────────────────────────────────────────────────────────
      this.client.on("ready", async () => {
        this.state.status   = "connected";
        this.state.qrBase64 = null;
        this.state.error    = null;

        try {
          const info = this.client.info;
          if (info?.wid?.user) {
            this.state.phoneNumber = info.wid.user;
          }
        } catch {}

        this.emit();
        log(`[WhatsApp] ✓ Connected as +${this.state.phoneNumber || "unknown"}`);
        if (this.state.channelJid) {
          log(`[WhatsApp] Ready to post to channel: ${this.state.channelJid}`);
        } else {
          log("[WhatsApp] ⚠ No channel JID configured — set it in the WhatsApp tab");
        }
      });

      // ── Auth success ─────────────────────────────────────────────────────
      this.client.on("authenticated", () => {
        log("[WhatsApp] Authenticated successfully");
      });

      // ── Auth failure ─────────────────────────────────────────────────────
      this.client.on("auth_failure", (msg: string) => {
        log(`[WhatsApp] Auth failure: ${msg}`);
        this.state.status = "disconnected";
        this.state.error  = `Auth failed: ${msg}`;
        this.emit();
      });

      // ── Disconnected ─────────────────────────────────────────────────────
      this.client.on("disconnected", async (reason: string) => {
        if (this.destroying) return;
        log(`[WhatsApp] Disconnected: ${reason}`);
        const savedJid = this.state.channelJid;
        this.state = {
          status:      "disconnected",
          qrBase64:    null,
          phoneNumber: null,
          channelJid:  savedJid,
          targetChatId: savedJid,
          error:       reason === "LOGOUT" ? "Logged out — scan QR again" : null,
        };
        this.emit();

        if (this.shouldReconnect && reason !== "LOGOUT") {
          log("[WhatsApp] Reconnecting in 10s…");
          setTimeout(() => this._init(), 10_000);
        }
      });

      await this.client.initialize();
    } catch (err) {
      log(`[WhatsApp] Init error: ${err}`);
      if (!this.destroying) {
        this.state.status = "disconnected";
        this.state.error  = String(err);
        this.emit();
        if (this.shouldReconnect) {
          log("[WhatsApp] Retrying in 15s…");
          setTimeout(() => this._init(), 15_000);
        }
      }
    }
  }

  async disconnect(): Promise<void> {
    this.shouldReconnect = false;
    this.destroying      = true;
    if (this.client) {
      try { await this.client.destroy(); } catch {}
      this.client = null;
    }
    this.destroying = false;
    const savedJid = this.state.channelJid;
    this.state = {
      status:      "disconnected",
      qrBase64:    null,
      phoneNumber: null,
      channelJid:  savedJid,
      targetChatId: savedJid,
      error:       null,
    };
    this.emit();
    log("[WhatsApp] Disconnected");
  }

  private async _clearAuth() {
    try {
      const { rm } = await import("fs/promises");
      if (existsSync(AUTH_DIR)) {
        await rm(AUTH_DIR, { recursive: true, force: true });
        log("[WhatsApp] Auth cleared");
      }
    } catch (err) {
      log(`[WhatsApp] Failed to clear auth: ${err}`);
    }
  }

  /**
   * Send a text message to the configured WhatsApp Channel.
   * The connected account MUST be the channel owner or admin.
   */
  async sendToChannel(text: string): Promise<boolean> {
    const jid = this.state.channelJid;
    if (!jid?.endsWith("@newsletter")) {
      log("[WhatsApp] ✗ No valid @newsletter channel JID configured");
      return false;
    }
    if (!this.client || this.state.status !== "connected") {
      log(`[WhatsApp] ✗ Not connected (status: ${this.state.status})`);
      return false;
    }
    try {
      log(`[WhatsApp] Sending to channel ${jid}…`);
      await this.client.sendMessage(jid, text);
      log(`[WhatsApp] ✓ Message posted to channel ${jid}`);
      return true;
    } catch (err: any) {
      log(`[WhatsApp] ✗ Send failed: ${err?.message || err}`);
      return false;
    }
  }

  /**
   * Send image + caption to the channel.
   * Falls back to text-only if image fails.
   */
  async sendImageToChannel(imageUrl: string, caption: string): Promise<boolean> {
    const jid = this.state.channelJid;
    if (!jid?.endsWith("@newsletter")) {
      log("[WhatsApp] ✗ No valid @newsletter JID");
      return false;
    }
    if (!this.client || this.state.status !== "connected") {
      log(`[WhatsApp] ✗ Not connected`);
      return false;
    }
    if (!imageUrl?.startsWith("http")) {
      return this.sendToChannel(caption);
    }
    try {
      const { MessageMedia } = require("whatsapp-web.js");
      log(`[WhatsApp] Sending image to channel ${jid}…`);
      const media = await MessageMedia.fromUrl(imageUrl, { unsafeMime: true });
      await this.client.sendMessage(jid, media, { caption });
      log(`[WhatsApp] ✓ Image posted to channel ${jid}`);
      return true;
    } catch (err: any) {
      log(`[WhatsApp] ✗ Image failed (${err?.message || err}) — falling back to text`);
      return this.sendToChannel(caption);
    }
  }

  /** Resolve an invite link or raw code → newsletter JID */
  async resolveChannelInput(input: string): Promise<{ jid: string; name: string; subscribers: number } | null> {
    const t = input.trim();
    const urlMatch = t.match(/whatsapp\.com\/channel\/([A-Za-z0-9_-]+)/i);
    const code     = urlMatch ? urlMatch[1] : (!t.includes("@") && !t.includes(".") ? t : null);

    if (code) {
      // Build JID from code
      const jid = `${code}@newsletter`;
      // Try to get channel name via whatsapp-web.js
      if (this.client && this.state.status === "connected") {
        try {
          const channel = await this.client.getChannelByInviteCode(code);
          if (channel) {
            return { jid: channel.id._serialized, name: channel.name || jid, subscribers: 0 };
          }
        } catch {}
      }
      return { jid, name: jid, subscribers: 0 };
    }

    if (t.endsWith("@newsletter")) {
      // Try to look up by getting channels list
      if (this.client && this.state.status === "connected") {
        try {
          const channels = await this.client.getChannels();
          const match    = channels.find((c: any) => c.id._serialized === t);
          if (match) return { jid: t, name: match.name || t, subscribers: 0 };
        } catch {}
      }
      return { jid: t, name: t, subscribers: 0 };
    }

    return null;
  }

  async fetchChannelInfo(jid: string): Promise<{ name: string; subscribers: number; description: string } | null> {
    if (!jid.endsWith("@newsletter")) return null;
    if (!this.client || this.state.status !== "connected") return { name: jid, subscribers: 0, description: "" };

    try {
      const channels = await this.client.getChannels();
      const match    = channels.find((c: any) => c.id._serialized === jid);
      if (match) return { name: match.name || jid, subscribers: 0, description: match.description || "" };
    } catch {}

    return { name: jid, subscribers: 0, description: "" };
  }

  isConnected(): boolean { return this.state.status === "connected"; }
}

export const waManager = new WhatsAppManager();
