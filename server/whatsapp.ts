/**
 * WHATSAPP SEND-ONLY MANAGER
 *
 * This module connects to WhatsApp using the WhatsApp Web protocol (Baileys).
 *
 * WHAT THIS CODE DOES:
 *   ✅ Sends messages to ONE specific channel/group JID you configure
 *   ✅ Maintains the connection (reconnects if dropped)
 *   ✅ Generates QR code for initial login
 *
 * WHAT THIS CODE DELIBERATELY DOES NOT DO:
 *   ❌ No listener for incoming messages (messages.upsert is never registered)
 *   ❌ No reading of any chats, contacts, or call logs
 *   ❌ No syncing of chat history (syncFullHistory: false, getMessage returns undefined)
 *   ❌ No marking messages as read
 *   ❌ No presence updates (markOnlineOnConnect: false)
 *   ❌ No storing or logging of any received data
 *   ❌ Cannot send to any JID other than the one channel you configure
 *
 * HONEST LIMITATION:
 *   The WhatsApp Web protocol does not have a "channel-only" permission system.
 *   At the protocol level the session is technically a full WhatsApp Web session.
 *   However, this code only ever calls sock.sendMessage() — nothing else.
 *   You can audit every line below to verify this.
 *
 * RECOMMENDATION:
 *   For maximum safety, use a dedicated secondary phone number as the bot account.
 *   That way your personal chats are never involved at all.
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
          keys: makeCacheableSignalKeyStore(state.keys, undefined as any),
        },
        printQRInTerminal: false,
        browser: ["SaleLooterz Bot", "Chrome", "120.0.0"],
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 30000,
        keepAliveIntervalMs: 10000,

        // ── PRIVACY / SEND-ONLY SETTINGS ───────────────────────────────────
        syncFullHistory: false,           // Do NOT download chat history
        markOnlineOnConnect: false,       // Do NOT show as online
        generateHighQualityLinkPreview: false, // No link previews needed

        // Returning undefined here means we deliberately refuse to fetch
        // any message content — this prevents history sync entirely.
        getMessage: async () => undefined,
      });

      // ── ONLY TWO EVENT LISTENERS ─────────────────────────────────────────
      // 1. Save credentials (required to stay logged in across restarts)
      this.sock.ev.on("creds.update", saveCreds);

      // 2. Connection state updates (QR, open, close)
      // NO messages.upsert, NO contacts.update, NO chats.update, NOTHING else.
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
          log(`[WhatsApp] Connected in send-only mode. Number: +${this.state.phoneNumber || "unknown"}`);
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
          log(`[WhatsApp] Disconnected. Reason: ${reason}`);

          if (this.shouldReconnect && !loggedOut) {
            const delay = reason === DisconnectReason.restartRequired ? 1000 : 8000;
            this.reconnectTimer = setTimeout(() => this.connect(), delay);
          }
        }
      });

      // ── INTENTIONALLY NO OTHER LISTENERS ─────────────────────────────────
      // If you inspect this file, you will see there is no:
      //   sock.ev.on("messages.upsert", ...)     ← would read incoming messages
      //   sock.ev.on("contacts.update", ...)     ← would read contacts
      //   sock.ev.on("chats.update", ...)        ← would read chat list
      //   sock.ev.on("presence.update", ...)     ← would read online status
      // None of these are registered. This is intentional.

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
    this.state = { status: "disconnected", qrBase64: null, phoneNumber: null, channelJid: null, error: null };
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
   * This is the entire extent of what SaleLooterz does with WhatsApp.
   */
  async sendToChannel(text: string): Promise<boolean> {
    const jid = this.state.channelJid;
    if (!jid) {
      log("[WhatsApp] No channel JID set — cannot send");
      return false;
    }
    if (!this.sock || this.state.status !== "connected") {
      log("[WhatsApp] Not connected — cannot send");
      return false;
    }
    try {
      await this.sock.sendMessage(jid, { text });
      log(`[WhatsApp] Sent to channel ${jid}`);
      return true;
    } catch (err) {
      log(`[WhatsApp] Send failed: ${err}`);
      return false;
    }
  }

  isConnected(): boolean {
    return this.state.status === "connected";
  }
}

export const waManager = new WhatsAppManager();
