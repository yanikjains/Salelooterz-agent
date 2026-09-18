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
import { scheduler, ADMIN_USER_ID, type SchedulerConfig } from "./scheduler";
import {
  saveWhatsAppBatchFiles,
  pushWhatsAppBatchToAppsScript,
  whatsappBatchesToCsv,
  readWhatsAppExportState,
  type WhatsAppBatch,
} from "./whatsappExport";

const schedulerConfigSchema = z.object({
  affiliateTag: z.string().min(1),
  telegramBotToken: z.string().optional(),
  telegramChannelId: z.string().optional(),
  spreadsheetId: z.string().optional(),
  googleAppsScriptUrl: z.string().url().optional(),
  googleAppsScriptSecret: z.string().optional(),
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
        telegramBotToken: savedConfig?.telegramBotToken || user?.telegramBotToken || "",
        telegramChannelId: savedConfig?.telegramChannelId || user?.telegramChannelId || "",
        spreadsheetId: savedConfig?.spreadsheetId || user?.spreadsheetId || "",
        googleAppsScriptUrl: savedConfig?.googleAppsScriptUrl || "",
        googleAppsScriptSecret: savedConfig?.googleAppsScriptSecret || "",
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
      res.status(202).json({ success: true, message: "Telegram batch started — only a complete 150-message batch will be marked successful." });
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
      const result = await scheduler.runWhatsAppBatch();
      if (!result.saved) {
        return res.status(409).json({
          success: false,
          count: result.generated,
          error: result.reason || "A complete 30-message batch was not created.",
        });
      }
      res.json({ success: true, count: result.generated });
    } catch (err) {
      res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Unknown error" });
    }
  });

  // ── WHATSAPP TEST — generate & return N messages instantly ───────────────────
  app.get("/api/admin/whatsapp-test", async (req, res) => {
    try {
      const limit = Math.min(parseInt((req.query.limit as string) || "2", 10), 10);
      const config = scheduler.getStatus().config;
      const affiliateTag = config?.affiliateTag || "salelooterz0a-21";

      const messages: { category: string; title: string; price: string; message: string }[] = [];
      const cats = Object.keys(categorySearchTerms);

      for (const cat of cats) {
        if (messages.length >= limit) break;
        try {
          const products = await discoverPremiumProducts(cat, 5);
          for (const p of products) {
            if (messages.length >= limit) break;
            const msg = generatePersonalizedWhatsAppMessage(p, affiliateTag, cat);
            messages.push({ category: cat, title: p.title, price: p.price, message: msg });
          }
        } catch { continue; }
      }

      res.json({ success: true, count: messages.length, messages });
    } catch (err) {
      res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Unknown error" });
    }
  });

  // ── WHATSAPP CSV EXPORT (no Google account or connector required) ─────────────
  app.get("/api/admin/whatsapp-messages/download.csv", (_req, res) => {
    const dataDir = path.join(process.cwd(), "data");
    const filePath = path.join(dataDir, "whatsapp-messages.csv");
    const jsonPath = path.join(dataDir, "whatsapp-messages.json");
    if (fs.existsSync(jsonPath)) {
      try {
        const batches: WhatsAppBatch[] = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
        const latestBatch = batches[batches.length - 1];
        const exportState = readWhatsAppExportState();
        if (exportState?.status === "generating") {
          return res.status(409).json({
            error: "A fresh WhatsApp batch is still being generated. Download will be enabled after it finishes.",
          });
        }
        if (exportState?.status === "failed") {
          return res.status(409).json({
            error: exportState.reason || "The latest WhatsApp generation did not produce a fresh batch.",
            count: exportState.generated || 0,
          });
        }
        if (!latestBatch || latestBatch.rows.length !== 30) {
          return res.status(409).json({
            error: "The latest daily batch is incomplete. The CSV will be available after 30 fresh messages are scraped.",
            count: latestBatch?.rows.length || 0,
          });
        }
        if (!exportState || exportState.status !== "saved") {
          return res.status(409).json({
            error: "No fresh WhatsApp batch has been generated since this export was updated. Generate a new batch first.",
          });
        }
        // The download is always the newest complete batch created by the current export flow.
        fs.writeFileSync(filePath, whatsappBatchesToCsv([latestBatch]), "utf8");
      } catch {
        return res.status(500).json({ error: "Saved messages could not be converted to CSV." });
      }
    }
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "No messages saved yet. Generate a batch first." });
    }
    res.download(filePath, `whatsapp-messages-${new Date().toISOString().slice(0, 10)}.csv`);
  });

  app.get("/api/admin/whatsapp-messages/export-status", (_req, res) => {
    const state = readWhatsAppExportState();
    const jsonPath = path.join(process.cwd(), "data", "whatsapp-messages.json");
    let rows = 0;
    let date: string | null = null;
    try {
      if (fs.existsSync(jsonPath)) {
        const batches: WhatsAppBatch[] = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
        const latest = batches[batches.length - 1];
        rows = latest?.rows.length || 0;
        date = latest?.date || null;
      }
    } catch {}
    res.json({
      available: state?.status === "saved" && rows === 30,
      status: state?.status || "none",
      rows,
      date,
      reason: state?.reason || null,
    });
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
