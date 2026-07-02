import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { discoverProducts, discoverFromAllCategories, discoverHotDeals, categories, categorySearchTerms } from "./productDiscovery";
import { wasRecentlyPosted, wasTitlePosted, markAsPosted, markTitleAsPosted } from "./asinMemory";
import { generateWhatsAppMessageFromDiscovered, generateTelegramMessageFromDiscovered, generatePersonalizedWhatsAppMessage } from "./messageGenerator";
import { appendToSheet } from "./sheets";
import { z } from "zod";
import { registerChatRoutes } from "./replit_integrations/chat";
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
  registerChatRoutes(app);

  // ── ADMIN PIN AUTH ───────────────────────────────────────────
  app.post("/api/admin/verify-pin", (req, res) => {
    const { pin } = req.body;
    const correctPin = process.env.ADMIN_PIN || "2412";
    if (!pin || typeof pin !== "string") {
      return res.status(400).json({ success: false, error: "PIN required" });
    }
    if (pin.trim() === correctPin) {
      res.json({ success: true });
    } else {
      res.status(401).json({ success: false, error: "Incorrect PIN" });
    }
  });

  // ── TELEGRAM TEST ────────────────────────────────────────────
  app.post("/api/telegram/test", async (req, res) => {
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
        telegramBotToken: savedConfig?.telegramBotToken || user?.telegramBotToken || "",
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

  // ── WHATSAPP DAILY BATCH ─────────────────────────────────────────────────────
  // Picks 4 products from each category (28 total), deduplicates, stores WA messages only
  app.post("/api/admin/whatsapp-batch", async (_req, res) => {
    try {
      const config = scheduler.getStatus().config;
      if (!config?.affiliateTag) {
        return res.status(400).json({ success: false, error: "Set your affiliate tag in Settings first" });
      }
      const { affiliateTag } = config;
      const user = await storage.getUser(ADMIN_USER_ID);
      const spreadsheetId = user?.spreadsheetId || null;

      const allCategoryIds = Object.keys(categorySearchTerms);
      const PER_CATEGORY = 4;
      const generated: { productTitle: string; category: string }[] = [];

      for (const cat of allCategoryIds) {
        try {
          const raw = await discoverProducts(cat, PER_CATEGORY + 3);
          for (const product of raw) {
            if (generated.length >= 30) break;
            // Dedup
            if (product.asin) {
              if (await wasRecentlyPosted(product.asin)) continue;
            } else {
              if (await wasTitlePosted(product.title)) continue;
            }

            const whatsappMessage = generatePersonalizedWhatsAppMessage(product, affiliateTag, cat);

            await storage.createAutomation({
              userId: ADMIN_USER_ID,
              productUrl: product.url,
              productTitle: product.title,
              price: product.price,
              rating: `${product.rating}/5`,
              whatsappMessage,
              telegramMessage: "",
              affiliateTag,
              spreadsheetId: spreadsheetId || null,
            });

            if (product.asin) await markAsPosted(product.asin, product.title);
            else await markTitleAsPosted(product.title);

            generated.push({ productTitle: product.title, category: cat });
            if (generated.length >= 30) break;
          }
          await new Promise(r => setTimeout(r, 1200));
        } catch {
          continue;
        }
        if (generated.length >= 30) break;
      }

      res.json({ success: true, count: generated.length, categories: [...new Set(generated.map(g => g.category))] });
    } catch (err) {
      res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Unknown error" });
    }
  });

  return httpServer;
}
