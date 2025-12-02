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
import { appendToSheet, getOrCreateSheet, appendToMarketingSheet } from "./sheets";
import { discoverProducts, discoverFromAllCategories, discoverHotDeals, categories } from "./productDiscovery";
import { sendPasswordResetEmail } from "./email";
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

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

const signupSchemaServer = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(20).regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  email: z.string().email("Please enter a valid email"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[0-9]/, "Password must contain a number")
    .regex(/[^a-zA-Z0-9]/, "Password must contain a special character"),
});

const sheetsSchema = z.object({
  userId: z.string(),
});

const googleAuthSchema = z.object({
  email: z.string().email(),
  name: z.string(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  resetCode: z.string(),
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[0-9]/, "Password must contain a number")
    .regex(/[^a-zA-Z0-9]/, "Password must contain a special character"),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { username, email, password } = signupSchemaServer.parse(req.body);
      const existingUser = await storage.getUserByUsername(username);
      const existingEmail = await storage.getUserByEmail(email);
      
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }
      
      if (existingEmail) {
        return res.status(400).json({ error: "Email already registered" });
      }

      // Set 3-day trial for all users
      const trialEndsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      const user = await storage.createUser({ username, email, password });
      await storage.updateUser(user.id, { trialEndsAt });
      
      res.json({ userId: user.id, username: user.username, email: user.email, trialEndsAt });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Signup failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.status(400).json({ error: "Invalid credentials" });
      }

      if (!user.password) {
        return res.status(400).json({ error: "Account has no password. Please use registration." });
      }

      const bcrypt = await import("bcrypt");
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        return res.status(400).json({ error: "Invalid credentials" });
      }

      // Check if trial expired and user hasn't paid
      const OWNER_EMAILS = ["yaniikjain21@gmail.com", "salelooterz@gmail.com"];
      const isOwner = OWNER_EMAILS.includes(email.toLowerCase());
      
      if (!isOwner && user.trialEndsAt && new Date() > user.trialEndsAt && user.isPaid !== "true") {
        // Delete expired trial account
        await storage.deleteUser(user.id);
        return res.status(400).json({ 
          error: "Your 3-day free trial has expired. Please sign up again to get another 3 days free!",
          accountDeleted: true 
        });
      }

      res.json({ userId: user.id, username: user.username, email: user.email, trialEndsAt: user.trialEndsAt });
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
        await appendToMarketingSheet(email, name);
      } catch (err) {
        console.error('Failed to add to marketing sheet:', err);
      }

      res.json({ userId: user.id, username: user.username || email, email: user.email });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Google login failed" });
    }
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.status(400).json({ error: "Email not found" });
      }

      // Generate a simple reset code
      const resetCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      // Store reset token (expires in 1 hour)
      await storage.setResetToken(user.id, resetCode, 60 * 60 * 1000);

      // Send reset code via email
      const emailSent = await sendPasswordResetEmail(email, resetCode);

      if (emailSent) {
        res.json({ success: true, message: "Password reset code sent to your email. Check your inbox." });
      } else {
        // Email sending not configured, but token is stored
        res.json({ 
          success: true, 
          message: "Recovery code generated.",
          resetCode, // Return code only if email service not configured
          note: "Email service not configured. Please contact support or use the code shown." 
        });
      }
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to process forgot password" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { resetCode, newPassword } = resetPasswordSchema.parse(req.body);
      const user = await storage.resetPassword(resetCode, newPassword);
      
      res.json({ userId: user.id, username: user.username, message: "Password reset successfully" });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to reset password" });
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
      const OWNER_EMAIL = "yaniikjain21@gmail.com";
      const isOwner = OWNER_USERNAMES.some(name => user.username.toLowerCase().includes(name.toLowerCase())) || user.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();
      
      let dailyCount = 0;
      let dailyLimit = 50;
      
      if (!isOwner && !isPaid) {
        return res.status(403).json({
          success: false,
          error: "Payment Required",
          requiresPayment: true,
          price: 1299,
          message: "₹1,299 lifetime access required to use this bot. Enjoy 10 days free!"
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

      let spreadsheetId: string | null = user.spreadsheetId || null;
      
      const results = [];
      
      for (const product of products) {
        const whatsappMessage = generateWhatsAppMessageFromDiscovered(product, affiliateTag);
        const telegramMessage = generateTelegramMessageFromDiscovered(product, affiliateTag);
        
        // Try to append to Google Sheets, but don't fail if it errors
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
          } catch (sheetsError) {
            console.error('Google Sheets export failed for product:', product.title, sheetsError);
            // Continue without Sheets - data is saved in database
          }
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
      const OWNER_EMAILS = ["yaniikjain21@gmail.com", "salelooterz@gmail.com"];
      const isOwner = OWNER_EMAILS.includes(user?.email?.toLowerCase() || "");
      const isPaid = user?.isPaid === "true";
      
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

      const OWNER_EMAILS = ["yaniikjain21@gmail.com", "salelooterz@gmail.com"];
      const isOwner = OWNER_EMAILS.includes(user.email?.toLowerCase() || "");
      const isPaid = user.isPaid === "true";
      
      const dailyCount = await storage.getDailyProductCount(userId);
      const DAILY_LIMIT = 50;
      
      res.json({
        isPaid,
        isOwner,
        dailyCount,
        remaining: isOwner || isPaid ? DAILY_LIMIT - dailyCount : 0,
        dailyLimit: DAILY_LIMIT,
        price: 199900
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  app.post("/api/payment/create-order", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { amount } = req.body;
      // In production, create order with Razorpay API
      // For now, return mock order
      const orderId = `order_${Date.now()}`;
      
      res.json({ 
        orderId,
        razorpayKey: process.env.RAZORPAY_KEY_ID || 'rzp_test_key',
        amount 
      });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to create order',
      });
    }
  });

  app.post("/api/payment/verify", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Update subscription to end 30 days from now
      const subscriptionEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      user.subscriptionEndsAt = subscriptionEndsAt;
      user.isPaid = "true";
      await storage.updateUser(userId, { subscriptionEndsAt, isPaid: "true" });

      res.json({ 
        success: true, 
        message: "Subscription activated for 30 days",
        subscriptionEndsAt 
      });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Verification failed',
      });
    }
  });

  app.get("/api/sheets/status", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ connected: !!user.spreadsheetId });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  app.get("/api/user/sheets-id", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ sheetsId: user.spreadsheetId || "" });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  app.post("/api/user/sheets-id", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { sheetsId } = req.body;
      if (!sheetsId) {
        return res.status(400).json({ error: "Sheet ID is required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      await storage.updateUser(userId, { spreadsheetId: sheetsId });

      res.json({ success: true, sheetsId });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to save sheet',
      });
    }
  });


  return httpServer;
}
