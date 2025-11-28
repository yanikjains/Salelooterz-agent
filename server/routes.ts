import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { scrapeAmazonProduct } from "./scraper";
import { generateWhatsAppMessage, generateTelegramMessage } from "./messageGenerator";
import { appendToSheet, getOrCreateSheet } from "./sheets";
import { z } from "zod";

const automationRequestSchema = z.object({
  url: z.string().url(),
  affiliateTag: z.string().min(1),
  spreadsheetId: z.string().optional(),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.post("/api/automate", async (req, res) => {
    try {
      const { url, affiliateTag, spreadsheetId } = automationRequestSchema.parse(req.body);
      
      const product = await scrapeAmazonProduct(url);
      
      const whatsappMessage = generateWhatsAppMessage(product, affiliateTag);
      const telegramMessage = generateTelegramMessage(product, affiliateTag);
      
      let finalSpreadsheetId = spreadsheetId;
      if (!finalSpreadsheetId) {
        finalSpreadsheetId = await getOrCreateSheet('AmzViral Automation');
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
      const automations = await storage.getAutomations(50);
      res.json({ automations });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return httpServer;
}
