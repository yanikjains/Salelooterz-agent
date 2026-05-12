/**
 * WHATSAPP SEND-ONLY MANAGER — whatsapp-web.js edition
 *
 * Uses a real WhatsApp Web browser session (puppeteer + Chromium) which is
 * far more reliable than the Baileys multi-device protocol for sending messages
 * to groups and individual chats.
 *
 * WHAT THIS CODE DOES:
 *   ✅ Connects via QR code scan (same as WhatsApp Web)
 *   ✅ Sends messages to ONE group or phone number you configure
 *   ✅ Auto-reconnects if the session drops
 *   ✅ Persists session to disk (survives server restarts)
 *
 * WHAT THIS CODE DELIBERATELY DOES NOT DO:
 *   ❌ No reading of any chats or messages
 *   ❌ No contact or call log access
 *   ❌ No message listeners
 *   ❌ No marking messages as read
 */

import { Client, LocalAuth, MessageMedia } from "whatsapp-web.js";
import qrcode from "qrcode";
import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { log } from "./index";

const CONFIG_FILE = "./whatsapp-config.json";
const CHROMIUM_PATH = "/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium";

type WAStatus = "disconnected" | "connecting" | "qr" | "connected";

interface WAState {
  status: WAStatus;
  qrBase64: string | null;
  phoneNumber: string | null;
  targetChatId: string | null; // e.g. 919996572965@c.us or 120363XXX@g.us
  error: string | null;
}

interface WAConfig {
  targetChatId: string | null;
}

