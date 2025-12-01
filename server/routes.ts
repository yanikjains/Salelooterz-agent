import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { scrapeAmazonProduct } from "./scraper";
import { 
  generateWhatsAppMessage, 
  generateTelegramMessage,
  generateWhatsAppMessageFromDiscovered,
  generateTelegramMessageFromDiscovered
} from "./messageGenerator";
import { appendToSheet, getOrCreateSheet } from "./sheets";
import { discoverProducts, discoverFromAllCategories, discoverHotDeals, categories } from "./productDiscovery";
import { z } from "zod";

const automationRequestSchema = z.object({
  url: z.string().url(),
  affiliateTag: z.string().min(1),
  spreadsheetId: z.string().optional(),
});

const discoveryRequestSchema = z.object({
  category: z.string(),
  affiliateTag: z.string().min(1),
  limit: z.number().min(1).optional().default(5),
});

const authSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

const sheetsSchema = z.object({
  userId: z.string(),
});

const googleAuthSchema = z.object({
  email: z.string().email(),
  name: z.string(),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { username, password } = authSchema.parse(req.body);
      const existingUser = await storage.getUserByUsername(username);
      
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      const user = await storage.createUser({ username, password });
      res.json({ userId: user.id, username: user.username });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Signup failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = authSchema.parse(req.body);
      const user = await storage.getUserByUsername(username);
      
      if (!user || user.password !== password) {
        return res.status(400).json({ error: "Invalid credentials" });
      }

      res.json({ userId: user.id, username: user.username, email: user.email });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Login failed" });
    }
  });

  app.post("/api/auth/google", async (req, res) => {
    try {
      const { email, name } = googleAuthSchema.parse(req.body);
      
      let user = await storage.getUserByUsername(email);
      
      if (!user) {
        user = await storage.createOrUpdateUserWithEmail(email, email);
      } else {
        user = await storage.createOrUpdateUserWithEmail(user.username, email);
      }

      // Add email to marketing sheet
      try {
        const marketingSheetId = "1" + Date.now().toString().slice(0, 10);
        await appendToMarketingSheet(email, name);
      } catch (err) {
        console.error('Failed to add to marketing sheet:', err);
      }

      res.json({ userId: user.id, username: user.username || email, email: user.email });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Google login failed" });
    }
  });

  app.post("/api/sheets/connect", async (req, res) => {
    try {
      const { userId } = sheetsSchema.parse(req.body);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const spreadsheetId = await getOrCreateSheet(`Affiliate Bot - ${user.username}`);
      await storage.updateUserSpreadsheet(userId, spreadsheetId);
      
      res.json({ spreadsheetId, success: true });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Connection failed" });
    }
  });

  app.get("/api/categories", async (req, res) => {
    res.json({ categories });
  });

  app.post("/api/discover", async (req, res) => {
    try {
      const { category, affiliateTag, limit } = discoveryRequestSchema.parse(req.body);
      const userId = req.headers["x-user-id"] as string;
      
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const isPaid = user.isPaid === "true";
      const OWNER_USERNAMES = ["Yanik Jain", "yanik"];
      const isOwner = OWNER_USERNAMES.some(name => user.username.toLowerCase().includes(name.toLowerCase()));
      
      let dailyCount = 0;
      let dailyLimit = 50;
      
      if (!isOwner && !isPaid) {
        return res.status(403).json({
          success: false,
          error: "Payment Required",
          requiresPayment: true,
          price: 3999,
          message: "₹3,999 lifetime access required to use this bot"
        });
      }

      if (!isOwner && isPaid) {
        dailyCount = await storage.getDailyProductCount(userId);
        dailyLimit = 50;
        
        if (dailyCount >= dailyLimit) {
          return res.status(429).json({
            success: false,
            error: `Daily limit of ${dailyLimit} products reached. Come back tomorrow!`,
            dailyCount,
            remaining: 0
          });
        }

        if (limit && limit > (dailyLimit - dailyCount)) {
          return res.status(429).json({
            success: false,
            error: `You can only scrape ${dailyLimit - dailyCount} more products today (limit: ${dailyLimit} per day).`,
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
        return res.status(404).json({
          success: false,
          error: "No products found for this category. Amazon may be rate limiting requests.",
        });
      }

      const spreadsheetId = user.spreadsheetId || (await getOrCreateSheet(`Affiliate Bot - ${user.username}`));
      if (!user.spreadsheetId) {
        await storage.updateUserSpreadsheet(userId, spreadsheetId);
      }
      
      const results = [];
      
      for (const product of products) {
        const whatsappMessage = generateWhatsAppMessageFromDiscovered(product, affiliateTag);
        const telegramMessage = generateTelegramMessageFromDiscovered(product, affiliateTag);
        
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
        
        const automation = await storage.createAutomation({
          userId,
          productUrl: product.url,
          productTitle: product.title,
          price: product.price,
          rating: `${product.rating}/5`,
          whatsappMessage,
          telegramMessage,
          affiliateTag,
          spreadsheetId,
        });
        
        results.push({
          product,
          whatsappMessage,
          telegramMessage,
          automationId: automation.id,
        });
      }
      
      const updatedDailyCount = !isOwner && isPaid ? await storage.getDailyProductCount(userId) : 0;
      
      res.json({
        success: true,
        count: results.length,
        spreadsheetId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
        results,
        dailyCount: updatedDailyCount,
        remaining: !isOwner && isPaid ? dailyLimit - updatedDailyCount : -1,
      });
      
    } catch (error) {
      console.error('Discovery error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  app.post("/api/automate", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const { url, affiliateTag, spreadsheetId } = automationRequestSchema.parse(req.body);
      
      const product = await scrapeAmazonProduct(url);
      
      const whatsappMessage = generateWhatsAppMessage(product, affiliateTag);
      const telegramMessage = generateTelegramMessage(product, affiliateTag);
      
      let finalSpreadsheetId = spreadsheetId || user.spreadsheetId;
      if (!finalSpreadsheetId) {
        finalSpreadsheetId = await getOrCreateSheet(`Affiliate Bot - ${user.username}`);
        await storage.updateUserSpreadsheet(userId, finalSpreadsheetId);
      }
      
      await appendToSheet(finalSpreadsheetId, {
        timestamp: new Date().toISOString(),
        productTitle: product.title,
        price: product.price,
        rating: `${product.rating}/5 (${product.reviews} reviews)`,
        productUrl: url,
        whatsappMessage,
        telegramMessage,
        affiliateTag,
      });
      
      const automation = await storage.createAutomation({
        userId,
        productUrl: url,
        productTitle: product.title,
        price: product.price,
        rating: `${product.rating}/5`,
        whatsappMessage,
        telegramMessage,
        affiliateTag,
        spreadsheetId: finalSpreadsheetId,
      });
      
      res.json({
        success: true,
        automation,
        spreadsheetId: finalSpreadsheetId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${finalSpreadsheetId}`,
      });
      
    } catch (error) {
      console.error('Automation error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  app.get("/api/automations", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const automations = await storage.getAutomations(userId, 50);
      const user = await storage.getUser(userId);
      const isPaid = user?.isPaid === "true";
      const OWNER_USERNAMES = ["Yanik Jain", "yanik"];
      const isOwner = user && OWNER_USERNAMES.some(name => user.username.toLowerCase().includes(name.toLowerCase()));
      
      const dailyCount = !isOwner && isPaid ? await storage.getDailyProductCount(userId) : 0;
      const DAILY_LIMIT = 50;
      
      res.json({ 
        automations,
        dailyCount,
        remaining: !isOwner && isPaid ? DAILY_LIMIT - dailyCount : -1,
        dailyLimit: DAILY_LIMIT,
        isPaid,
        isOwner: !!isOwner
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  app.get("/api/user/status", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const isPaid = user.isPaid === "true";
      const OWNER_USERNAMES = ["Yanik Jain", "yanik"];
      const isOwner = OWNER_USERNAMES.some(name => user.username.toLowerCase().includes(name.toLowerCase()));
      
      const dailyCount = await storage.getDailyProductCount(userId);
      const DAILY_LIMIT = 50;
      
      res.json({
        isPaid,
        isOwner,
        dailyCount,
        remaining: isOwner || isPaid ? DAILY_LIMIT - dailyCount : 0,
        dailyLimit: DAILY_LIMIT,
        price: 3999
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  app.post("/api/payment/complete", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = await storage.markUserAsPaid(userId);
      res.json({ success: true, user });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return httpServer;
}
