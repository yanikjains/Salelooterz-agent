import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  spreadsheetId: text("spreadsheet_id"),
  isPaid: text("is_paid").default("false").notNull(),
  paidAt: timestamp("paid_at"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAutomationSchema = createInsertSchema(automations).omit({
  id: true,
  createdAt: true,
});

export type InsertAutomation = z.infer<typeof insertAutomationSchema>;
export type Automation = typeof automations.$inferSelect;
