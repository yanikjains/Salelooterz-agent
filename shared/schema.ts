import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password"),
  email: text("email").unique(),
  spreadsheetId: text("spreadsheet_id"),
  googleAccessToken: text("google_access_token"),
  googleRefreshToken: text("google_refresh_token"),
  telegramBotToken: text("telegram_bot_token"),
  telegramChannelId: text("telegram_channel_id"),
  whatsappChannelUrl: text("whatsapp_channel_url"),
  isPaid: text("is_paid").default("false").notNull(),
  subscriptionEndsAt: timestamp("subscription_ends_at"),
  trialEndsAt: timestamp("trial_ends_at"),
  razorpayOrderId: text("razorpay_order_id"),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  failedLoginAttempts: integer("failed_login_attempts").default(0).notNull(),
  lockedUntil: timestamp("locked_until"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
});

// Password validation: min 8 chars, uppercase, lowercase, number, special char
export const passwordSchema = z.string()
  .min(8, "Min 8 characters")
  .regex(/[A-Z]/, "Include uppercase")
  .regex(/[a-z]/, "Include lowercase")
  .regex(/[0-9]/, "Include a number")
  .regex(/[^a-zA-Z0-9]/, "Include special char");

// Username validation: alphanumeric and underscores only, 3-20 chars
export const usernameSchema = z.string()
  .min(3, "Min 3 characters")
  .max(20, "Max 20 characters")
  .regex(/^[a-zA-Z0-9_]+$/, "Alphanumeric only");

export const signupSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  email: z.string().email("Invalid email format"),
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export * from "./models/auth";

export const automations = pgTable("automations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  productUrl: text("product_url").notNull(),
  productTitle: text("product_title").notNull(),
  price: text("price").notNull(),
  rating: text("rating").notNull(),
  whatsappMessage: text("whatsapp_message").notNull(),
  telegramMessage: text("telegram_message").notNull(),
  affiliateTag: text("affiliate_tag").notNull(),
  spreadsheetId: text("spreadsheet_id"),
  sentToTelegram: text("sent_to_telegram").default("false").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAutomationSchema = createInsertSchema(automations).omit({
  id: true,
  createdAt: true,
});

export type InsertAutomation = z.infer<typeof insertAutomationSchema>;
export type Automation = typeof automations.$inferSelect;

// Tracks every ASIN ever posted so we don't repeat within 6 months
export const seenAsins = pgTable("seen_asins", {
  asin: text("asin").primaryKey(),
  title: text("title").notNull(),
  firstSeenAt: timestamp("first_seen_at").defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
  timesPosted: integer("times_posted").default(1).notNull(),
});

export type SeenAsin = typeof seenAsins.$inferSelect;
