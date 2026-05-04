import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  type WASocket,
  type ConnectionState,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";
import qrcode from "qrcode";
import { log } from "./index";

const AUTH_DIR = "./whatsapp-auth";

type WAStatus = "disconnected" | "connecting" | "qr" | "connected";

interface WAState {
  status: WAStatus;
  qrBase64: string | null;
  phoneNumber: string | null;
  channelJid: string | null;
  error: string | null;
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

  getState(): WAState {
    return { ...this.state };
  }

  setChannelJid(jid: string) {
    this.state.channelJid = jid;
  }

  onQR(cb: (qr: string) => void) {
    this.qrListeners.push(cb);
    // Send current QR immediately if we have one
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

      log(`[WhatsApp] Connecting with Baileys v${version.join(".")}`);

      this.sock = makeWASocket({
        version,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, undefined as any),
        },
        printQRInTerminal: false,
        browser: ["SaleLooterz Bot", "Chrome", "120.0.0"],
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 30000,
        keepAliveIntervalMs: 10000,
        syncFullHistory: false,
        markOnlineOnConnect: false,
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
            log("[WhatsApp] QR code generated — waiting for scan");
          } catch (err) {
            log(`[WhatsApp] QR generation error: ${err}`);
          }
        }

        if (connection === "open") {
          this.state.status = "connected";
          this.state.qrBase64 = null;
          this.state.error = null;
          // Try to get phone number from creds
          const creds = state.creds as any;
          if (creds?.me?.id) {
            this.state.phoneNumber = creds.me.id.split(":")[0].split("@")[0];
          }
          this.emit();
          log(`[WhatsApp] Connected! Phone: ${this.state.phoneNumber || "unknown"}`);
        }

        if (connection === "close") {
          const reason = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const loggedOut = reason === DisconnectReason.loggedOut;

          log(`[WhatsApp] Disconnected. Reason: ${reason}${loggedOut ? " (logged out)" : ""}`);

          this.state.status = "disconnected";
          this.state.qrBase64 = null;
          if (loggedOut) {
            this.state.error = "Logged out — please reconnect and scan QR again";
            this.shouldReconnect = false;
            this.clearAuth();
          }
          this.emit();

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
      try {
        await this.sock.logout();
      } catch {}
      this.sock = null;
    }
    this.clearAuth();
    this.state = {
      status: "disconnected",
      qrBase64: null,
      phoneNumber: null,
      channelJid: null,
      error: null,
    };
    this.emit();
    log("[WhatsApp] Disconnected and session cleared");
  }

  private async clearAuth(): Promise<void> {
    try {
      const { rm } = await import("fs/promises");
      if (existsSync(AUTH_DIR)) {
        await rm(AUTH_DIR, { recursive: true, force: true });
        log("[WhatsApp] Auth files cleared");
      }
    } catch (err) {
      log(`[WhatsApp] Failed to clear auth: ${err}`);
    }
  }

  async sendMessage(jid: string, text: string): Promise<boolean> {
    if (!this.sock || this.state.status !== "connected") {
      log("[WhatsApp] Cannot send — not connected");
      return false;
    }

    try {
      await this.sock.sendMessage(jid, { text });
      return true;
    } catch (err) {
      log(`[WhatsApp] Send failed to ${jid}: ${err}`);
      return false;
    }
  }

  async sendToChannel(text: string): Promise<boolean> {
    const jid = this.state.channelJid;
    if (!jid) {
      log("[WhatsApp] No channel JID configured");
      return false;
    }
    return this.sendMessage(jid, text);
  }

  isConnected(): boolean {
    return this.state.status === "connected";
  }
}

export const waManager = new WhatsAppManager();
