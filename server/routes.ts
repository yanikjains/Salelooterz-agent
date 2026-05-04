import type { Express, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { discoverProducts, discoverFromAllCategories, discoverHotDeals, categories } from "./productDiscovery";
import { generateWhatsAppMessageFromDiscovered, generateTelegramMessageFromDiscovered } from "./messageGenerator";
import { appendToSheet } from "./sheets";
import { sendTelegramMessage } from "./telegram";
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

  // --- ADMIN SCHEDULER ROUTES ---

  // Get scheduler status + config
  app.get("/api/admin/status", async (req, res) => {
    try {
      const status = scheduler.getStatus();
      const recentAutomations = await storage.getAutomations(ADMIN_USER_ID, 20);
      res.json({ ...status, recentAutomations });
    } catch (error) {
      res.status(500).json({ error: "Failed to get status" });
    }
  });

  // Start scheduler
  app.post("/api/admin/start", async (req, res) => {
    try {
      const config = schedulerConfigSchema.parse(req.body);
      // Persist config in admin user record
      const existing = await storage.getUser(ADMIN_USER_ID);
      if (!existing) {
        await storage.upsertUserWithId(ADMIN_USER_ID, "admin", null);
      }
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

  // Stop scheduler
  app.post("/api/admin/stop", async (req, res) => {
    scheduler.stop();
    res.json({ success: true, message: "Automation stopped", status: scheduler.getStatus() });
  });

  // Update config without restarting
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

  // Get saved config from storage
  app.get("/api/admin/config", async (req, res) => {
    try {
      const user = await storage.getUser(ADMIN_USER_ID);
      res.json({
        telegramBotToken: user?.telegramBotToken || "",
        telegramChannelId: user?.telegramChannelId || "",
        spreadsheetId: user?.spreadsheetId || "",
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to load config" });
    }
  });

  // Manual trigger — run one batch right now
  app.post("/api/admin/run-now", async (req, res) => {
    try {
      const status = scheduler.getStatus();
      if (!status.config) {
        return res.status(400).json({ error: "Configure and start automation first" });
      }
      res.json({ success: true, message: "Batch triggered — check live feed in a few seconds" });
      // Fire-and-forget via the scheduler's internal mechanism
      // We restart with the same config which immediately runs a batch
      scheduler.stop();
      await scheduler.start(status.config);
    } catch (error) {
      res.status(500).json({ error: "Failed to run batch" });
    }
  });

  // Manual one-off discover (no rate limit for admin)
  app.post("/api/discover", async (req, res) => {
    try {
      const { category, affiliateTag, limit } = manualDiscoverSchema.parse(req.body);

      let products;
      if (category === "all") products = await discoverFromAllCategories(limit);
      else if (category === "hot") products = await discoverHotDeals(limit);
      else products = await discoverProducts(category, limit);

      if (!products || products.length === 0) {
        return res.status(404).json({ success: false, error: "No products found" });
      }

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
              rating: `${product.rating}/5 (${product.reviews} reviews)`,
              productUrl: `${product.url}?tag=${affiliateTag}`,
              whatsappMessage,
              telegramMessage,
              affiliateTag,
            });
          } catch (e) { console.error("Sheets export failed:", e); }
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

  // Get categories
  app.get("/api/categories", async (req, res) => {
    res.json({ categories });
  });

  // Get recent automations feed
  app.get("/api/automations", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string || "50");
      const automations = await storage.getAutomations(ADMIN_USER_ID, limit);
      res.json({ automations });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch automations" });
    }
  });

  return httpServer;
}
