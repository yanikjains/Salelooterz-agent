/**
 * WHATSAPP SEND-ONLY MANAGER
 *
 * WHAT THIS CODE DOES:
 *   ✅ Sends messages to ONE specific channel/group JID you configure
 *   ✅ Maintains the connection (reconnects if dropped)
 *   ✅ Generates QR code for initial login
 *   ✅ Persists the channel JID to disk (survives server restarts)
 *
 * WHAT THIS CODE DELIBERATELY DOES NOT DO:
 *   ❌ No listener for incoming messages
 *   ❌ No reading of any chats, contacts, or call logs
 *   ❌ No syncing of chat history
 *   ❌ No marking messages as read
 *   ❌ No presence updates
 */

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  type WASocket,
  type ConnectionState,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { mkdir, readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import qrcode from "qrcode";
import pino from "pino";
import { log } from "./index";

const AUTH_DIR = "./whatsapp-auth";
const CONFIG_FILE = "./whatsapp-config.json";

type WAStatus = "disconnected" | "connecting" | "qr" | "connected";

interface WAState {
  status: WAStatus;
  qrBase64: string | null;
  phoneNumber: string | null;
  channelJid: string | null;
  error: string | null;
}

interface WAConfig {
  channelJid: string | null;
}

// Silent pino logger — suppresses Baileys noise but still captures errors
const baileysLogger = pino({ level: "silent" });

async function loadConfig(): Promise<WAConfig> {
  try {
    if (existsSync(CONFIG_FILE)) {
      const raw = await readFile(CONFIG_FILE, "utf-8");
      return JSON.parse(raw) as WAConfig;
    }
  } catch {}
  return { channelJid: null };
}

async function saveConfig(config: WAConfig): Promise<void> {
  try {
    await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
  } catch (err) {
    log(`[WhatsApp] Failed to save config: ${err}`);
  }
}

class WhatsAppManager {
  private sock: WASocket | null = null;
  private state: WAState = {
    status: "disconnected",
    qrBase64: null,
    phoneNumber: null,
    channelJid: null,
    error: null,
  };
  private qrListeners: Array<(qr: string) => void> = [];
  private statusListeners: Array<(s: WAState) => void> = [];
  private reconnectTimer: NodeJS.Timeout | null = null;
  private shouldReconnect = true;

  constructor() {
    // Load persisted channel JID on startup
    loadConfig().then((cfg) => {
      if (cfg.channelJid) {
        this.state.channelJid = cfg.channelJid;
        log(`[WhatsApp] Loaded saved channel JID: ${cfg.channelJid}`);
      }
    });
  }

  getState(): WAState {
    return { ...this.state };
  }

  setChannelJid(jid: string) {
    const normalized = normalizeJid(jid.trim());
    this.state.channelJid = normalized;
    this.emit();
    // Persist to disk so it survives restarts
    saveConfig({ channelJid: normalized });
    log(`[WhatsApp] Channel JID set to: ${normalized}`);
  }

  onQR(cb: (qr: string) => void) {
    this.qrListeners.push(cb);
    if (this.state.qrBase64) cb(this.state.qrBase64);
    return () => { this.qrListeners = this.qrListeners.filter(l => l !== cb); };
  }

  onStatus(cb: (s: WAState) => void) {
    this.statusListeners.push(cb);
    cb(this.state);
    return () => { this.statusListeners = this.statusListeners.filter(l => l !== cb); };
  }

  private emit() {
    this.statusListeners.forEach(l => l({ ...this.state }));
  }

  async connect(): Promise<void> {
    if (this.state.status === "connected" || this.state.status === "connecting") return;

    this.shouldReconnect = true;
    this.state.status = "connecting";
    this.state.error = null;
    this.emit();

    try {
      if (!existsSync(AUTH_DIR)) {
        await mkdir(AUTH_DIR, { recursive: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
      const { version } = await fetchLatestBaileysVersion();

      log(`[WhatsApp] Connecting (send-only mode) — Baileys v${version.join(".")}`);

      this.sock = makeWASocket({
        version,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, baileysLogger),
        },
        logger: baileysLogger,
        printQRInTerminal: false,
        browser: ["SaleLooterz Bot", "Chrome", "120.0.0"],
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 30000,
        keepAliveIntervalMs: 25000,

        syncFullHistory: false,
        markOnlineOnConnect: false,
        generateHighQualityLinkPreview: false,
        getMessage: async () => undefined,
      });

      this.sock.ev.on("creds.update", saveCreds);

      this.sock.ev.on("connection.update", async (update: Partial<ConnectionState>) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            const qrBase64 = await qrcode.toDataURL(qr, { width: 280, margin: 2 });
            this.state.qrBase64 = qrBase64;
            this.state.status = "qr";
            this.emit();
            this.qrListeners.forEach(l => l(qrBase64));
            log("[WhatsApp] QR ready — waiting for scan");
          } catch (err) {
            log(`[WhatsApp] QR error: ${err}`);
          }
        }

        if (connection === "open") {
          this.state.status = "connected";
          this.state.qrBase64 = null;
          this.state.error = null;
          const creds = state.creds as any;
          if (creds?.me?.id) {
            this.state.phoneNumber = creds.me.id.split(":")[0].split("@")[0];
          }
          this.emit();
          log(`[WhatsApp] Connected. Number: +${this.state.phoneNumber || "unknown"}`);
        }

        if (connection === "close") {
          const reason = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const loggedOut = reason === DisconnectReason.loggedOut;

          this.state.status = "disconnected";
          this.state.qrBase64 = null;
          if (loggedOut) {
            this.state.error = "Logged out — scan QR again to reconnect";
            this.shouldReconnect = false;
            this.clearAuth();
          }
          this.emit();
          log(`[WhatsApp] Disconnected. Reason code: ${reason}`);

          if (this.shouldReconnect && !loggedOut) {
            const delay = reason === DisconnectReason.restartRequired ? 1000 : 8000;
            log(`[WhatsApp] Reconnecting in ${delay / 1000}s...`);
            this.reconnectTimer = setTimeout(() => this.connect(), delay);
          }
        }
      });

    } catch (err) {
      log(`[WhatsApp] Connection error: ${err}`);
      this.state.status = "disconnected";
      this.state.error = String(err);
      this.emit();
      if (this.shouldReconnect) {
        this.reconnectTimer = setTimeout(() => this.connect(), 10000);
      }
    }
  }

  async disconnect(): Promise<void> {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.sock) {
      try { await this.sock.logout(); } catch {}
      this.sock = null;
    }
    this.clearAuth();
    // Keep channelJid so user doesn't have to re-enter it
    const savedJid = this.state.channelJid;
    this.state = { status: "disconnected", qrBase64: null, phoneNumber: null, channelJid: savedJid, error: null };
    this.emit();
    log("[WhatsApp] Disconnected and session cleared");
  }

  private async clearAuth(): Promise<void> {
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
   * THE ONLY WHATSAPP FUNCTION THIS APP CALLS.
   * Sends a text message to the configured channel JID only.
   */
  async sendToChannel(text: string): Promise<boolean> {
    const jid = this.state.channelJid;
    if (!jid) {
      log("[WhatsApp] No channel JID set — cannot send. Set it in the WhatsApp tab.");
      return false;
    }
    if (!this.sock || this.state.status !== "connected") {
      log("[WhatsApp] Not connected — cannot send");
      return false;
    }
    try {
      await this.sock.sendMessage(jid, { text });
      log(`[WhatsApp] ✓ Sent to ${jid}`);
      return true;
    } catch (err: any) {
      log(`[WhatsApp] Send failed to ${jid}: ${err?.message || err}`);
      if (err?.stack) log(`[WhatsApp] Stack: ${err.stack}`);
      return false;
    }
  }

  isConnected(): boolean {
    return this.state.status === "connected";
  }
}

/**
 * Normalize a JID or phone number entered by the user.
 * - If it already has @g.us or @newsletter or @s.whatsapp.net → return as-is
 * - If it looks like a phone number (digits only) → append @s.whatsapp.net
 * - Otherwise → return trimmed as-is
 */
function normalizeJid(input: string): string {
  const trimmed = input.trim();
  if (trimmed.includes("@")) return trimmed; // already has domain
  // Strip any non-digit characters (spaces, dashes, +) from phone numbers
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length > 7) return `${digits}@s.whatsapp.net`;
  return trimmed;
}

export const waManager = new WhatsAppManager();
