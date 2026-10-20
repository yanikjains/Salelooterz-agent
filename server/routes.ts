import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { discoverProducts, discoverFromAllCategories, discoverHotDeals, categories } from "./productDiscovery";
import { wasRecentlyPosted, wasTitlePosted, markAsPosted, markTitleAsPosted, getMemoryStats, parseDiscountPct } from "./asinMemory";
import { generateTelegramMessageFromDiscovered, isVerifiedTelegramProduct } from "./messageGenerator";
import { appendToSheet } from "./sheets";
import { z } from "zod";
import { scheduler, ADMIN_USER_ID, type SchedulerConfig } from "./scheduler";

const schedulerConfigSchema = z.object({
  affiliateTag: z.string().min(1),
  telegramBotToken: z.string().optional(),
  telegramChannelId: z.string().optional(),
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
  // ── ADMIN PIN AUTH — Step 1 ──────────────────────────────────
  app.post("/api/admin/verify-pin", (req, res) => {
    const { pin } = req.body;
    if (!pin || typeof pin !== "string") {
      return res.status(400).json({ success: false, error: "PIN required" });
    }
    const firstPin = process.env.ADMIN_PIN;
    const secondPin = process.env.ADMIN_PIN2;
    if (!firstPin || !secondPin) {
      return res.status(503).json({ success: false, error: "Admin access is not configured" });
    }

    const session = req.session as typeof req.session & { adminPinStage?: number; adminVerified?: boolean };
    if (session.adminPinStage !== 1 && pin.trim() === firstPin) {
      session.adminPinStage = 1;
      return res.json({ success: true, nextStep: 2 });
    }
    if (session.adminPinStage === 1 && pin.trim() === secondPin) {
      session.adminVerified = true;
      delete session.adminPinStage;
      return res.json({ success: true, verified: true });
    }
    delete session.adminPinStage;
    session.adminVerified = false;
    res.status(401).json({ success: false, error: "Incorrect PIN" });
  });

  const requireAdmin = (req: any, res: any, next: any) => {
    if (req.session?.adminVerified === true) return next();
    res.status(401).json({ success: false, error: "Admin authentication required" });
  };

  // All admin APIs other than the PIN handshake require the server session.
  app.use("/api/admin", (req, res, next) => {
    if (req.path === "/verify-pin") return next();
    return requireAdmin(req, res, next);
  });

  // ── TELEGRAM TEST ────────────────────────────────────────────
  app.post("/api/telegram/test", requireAdmin, async (req, res) => {
    const { botToken, channelId } = req.body;
    if (!botToken || !channelId) {
      return res.status(400).json({ success: false, error: "botToken and channelId are required" });
    }
    const { sendTelegramMessage } = await import("./telegram");
    const ok = await sendTelegramMessage(
      botToken,
      channelId,
      "🔥 <b>SaleLooterz AI</b> — Test message! Your Telegram bot is connected and working perfectly. ✅"
    );
    if (ok) {
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false, error: "Failed to send. Check your bot token and channel ID. Make sure the bot is an admin of the channel." });
    }
  });

  // ── ADMIN SCHEDULER ROUTES ───────────────────────────────────

  app.get("/api/admin/status", async (req, res) => {
    try {
      const status = scheduler.getStatus();
      const recentAutomations = await storage.getAutomations(ADMIN_USER_ID, 20);
      res.json({ ...status, recentAutomations });
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
      scheduler.updateConfig(config);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to update config" });
    }
  });

  app.get("/api/admin/config", async (req, res) => {
    try {
      const schedulerStatus = scheduler.getStatus();
      const savedConfig = schedulerStatus.config;
      const user = await storage.getUser(ADMIN_USER_ID);
      res.json({
        telegramBotToken: user?.telegramBotToken || "",
        telegramChannelId: savedConfig?.telegramChannelId || user?.telegramChannelId || "",
        spreadsheetId: savedConfig?.spreadsheetId || user?.spreadsheetId || "",
        affiliateTag: savedConfig?.affiliateTag || "",
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to load config" });
    }
  });

  app.post("/api/admin/run-now", async (req, res) => {
    try {
      const status = scheduler.getStatus();
      if (!status.config || !status.isRunning) {
        return res.status(400).json({ error: "Configure Telegram and start automation first." });
      }
      if (status.batchState === "collecting" || status.batchState === "sending") {
        return res.status(409).json({ error: "A Telegram batch is already in progress.", status });
      }
      res.status(202).json({
        success: true,
        message: "Telegram batch started. Collection and posting progress will appear in Status.",
      });
      void scheduler.runTelegramBatchNow().catch(error => {
        console.error("[Scheduler] Manual Telegram batch failed:", error);
      });
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

      const verifiedProducts = (products || []).filter(isVerifiedTelegramProduct);
      if (verifiedProducts.length === 0)
        return res.status(404).json({ success: false, error: "No complete live listings with verified price, rating, and review details were found." });

      const user = await storage.getUser(ADMIN_USER_ID);
      const spreadsheetId = user?.spreadsheetId || null;
      const results = [];

      for (const product of verifiedProducts) {
        const telegramMessage = generateTelegramMessageFromDiscovered(product, affiliateTag);
        const productUrl = new URL(product.url);
        productUrl.searchParams.set("tag", affiliateTag);

        if (spreadsheetId) {
          try {
            await appendToSheet(spreadsheetId, {
              timestamp: new Date().toISOString(),
              productTitle: product.title,
              price: product.price,
              rating: `${product.rating}/5`,
              productUrl: productUrl.toString(),
              whatsappMessage: "",
              telegramMessage,
              affiliateTag,
            });
          } catch {}
        }

        await storage.createAutomation({
          userId: ADMIN_USER_ID,
          productUrl: productUrl.toString(),
          productTitle: product.title,
          price: product.price,
          rating: `${product.rating}/5`,
          whatsappMessage: "",
          telegramMessage,
          affiliateTag,
          spreadsheetId: spreadsheetId || null,
        });

        results.push({ product, telegramMessage });
      }

      res.json({ success: true, count: results.length, rejectedCount: products.length - results.length, results });
    } catch (error) {
      res.status(400).json({ success: false, error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // ── MEMORY STATS ─────────────────────────────────────────────────────────────
  app.get("/api/admin/memory-stats", async (_req, res) => {
    try {
      const stats = await getMemoryStats();
      res.json({ success: true, ...stats });
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  return httpServer;
}
