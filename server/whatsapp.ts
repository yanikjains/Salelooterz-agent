/**
 * WHATSAPP CHANNEL MANAGER — Baileys RC11
 *
 * Key fix: after connecting, call newsletterMetadata() to establish the
 * admin session context that WhatsApp requires before accepting channel posts.
 * Without this warmup, the server silently drops newsletter message stanzas
 * even though Baileys reports "sent".
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

const AUTH_DIR    = "./whatsapp-auth";
const CONFIG_FILE = "./whatsapp-config.json";

const baileysLogger = pino({ level: "warn" });

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
  private sock: WASocket | null = null;
  private state: WAState = {
    status:       "disconnected",
    qrBase64:     null,
    phoneNumber:  null,
    channelJid:   null,
    targetChatId: null,
    error:        null,
  };
  private qrListeners:     Array<(qr: string) => void>    = [];
  private statusListeners: Array<(s: WAState) => void>    = [];
  private reconnectTimer:  NodeJS.Timeout | null          = null;
  private shouldReconnect  = true;
  private adminContextReady = false;

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
      throw new Error(`Only @newsletter JIDs accepted. Got: ${jid}`);
    }
    this.state.channelJid   = jid;
    this.state.targetChatId = jid;
    this.adminContextReady  = false;
    this.emit();
    saveConfig({ channelJid: jid });
    log(`[WhatsApp] Channel JID set: ${jid}`);
    // Re-establish admin context if already connected
    if (this.state.status === "connected") {
      this._warmupNewsletter(jid);
    }
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
    if (this.state.status === "connected" || this.state.status === "connecting") return;
    this.shouldReconnect = true;
    this.state.status    = "connecting";
    this.state.error     = null;
    this.emit();
    this._init().catch((err) => {
      log(`[WhatsApp] Unhandled init error: ${err}`);
    });
  }

  /**
   * Call newsletterMetadata to establish admin context.
   * WhatsApp's server uses the `w:mex` IQ exchange to verify the session
   * has admin rights before processing channel message stanzas.
   */
  private async _warmupNewsletter(jid: string): Promise<void> {
    if (!this.sock || !jid) return;
    try {
      log(`[WhatsApp] Warming up newsletter context for ${jid}…`);
      const raw: any = await (this.sock as any).newsletterMetadata("jid", jid);
      this.adminContextReady = true;

      // The raw response can vary by Baileys version — extract what we can
      const thread = raw?.thread_metadata || raw || {};
      const viewer = raw?.viewer_metadata || {};
      const name   = thread?.name?.text || raw?.name || jid;
      const subs   = thread?.subscribers_count ?? raw?.subscribers ?? 0;
      // Role field: OWNER, ADMIN, SUBSCRIBER, GUEST, etc.
      const role   = viewer?.role || viewer?.admin_type || raw?.role || "UNKNOWN";

      log(`[WhatsApp] ✓ Channel: "${name}" | Subscribers: ${subs} | Your role: ${role}`);

      if (role !== "OWNER" && role !== "ADMIN") {
        log(
          `[WhatsApp] ⚠ WARNING: role is "${role}" — messages will be SILENTLY DROPPED by WhatsApp server.` +
          ` Make sure you scanned QR with the channel OWNER/ADMIN phone and the JID is correct.`
        );
      } else {
        log(`[WhatsApp] ✓ Admin context confirmed — ready to post to channel "${name}"`);
      }
    } catch (err: any) {
      log(`[WhatsApp] Newsletter warmup warning: ${err?.message || err} (continuing anyway)`);
      this.adminContextReady = true;
    }
  }

  private async _init(): Promise<void> {
    try {
      if (!existsSync(AUTH_DIR)) await mkdir(AUTH_DIR, { recursive: true });

      const { state: authState, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
      const { version } = await fetchLatestBaileysVersion();
      log(`[WhatsApp] Connecting — Baileys ${version.join(".")}`);

      if (this.sock) {
        try { this.sock.end(undefined); } catch {}
        this.sock = null;
      }

      this.adminContextReady = false;

      this.sock = makeWASocket({
        version,
        auth: {
          creds: authState.creds,
          keys:  makeCacheableSignalKeyStore(authState.keys, baileysLogger),
        },
        logger:                  baileysLogger,
        printQRInTerminal:       false,
        browser:                 ["WhatsApp", "Chrome", "124.0.0"],
        connectTimeoutMs:        60_000,
        defaultQueryTimeoutMs:   30_000,
        keepAliveIntervalMs:     20_000,
        syncFullHistory:         false,
        shouldSyncHistoryMessage: () => false,
        markOnlineOnConnect:     true,
        emitOwnEvents:           false,
        generateHighQualityLinkPreview: false,
        getMessage:              async () => undefined,
      });

      this.sock.ev.on("creds.update", saveCreds);

      this.sock.ev.on("connection.update", async (update: Partial<ConnectionState>) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            const qrBase64 = await qrcode.toDataURL(qr, { width: 280, margin: 2 });
            this.state.qrBase64 = qrBase64;
            this.state.status   = "qr";
            this.emit();
            this.qrListeners.forEach(l => l(qrBase64));
            log("[WhatsApp] QR ready — scan with channel OWNER/ADMIN phone");
          } catch (err) { log(`[WhatsApp] QR error: ${err}`); }
        }

        if (connection === "open") {
          this.state.status   = "connected";
          this.state.qrBase64 = null;
          this.state.error    = null;
          const creds = authState.creds as any;
          if (creds?.me?.id) {
            this.state.phoneNumber = creds.me.id.split(":")[0].split("@")[0];
          }
          this.emit();
          log(`[WhatsApp] ✓ Connected as +${this.state.phoneNumber || "unknown"}`);

          // Warmup newsletter admin context AFTER connection is established
          if (this.state.channelJid) {
            await this._warmupNewsletter(this.state.channelJid);
          } else {
            log("[WhatsApp] ⚠ No channel JID set — configure it in the WhatsApp tab");
          }
        }

        if (connection === "close") {
          const reason    = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const loggedOut = reason === DisconnectReason.loggedOut;
          log(`[WhatsApp] Disconnected. Code: ${reason}${loggedOut ? " (logged out)" : ""}`);

          this.state.status   = "disconnected";
          this.state.qrBase64 = null;
          this.adminContextReady = false;
          if (loggedOut) {
            this.state.error     = "Logged out — scan QR again";
            this.shouldReconnect = false;
            await this._clearAuth();
          }
          this.emit();

          if (this.shouldReconnect && !loggedOut) {
            const delay = reason === DisconnectReason.restartRequired ? 1_500 : 10_000;
            log(`[WhatsApp] Reconnecting in ${delay / 1000}s…`);
            this.reconnectTimer = setTimeout(() => this._init(), delay);
          }
        }
      });

    } catch (err) {
      log(`[WhatsApp] Connection error: ${err}`);
      this.state.status = "disconnected";
      this.state.error  = String(err);
      this.emit();
      if (this.shouldReconnect) {
        this.reconnectTimer = setTimeout(() => this._init(), 12_000);
      }
    }
  }

  async disconnect(): Promise<void> {
    this.shouldReconnect = false;
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    if (this.sock) {
      try { await this.sock.logout(); } catch {}
      this.sock = null;
    }
    await this._clearAuth();
    const savedJid = this.state.channelJid;
    this.state = {
      status: "disconnected", qrBase64: null, phoneNumber: null,
      channelJid: savedJid, targetChatId: savedJid, error: null,
    };
    this.adminContextReady = false;
    this.emit();
    log("[WhatsApp] Disconnected and session cleared");
  }

  private async _clearAuth() {
    try {
      const { rm } = await import("fs/promises");
      if (existsSync(AUTH_DIR)) {
        await rm(AUTH_DIR, { recursive: true, force: true });
        log("[WhatsApp] Auth cleared");
      }
    } catch (err) { log(`[WhatsApp] Failed to clear auth: ${err}`); }
  }

  /**
   * Send a text message to the configured WhatsApp Channel.
   * The connected account MUST be channel owner or admin.
   */
  async sendToChannel(text: string): Promise<boolean> {
    const jid = this.state.channelJid;
    if (!jid?.endsWith("@newsletter")) {
      log("[WhatsApp] ✗ No valid @newsletter JID configured");
      return false;
    }
    if (!this.sock || this.state.status !== "connected") {
      log(`[WhatsApp] ✗ Not connected (${this.state.status})`);
      return false;
    }
    // Ensure warmup before first send
    if (!this.adminContextReady) {
      await this._warmupNewsletter(jid);
    }
    try {
      log(`[WhatsApp] Sending to ${jid}…`);
      const result = await this.sock.sendMessage(jid, { text });
      if (result?.key?.id) {
        log(`[WhatsApp] ✓ Message sent — id: ${result.key.id}`);
        return true;
      } else {
        log(`[WhatsApp] ⚠ sendMessage returned no key — result: ${JSON.stringify(result)}`);
        return false;
      }
    } catch (err: any) {
      log(`[WhatsApp] ✗ Send failed: ${err?.message || err}`);
      return false;
    }
  }

  /**
   * Send image + caption. Falls back to text if image fails.
   */
  async sendImageToChannel(imageUrl: string, caption: string): Promise<boolean> {
    const jid = this.state.channelJid;
    if (!jid?.endsWith("@newsletter")) { log("[WhatsApp] ✗ No valid @newsletter JID"); return false; }
    if (!this.sock || this.state.status !== "connected") { log("[WhatsApp] ✗ Not connected"); return false; }
    if (!imageUrl?.startsWith("http")) return this.sendToChannel(caption);
    if (!this.adminContextReady) await this._warmupNewsletter(jid);
    try {
      log(`[WhatsApp] Sending image to ${jid}…`);
      await this.sock.sendMessage(jid, { image: { url: imageUrl }, caption } as any);
      log(`[WhatsApp] ✓ Image sent to ${jid}`);
      return true;
    } catch (err: any) {
      log(`[WhatsApp] ✗ Image failed (${err?.message || err}) — falling back to text`);
      return this.sendToChannel(caption);
    }
  }

  /** Resolve invite link / raw code / JID */
  async resolveChannelInput(input: string): Promise<{ jid: string; name: string; subscribers: number } | null> {
    if (!this.sock || this.state.status !== "connected") return null;
    const t = input.trim();
    const urlMatch = t.match(/whatsapp\.com\/channel\/([A-Za-z0-9_-]+)/i);
    const code = urlMatch ? urlMatch[1] : (!t.includes("@") ? t : null);
    let jid: string | null = t.endsWith("@newsletter") ? t : null;

    if (!jid && code) {
      try {
        const info = await (this.sock as any).newsletterMetadata("invite", code);
        if (info?.id) {
          jid = info.id.endsWith("@newsletter") ? info.id : `${info.id}@newsletter`;
          return { jid, name: info?.name || jid, subscribers: info?.subscribers || 0 };
        }
      } catch { jid = `${code}@newsletter`; }
    }
    if (!jid) return null;
    try {
      const info = await (this.sock as any).newsletterMetadata("jid", jid);
      return { jid, name: info?.name || jid, subscribers: info?.subscribers || 0 };
    } catch {
      return { jid, name: jid, subscribers: 0 };
    }
  }

  async fetchChannelInfo(jid: string): Promise<{ name: string; subscribers: number; description: string } | null> {
    if (!this.sock || this.state.status !== "connected") return null;
    if (!jid.endsWith("@newsletter")) return null;
    try {
      const info = await (this.sock as any).newsletterMetadata("jid", jid);
      return { name: info?.name || jid, subscribers: info?.subscribers || 0, description: info?.description || "" };
    } catch { return { name: jid, subscribers: 0, description: "" }; }
  }

  isConnected(): boolean { return this.state.status === "connected"; }
}

export const waManager = new WhatsAppManager();
