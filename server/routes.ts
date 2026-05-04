import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { discoverProducts, discoverFromAllCategories, discoverHotDeals, categories } from "./productDiscovery";
import { generateWhatsAppMessageFromDiscovered, generateTelegramMessageFromDiscovered } from "./messageGenerator";
import { appendToSheet } from "./sheets";
import { z } from "zod";
import { registerChatRoutes } from "./replit_integrations/chat";
import { scheduler, ADMIN_USER_ID, type SchedulerConfig } from "./scheduler";
import { waManager } from "./whatsapp";

const schedulerConfigSchema = z.object({
  affiliateTag: z.string().min(1),
  telegramBotToken: z.string().optional(),
  telegramChannelId: z.string().optional(),
  whatsappChannelJid: z.string().optional(),
  spreadsheetId: z.string().optional(),
});

const manualDiscoverSchema = z.object({
  category: z.string(),
  affiliateTag: z.string().min(1),
  limit: z.number().min(1).max(50).optional().default(10),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  registerChatRoutes(app);

  // ── WHATSAPP ROUTES ──────────────────────────────────────────

  // Get WhatsApp connection status + QR
  app.get("/api/whatsapp/status", (req, res) => {
    const state = waManager.getState();
    res.json({
      status: state.status,
      phoneNumber: state.phoneNumber,
      channelJid: state.channelJid,
      error: state.error,
      hasQR: !!state.qrBase64,
      qrBase64: state.qrBase64,
    });
  });

  // Connect (start QR generation)
  app.post("/api/whatsapp/connect", async (req, res) => {
    try {
      await waManager.connect();
      res.json({ success: true, message: "Connecting — check /api/whatsapp/status for QR code" });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Disconnect and clear session
  app.post("/api/whatsapp/disconnect", async (req, res) => {
    try {
      await waManager.disconnect();
      res.json({ success: true, message: "Disconnected and session cleared" });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Set the channel JID to send to
  app.post("/api/whatsapp/channel", (req, res) => {
    const { jid } = req.body;
    if (!jid || typeof jid !== "string") {
      return res.status(400).json({ error: "jid is required" });
    }
    waManager.setChannelJid(jid.trim());
    res.json({ success: true, channelJid: jid.trim() });
  });

  // Send a test message to the channel
  app.post("/api/whatsapp/test", async (req, res) => {
    const { message } = req.body;
    const text = message || "🔥 *SaleLooterz AI* — Test message! Your WhatsApp auto-sender is working perfectly. 🎉";
    const ok = await waManager.sendToChannel(text);
    if (ok) {
      res.json({ success: true, message: "Test message sent!" });
    } else {
      res.status(400).json({ success: false, error: "Failed to send — make sure WhatsApp is connected and channel JID is set" });
    }
  });

  // SSE stream for real-time QR/status updates
  app.get("/api/whatsapp/stream", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const send = (data: object) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const unsubStatus = waManager.onStatus((state) => {
      send({ type: "status", ...state, qrBase64: undefined });
    });

    const unsubQR = waManager.onQR((qrBase64) => {
      send({ type: "qr", qrBase64 });
    });

    // Send current state immediately
    const current = waManager.getState();
    send({ type: "status", status: current.status, phoneNumber: current.phoneNumber, error: current.error });
    if (current.qrBase64) send({ type: "qr", qrBase64: current.qrBase64 });

    req.on("close", () => {
      unsubStatus();
      unsubQR();
    });
  });

  // ── ADMIN SCHEDULER ROUTES ───────────────────────────────────

  app.get("/api/admin/status", async (req, res) => {
    try {
      const status = scheduler.getStatus();
      const recentAutomations = await storage.getAutomations(ADMIN_USER_ID, 20);
      const waState = waManager.getState();
      res.json({
        ...status,
        recentAutomations,
        whatsapp: {
          status: waState.status,
          phoneNumber: waState.phoneNumber,
          channelJid: waState.channelJid,
          error: waState.error,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get status" });
    }
  });

  app.post("/api/admin/start", async (req, res) => {
    try {
      const config = schedulerConfigSchema.parse(req.body);
      const existing = await storage.getUser(ADMIN_USER_ID);
      if (!existing) await storage.upsertUserWithId(ADMIN_USER_ID, "admin", null);
      await storage.updateUser(ADMIN_USER_ID, {
        telegramBotToken: config.telegramBotToken || null,
        telegramChannelId: config.telegramChannelId || null,
        spreadsheetId: config.spreadsheetId || null,
      });
      if (config.whatsappChannelJid) waManager.setChannelJid(config.whatsappChannelJid);
      await scheduler.start(config);
      res.json({ success: true, message: "Automation started", status: scheduler.getStatus() });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to start" });
    }
  });

  app.post("/api/admin/stop", (req, res) => {
    scheduler.stop();
    res.json({ success: true, message: "Automation stopped", status: scheduler.getStatus() });
  });

  app.post("/api/admin/config", async (req, res) => {
    try {
      const config = schedulerConfigSchema.parse(req.body);
      await storage.updateUser(ADMIN_USER_ID, {
        telegramBotToken: config.telegramBotToken || null,
        telegramChannelId: config.telegramChannelId || null,
        spreadsheetId: config.spreadsheetId || null,
      });
      if (config.whatsappChannelJid) waManager.setChannelJid(config.whatsappChannelJid);
      scheduler.updateConfig(config);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to update config" });
    }
  });

  app.get("/api/admin/config", async (req, res) => {
    try {
      const user = await storage.getUser(ADMIN_USER_ID);
      const waState = waManager.getState();
      res.json({
        telegramBotToken: user?.telegramBotToken || "",
        telegramChannelId: user?.telegramChannelId || "",
        spreadsheetId: user?.spreadsheetId || "",
        whatsappChannelJid: waState.channelJid || "",
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to load config" });
    }
  });

  app.post("/api/admin/run-now", async (req, res) => {
    try {
      const status = scheduler.getStatus();
      if (!status.config) return res.status(400).json({ error: "Configure and start automation first" });
      res.json({ success: true, message: "Batch triggered — check live feed in a few seconds" });
      scheduler.stop();
      await scheduler.start(status.config);
    } catch (error) {
      res.status(500).json({ error: "Failed to run batch" });
    }
  });

  // ── MISC ROUTES ──────────────────────────────────────────────

  app.get("/api/categories", (req, res) => {
    res.json({ categories });
  });

  app.get("/api/automations", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string || "50");
      const automations = await storage.getAutomations(ADMIN_USER_ID, limit);
      res.json({ automations });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch automations" });
    }
  });

  app.post("/api/discover", async (req, res) => {
    try {
      const { category, affiliateTag, limit } = manualDiscoverSchema.parse(req.body);
      let products;
      if (category === "all") products = await discoverFromAllCategories(limit);
      else if (category === "hot") products = await discoverHotDeals(limit);
      else products = await discoverProducts(category, limit);

      if (!products || products.length === 0)
        return res.status(404).json({ success: false, error: "No products found" });

      const user = await storage.getUser(ADMIN_USER_ID);
      const spreadsheetId = user?.spreadsheetId || null;
      const results = [];

      for (const product of products) {
        const whatsappMessage = generateWhatsAppMessageFromDiscovered(product, affiliateTag);
        const telegramMessage = generateTelegramMessageFromDiscovered(product, affiliateTag);

        if (spreadsheetId) {
          try {
            await appendToSheet(spreadsheetId, {
              timestamp: new Date().toISOString(),
              productTitle: product.title,
              price: product.price,
              rating: `${product.rating}/5`,
              productUrl: `${product.url}?tag=${affiliateTag}`,
              whatsappMessage,
              telegramMessage,
              affiliateTag,
            });
          } catch {}
        }

        await storage.createAutomation({
          userId: ADMIN_USER_ID,
          productUrl: product.url,
          productTitle: product.title,
          price: product.price,
          rating: `${product.rating}/5`,
          whatsappMessage,
          telegramMessage,
          affiliateTag,
          spreadsheetId: spreadsheetId || null,
        });

        results.push({ product, whatsappMessage, telegramMessage });
      }

      res.json({ success: true, count: results.length, results });
    } catch (error) {
      res.status(400).json({ success: false, error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  return httpServer;
}
