import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import fs from "fs";
import path from "path";
import { discoverProducts, discoverPremiumProducts, discoverFromAllCategories, discoverHotDeals, categories, categorySearchTerms } from "./productDiscovery";
import { isPremiumDeal } from "./messageGenerator";
import { wasRecentlyPosted, wasTitlePosted, markAsPosted, markTitleAsPosted, getMemoryStats, parseDiscountPct } from "./asinMemory";
import { generateWhatsAppMessageFromDiscovered, generateTelegramMessageFromDiscovered, generatePersonalizedWhatsAppMessage } from "./messageGenerator";
import { appendToSheet, appendWhatsAppBatchToSheet, type WhatsAppRow } from "./sheets";
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

  // ── ADMIN PIN AUTH — Step 1 ──────────────────────────────────
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

  // ── ADMIN PIN AUTH — Step 2 ──────────────────────────────────
  app.post("/api/admin/verify-pin2", (req, res) => {
    const { pin } = req.body;
    const correctPin2 = process.env.ADMIN_PIN2 || "8101";
    if (!pin || typeof pin !== "string") {
      return res.status(400).json({ success: false, error: "PIN required" });
    }
    if (pin.trim() === correctPin2) {
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

  // ── MEMORY STATS ─────────────────────────────────────────────────────────────
  app.get("/api/admin/memory-stats", async (_req, res) => {
    try {
      const stats = await getMemoryStats();
      res.json({ success: true, ...stats });
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // ── WHATSAPP DAILY BATCH ─────────────────────────────────────────────────────
  app.post("/api/admin/whatsapp-batch", async (_req, res) => {
    try {
      const config = scheduler.getStatus().config;
      if (!config?.affiliateTag) {
        return res.status(400).json({ success: false, error: "Set your affiliate tag in Settings first" });
      }
      const { affiliateTag, spreadsheetId } = config;

      const allGroups = [
        ...Object.keys(categorySearchTerms),
        "boys", "girls", "men", "women",
      ];
      const PER_GROUP = Math.ceil(30 / allGroups.length);
      const sheetRows: WhatsAppRow[] = [];
      const generated: { productTitle: string; category: string }[] = [];

      for (const cat of allGroups) {
        let groupCount = 0;
        try {
          const raw = await discoverPremiumProducts(cat, PER_GROUP + 3);
          for (const product of raw) {
            if (generated.length >= 30 || groupCount >= PER_GROUP) break;
            if (!isPremiumDeal(product.price, product.discount || "")) continue;
            if (product.asin) {
              if (await wasRecentlyPosted(product.asin)) continue;
            } else {
              if (await wasTitlePosted(product.title)) continue;
            }

            const whatsappMessage = generatePersonalizedWhatsAppMessage(product, affiliateTag, cat);

            sheetRows.push({
              category: cat,
              productTitle: product.title,
              price: product.price,
              discount: (product as any).discount || "",
              productUrl: `${product.url}?tag=${affiliateTag}`,
              message: whatsappMessage,
            });

            const pInfo = { title: product.title, price: product.price, originalPrice: (product as any).originalPrice || "", discount: (product as any).discount || "", rating: product.rating, category: cat, url: product.url };
            if (product.asin) await markAsPosted(product.asin, pInfo);
            else await markTitleAsPosted(pInfo);

            generated.push({ productTitle: product.title, category: cat });
            groupCount++;
          }
          await new Promise(r => setTimeout(r, 1200));
        } catch {
          continue;
        }
        if (generated.length >= 30) break;
      }

      // Always save to local file first (works without Google auth)
      let fileSaved = false;
      if (sheetRows.length) {
        try {
          const dataDir = path.join(process.cwd(), "data");
          if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
          const filePath = path.join(dataDir, "whatsapp-messages.json");
          const existing = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf8")) : [];
          const dateIST = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
          existing.push({ date: dateIST, generatedAt: new Date().toISOString(), rows: sheetRows });
          // Keep last 30 days
          const trimmed = existing.slice(-30);
          fs.writeFileSync(filePath, JSON.stringify(trimmed, null, 2), "utf8");
          fileSaved = true;
        } catch (err) {
          console.error("[WhatsApp] Local file save error:", err);
        }
      }

      // Also try Google Sheets export
      let sheetExported = false;
      if (sheetRows.length && spreadsheetId) {
        try {
          await appendWhatsAppBatchToSheet(spreadsheetId, sheetRows);
          sheetExported = true;
        } catch (err) {
          console.error("[WhatsApp] Sheets export error:", err);
        }
      }

      res.json({ success: true, count: generated.length, categories: [...new Set(generated.map(g => g.category))], sheetExported, fileSaved });
    } catch (err) {
      res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Unknown error" });
    }
  });

  // ── WHATSAPP MESSAGES DOWNLOAD ────────────────────────────────────────────────
  app.get("/api/admin/whatsapp-messages/download", (_req, res) => {
    try {
      const filePath = path.join(process.cwd(), "data", "whatsapp-messages.json");
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "No messages saved yet. Click 'Generate Now' first." });
      }
      const batches: { date: string; generatedAt: string; rows: WhatsAppRow[] }[] = JSON.parse(fs.readFileSync(filePath, "utf8"));

      // Build a plain text file: one batch per day, messages separated by ---
      let text = "SaleLooterz WhatsApp Messages\n";
      text += "==============================\n\n";
      for (const batch of batches.slice().reverse()) {
        text += `═══ ${batch.date} ═══\n\n`;
        for (const row of batch.rows) {
          text += `[${row.category.toUpperCase()}] ${row.productTitle}\n`;
          text += `Price: ${row.price}  Discount: ${row.discount}\n`;
          text += `Link: ${row.productUrl}\n\n`;
          text += `${row.message}\n`;
          text += `---\n\n`;
        }
      }

      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="whatsapp-messages-${new Date().toISOString().slice(0,10)}.txt"`);
      res.send(text);
    } catch (err) {
      res.status(500).json({ error: "Failed to read messages" });
    }
  });

  // ── WHATSAPP MESSAGES JSON (for dashboard) ────────────────────────────────────
  app.get("/api/admin/whatsapp-messages", (_req, res) => {
    try {
      const filePath = path.join(process.cwd(), "data", "whatsapp-messages.json");
      if (!fs.existsSync(filePath)) return res.json({ batches: [] });
      const batches = JSON.parse(fs.readFileSync(filePath, "utf8"));
      // Return only last 3 batches to keep response small
      res.json({ batches: batches.slice(-3).reverse() });
    } catch {
      res.json({ batches: [] });
    }
  });

  return httpServer;
}
