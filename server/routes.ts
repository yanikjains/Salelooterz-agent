import type { Express, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { scrapeAmazonProduct } from "./scraper";
import { 
  generateWhatsAppMessage, 
  generateTelegramMessage,
  generateWhatsAppMessageFromDiscovered,
  generateTelegramMessageFromDiscovered
} from "./messageGenerator";
import { appendToSheet, appendToMarketingSheet } from "./sheets";
import { discoverProducts, discoverFromAllCategories, discoverHotDeals, categories } from "./productDiscovery";
import { sendTelegramMessage } from "./telegram";
import { z } from "zod";
import { registerChatRoutes } from "./replit_integrations/chat";

const automationRequestSchema = z.object({
  url: z.string().url(),
  affiliateTag: z.string().min(1),
});

const discoveryRequestSchema = z.object({
  category: z.string(),
  affiliateTag: z.string().min(1),
  limit: z.number().min(1).optional().default(5),
});

// Middleware: read x-user-id header and auto-create user if not found
const requireUserId: RequestHandler = async (req, res, next) => {
  const userId = req.headers["x-user-id"] as string;
  if (!userId || userId.length < 8) {
    return res.status(400).json({ error: "Missing user ID" });
  }
  let user = await storage.getUser(userId);
  if (!user) {
    user = await storage.upsertUserWithId(userId, `user_${userId.slice(0, 8)}`, null);
  }
  (req as any).userId = userId;
  next();
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  registerChatRoutes(app);

  app.get("/api/categories", async (req, res) => {
    res.json({ categories });
  });

  app.post("/api/discover", requireUserId, async (req, res) => {
    try {
      const { category, affiliateTag, limit } = discoveryRequestSchema.parse(req.body);
      const userId = (req as any).userId as string;

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      const OWNER_EMAILS = ["yaniikjain21@gmail.com", "salelooterz@gmail.com"];
      const isOwner = OWNER_EMAILS.includes(user.email?.toLowerCase() || "");

      const dailyLimit = 50;
      let dailyCount = 0;

      if (!isOwner) {
        dailyCount = await storage.getDailyProductCount(userId);
        if (dailyCount >= dailyLimit) {
          return res.status(429).json({
            success: false,
            error: `Daily limit of ${dailyLimit} products reached. Come back tomorrow!`,
            dailyCount,
            remaining: 0
          });
        }
        const effectiveLimit = limit ?? 5;
        if (effectiveLimit > (dailyLimit - dailyCount)) {
          return res.status(429).json({
            success: false,
            error: `You can only scrape ${dailyLimit - dailyCount} more products today.`,
            dailyCount,
            remaining: dailyLimit - dailyCount
          });
        }
      }

      let products;
      if (category === "all") {
        products = await discoverFromAllCategories(limit);
      } else if (category === "hot") {
        products = await discoverHotDeals(limit);
      } else {
        products = await discoverProducts(category, limit);
      }

      if (products.length === 0) {
        return res.status(404).json({ success: false, error: "No products found for this category." });
      }

      const spreadsheetId: string | null = user.spreadsheetId || null;
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

        const automation = await storage.createAutomation({
          userId,
          productUrl: product.url,
          productTitle: product.title,
          price: product.price,
          rating: `${product.rating}/5`,
          whatsappMessage,
          telegramMessage,
          affiliateTag,
          spreadsheetId: spreadsheetId || null,
        });

        results.push({ product, whatsappMessage, telegramMessage, automationId: automation.id });
      }

      const updatedDailyCount = !isOwner ? await storage.getDailyProductCount(userId) : 0;

      res.json({
        success: true,
        count: results.length,
        spreadsheetId,
        spreadsheetUrl: spreadsheetId ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}` : null,
        results,
        dailyCount: updatedDailyCount,
        remaining: !isOwner ? dailyLimit - updatedDailyCount : -1,
      });
    } catch (error) {
      console.error("Discovery error:", error);
      res.status(400).json({ success: false, error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/automate", requireUserId, async (req, res) => {
    try {
      const userId = (req as any).userId as string;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      const { url, affiliateTag } = automationRequestSchema.parse(req.body);
      const product = await scrapeAmazonProduct(url);
      const whatsappMessage = generateWhatsAppMessage(product, affiliateTag);
      const telegramMessage = generateTelegramMessage(product, affiliateTag);

      if (user.spreadsheetId) {
        await appendToSheet(user.spreadsheetId, {
          timestamp: new Date().toISOString(),
          productTitle: product.title,
          price: product.price,
          rating: `${product.rating}/5 (${product.reviews} reviews)`,
          productUrl: url,
          whatsappMessage,
          telegramMessage,
          affiliateTag,
        });
      }

      const automation = await storage.createAutomation({
        userId,
        productUrl: url,
        productTitle: product.title,
        price: product.price,
        rating: `${product.rating}/5`,
        whatsappMessage,
        telegramMessage,
        affiliateTag,
        spreadsheetId: user.spreadsheetId || null,
      });

      res.json({ success: true, automation });
    } catch (error) {
      res.status(400).json({ success: false, error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/automations", requireUserId, async (req, res) => {
    try {
      const userId = (req as any).userId as string;
      const automations = await storage.getAutomations(userId, 50);
      const user = await storage.getUser(userId);
      const OWNER_EMAILS = ["yaniikjain21@gmail.com", "salelooterz@gmail.com"];
      const isOwner = OWNER_EMAILS.includes(user?.email?.toLowerCase() || "");
      const dailyCount = !isOwner ? await storage.getDailyProductCount(userId) : 0;
      const DAILY_LIMIT = 50;

      res.json({
        automations,
        dailyCount,
        remaining: !isOwner ? DAILY_LIMIT - dailyCount : -1,
        dailyLimit: DAILY_LIMIT,
      });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/user/sheets-id", requireUserId, async (req, res) => {
    try {
      const userId = (req as any).userId as string;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json({ sheetsId: user.spreadsheetId || "" });
    } catch (error) {
      res.status(500).json({ error: "Unknown error" });
    }
  });

  app.post("/api/user/sheets-id", requireUserId, async (req, res) => {
    try {
      const userId = (req as any).userId as string;
      const { sheetsId } = req.body;
      if (!sheetsId) return res.status(400).json({ error: "Sheet ID is required" });
      await storage.updateUser(userId, { spreadsheetId: sheetsId });
      res.json({ success: true, sheetsId });
    } catch (error) {
      res.status(400).json({ error: "Failed to save sheet" });
    }
  });

  app.get("/api/user/telegram", requireUserId, async (req, res) => {
    try {
      const userId = (req as any).userId as string;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json({
        telegramBotToken: user.telegramBotToken || "",
        telegramChannelId: user.telegramChannelId || "",
        isConfigured: !!(user.telegramBotToken && user.telegramChannelId),
      });
    } catch (error) {
      res.status(500).json({ error: "Unknown error" });
    }
  });

  app.post("/api/user/telegram", requireUserId, async (req, res) => {
    try {
      const userId = (req as any).userId as string;
      const { telegramBotToken, telegramChannelId } = req.body;
      if (!telegramBotToken || !telegramChannelId) return res.status(400).json({ error: "Fields required" });
      await storage.updateUser(userId, { telegramBotToken, telegramChannelId });
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to save Telegram config" });
    }
  });

  app.get("/api/user/whatsapp", requireUserId, async (req, res) => {
    try {
      const userId = (req as any).userId as string;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json({ whatsappChannelUrl: user.whatsappChannelUrl || "" });
    } catch (error) {
      res.status(500).json({ error: "Unknown error" });
    }
  });

  app.post("/api/user/whatsapp", requireUserId, async (req, res) => {
    try {
      const userId = (req as any).userId as string;
      const { whatsappChannelUrl } = req.body;
      await storage.updateUser(userId, { whatsappChannelUrl });
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to save WhatsApp config" });
    }
  });

  app.get("/api/analytics/scrapes", requireUserId, async (req, res) => {
    try {
      const data = [
        { day: "Mon", count: 12 },
        { day: "Tue", count: 19 },
        { day: "Wed", count: 15 },
        { day: "Thu", count: 22 },
        { day: "Fri", count: 30 },
        { day: "Sat", count: 25 },
        { day: "Sun", count: 28 },
      ];
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  app.post("/api/send-bulk-messages", requireUserId, async (req, res) => {
    try {
      const { products, telegramBotToken, telegramChannelId } = req.body;
      let sentCount = 0;
      for (const item of products) {
        if (telegramBotToken && telegramChannelId) {
          try {
            await sendTelegramMessage(telegramBotToken, telegramChannelId, item.telegramMessage);
            sentCount++;
          } catch (e) { console.error("Telegram send failed", e); }
        }
      }
      res.json({ success: true, sentCount });
    } catch (error) {
      res.status(500).json({ success: false, error: "Bulk send failed" });
    }
  });

  return httpServer;
}
