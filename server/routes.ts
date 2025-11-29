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

      res.json({ userId: user.id, username: user.username });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Login failed" });
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
      
      res.json({
        success: true,
        count: results.length,
        spreadsheetId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
        results,
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
      res.json({ automations });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return httpServer;
}