async function loadConfig(): Promise<WAConfig> {
  try {
    if (existsSync(CONFIG_FILE)) {
      const raw = await readFile(CONFIG_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      // Migrate old channelJid field → targetChatId
      return { targetChatId: parsed.targetChatId ?? parsed.channelJid ?? null };
    }
  } catch {}
  return { targetChatId: null };
}

async function saveConfig(config: WAConfig): Promise<void> {
  try {
    await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
  } catch (err) {
    log(`[WhatsApp] Failed to save config: ${err}`);
  }
}

/**
 * Convert a human-entered target (phone number or group ID) into a WhatsApp chat ID.
 * - "919996572965"           → "919996572965@c.us"
 * - "919996572965@c.us"      → unchanged
 * - "120363XXX@g.us"         → unchanged
 * - "+91 99965 72965"        → "919996572965@c.us"
 */
function normalizeChatId(input: string): string {
  const t = input.trim();
  if (t.includes("@")) return t; // already has suffix
  // Strip non-digits (spaces, dashes, plus)
  const digits = t.replace(/\D/g, "");
  return `${digits}@c.us`;
}

class WhatsAppManager {
  private client: Client | null = null;
  private state: WAState = {
    status: "disconnected",
    qrBase64: null,
    phoneNumber: null,
    targetChatId: null,
    error: null,
  };
  private qrListeners: Array<(qr: string) => void> = [];
  private statusListeners: Array<(s: WAState) => void> = [];
  private reconnectTimer: NodeJS.Timeout | null = null;
  private shouldReconnect = true;
  private initPromise: Promise<void> | null = null;

  constructor() {
    loadConfig().then((cfg) => {
      if (cfg.targetChatId) {
        this.state.targetChatId = cfg.targetChatId;
        log(`[WhatsApp] Loaded saved target: ${cfg.targetChatId}`);
      }
    });
  }

  getState(): WAState {
    return { ...this.state };
  }

  setTargetChatId(input: string) {
    const chatId = normalizeChatId(input);
    this.state.targetChatId = chatId;
    this.emit();
    saveConfig({ targetChatId: chatId });
    log(`[WhatsApp] Target chat set to: ${chatId}`);
  }

  /** Legacy alias used by routes.ts */
  setChannelJid(input: string) {
    this.setTargetChatId(input);
  }

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
    if (this.state.status === "connected" || this.state.status === "connecting") return;
    if (this.initPromise) return this.initPromise;

    this.shouldReconnect = true;
    this.state.status = "connecting";
    this.state.error = null;
    this.emit();

    this.initPromise = this._init().finally(() => {
      this.initPromise = null;
    });
    return this.initPromise;
  }

  private async _init(): Promise<void> {
    try {
      log("[WhatsApp] Initialising whatsapp-web.js client…");

      // Destroy any leftover client
      if (this.client) {
        try { await this.client.destroy(); } catch {}
        this.client = null;
      }

      this.client = new Client({
        authStrategy: new LocalAuth({ dataPath: "./whatsapp-auth-wwebjs" }),
        puppeteer: {
          executablePath: CHROMIUM_PATH,
          headless: true,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--disable-gpu",
            "--no-first-run",
            "--no-zygote",
            "--single-process",
            "--disable-extensions",
            "--disable-background-networking",
            "--disable-default-apps",
            "--disable-sync",
            "--disable-translate",
            "--hide-scrollbars",
            "--metrics-recording-only",
            "--mute-audio",
            "--safebrowsing-disable-auto-update",
          ],
        },
        // Do not emit events for messages we send ourselves
        takeoverOnConflict: true,
        takeoverTimeoutMs: 0,
      });

      this.client.on("qr", async (qr: string) => {
        try {
          const qrBase64 = await qrcode.toDataURL(qr, { width: 280, margin: 2 });
          this.state.qrBase64 = qrBase64;
          this.state.status = "qr";
          this.emit();
          this.qrListeners.forEach(l => l(qrBase64));
          log("[WhatsApp] QR ready — waiting for scan");
        } catch (err) {
          log(`[WhatsApp] QR generation error: ${err}`);
        }
      });

      this.client.on("ready", () => {
        const info = this.client?.info;
        this.state.status = "connected";
        this.state.qrBase64 = null;
        this.state.error = null;
        if (info?.wid?.user) {
          this.state.phoneNumber = info.wid.user;
        }
        this.emit();
        log(`[WhatsApp] ✓ Connected — +${this.state.phoneNumber || "unknown"}`);
      });

      this.client.on("authenticated", () => {
        log("[WhatsApp] Authenticated successfully");
      });

      this.client.on("auth_failure", (msg: string) => {
        log(`[WhatsApp] Auth failure: ${msg}`);
        this.state.status = "disconnected";
        this.state.error = `Authentication failed: ${msg}`;
        this.state.qrBase64 = null;
        this.emit();
        this.clearAuth();
      });

      this.client.on("disconnected", (reason: string) => {
        log(`[WhatsApp] Disconnected: ${reason}`);
        this.state.status = "disconnected";
        this.state.qrBase64 = null;
        this.emit();

        if (this.shouldReconnect) {
          log("[WhatsApp] Reconnecting in 10s…");
          this.reconnectTimer = setTimeout(() => this.connect(), 10_000);
        }
      });

      await this.client.initialize();
    } catch (err) {
      log(`[WhatsApp] Init error: ${err}`);
      this.state.status = "disconnected";
      this.state.error = String(err);
      this.emit();
      if (this.shouldReconnect) {
        this.reconnectTimer = setTimeout(() => this.connect(), 15_000);
      }
    }
  }

  async disconnect(): Promise<void> {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.client) {
      try { await this.client.destroy(); } catch {}
      this.client = null;
    }
    await this.clearAuth();
    const saved = this.state.targetChatId;
    this.state = { status: "disconnected", qrBase64: null, phoneNumber: null, targetChatId: saved, error: null };
    this.emit();
    log("[WhatsApp] Disconnected and session cleared");
  }

  private async clearAuth(): Promise<void> {
    try {
      const { rm } = await import("fs/promises");
      const { existsSync } = await import("fs");
      const dir = "./whatsapp-auth-wwebjs";
      if (existsSync(dir)) {
        await rm(dir, { recursive: true, force: true });
        log("[WhatsApp] Auth cleared");
      }
    } catch (err) {
      log(`[WhatsApp] Failed to clear auth: ${err}`);
    }
  }

  /**
   * Send a text message to the configured target chat/group.
   */
  async sendToChannel(text: string): Promise<boolean> {
    const chatId = this.state.targetChatId;
    if (!chatId) {
      log("[WhatsApp] No target chat ID set — cannot send. Set it in the WhatsApp tab.");
      return false;
    }
    if (!this.client || this.state.status !== "connected") {
      log("[WhatsApp] Not connected — cannot send");
      return false;
    }
    try {
      await this.client.sendMessage(chatId, text);
      log(`[WhatsApp] ✓ Sent text to ${chatId}`);
      return true;
    } catch (err: any) {
      log(`[WhatsApp] Send failed to ${chatId}: ${err?.message || err}`);
      return false;
    }
  }

  /**
   * Send an image with caption. Falls back to text-only if image fails.
   */
  async sendImageToChannel(imageUrl: string, caption: string): Promise<boolean> {
    const chatId = this.state.targetChatId;
    if (!chatId) {
      log("[WhatsApp] No target chat ID set — cannot send image");
      return false;
    }
    if (!this.client || this.state.status !== "connected") {
      log("[WhatsApp] Not connected — cannot send image");
      return false;
    }
    if (!imageUrl || !imageUrl.startsWith("http")) {
      return this.sendToChannel(caption);
    }
    try {
      const media = await MessageMedia.fromUrl(imageUrl, { unsafeMime: true });
      await this.client.sendMessage(chatId, media, { caption });
      log(`[WhatsApp] ✓ Sent image+caption to ${chatId}`);
      return true;
    } catch (err: any) {
      log(`[WhatsApp] Image send failed (${err?.message || err}), falling back to text`);
      return this.sendToChannel(caption);
    }
  }

  /** Resolve invite link / phone / group ID → normalized chat ID */
  async resolveChannelInput(input: string): Promise<{ jid: string; name: string; subscribers: number } | null> {
    const chatId = normalizeChatId(input.trim());
    return { jid: chatId, name: chatId.replace("@c.us", "").replace("@g.us", " (group)"), subscribers: 0 };
  }

  /** No-op for groups (was newsletter-specific in Baileys) */
  async fetchChannelInfo(_jid: string): Promise<{ name: string; subscribers: number; description: string } | null> {
    return null;
  }

  isConnected(): boolean {
    return this.state.status === "connected";
  }

  // Legacy getter so routes.ts still works
  get channelJidCompat(): string | null {
    return this.state.targetChatId;
  }
}

export const waManager = new WhatsAppManager();
