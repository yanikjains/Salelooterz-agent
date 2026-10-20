import { discoverTelegramProducts, telegramSearchTerms } from "./productDiscovery";
import { getAmazonBlockReason, isAmazonTemporarilyBlocked } from "./scraper";
import { generateTelegramMessageFromDiscovered, isVerifiedTelegramProduct } from "./messageGenerator";
import { sendTelegramMessage } from "./telegram";
import { appendToSheet } from "./sheets";
import { storage } from "./storage";
import {
  wasRecentlyPosted,
  wasTitlePosted,
  markAsPosted,
  markTitleAsPosted,
  normalizeTitle,
  getTotalMemoryCount,
} from "./asinMemory";
import { log } from "./index";
import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";

export const ADMIN_USER_ID = "admin-scheduler";

const PRODUCTS_PER_BATCH = 150;
const TG_SEND_DELAY_MS = 800;
const SCHEDULER_CONFIG_FILE = "./scheduler-config.json";
const IST = "Asia/Kolkata";

export interface SchedulerConfig {
  affiliateTag: string;
  telegramBotToken?: string;
  telegramChannelId?: string;
  spreadsheetId?: string;
}

type PublicSchedulerConfig = Pick<SchedulerConfig, "affiliateTag" | "telegramChannelId" | "spreadsheetId">;
type BatchState = "idle" | "collecting" | "sending" | "success" | "failed";

export interface SchedulerStats {
  isRunning: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
  todayCount: number;
  thisHourCount: number;
  lastBatchCount: number;
  lastBatchSkipped: number;
  lastBatchSuccess: boolean;
  totalSent: number;
  telegramSent: number;
  memoryCount: number;
  batchState: BatchState;
  batchProgress: number;
  batchTarget: number;
  batchSent: number;
  lastBatchError: string | null;
  config: PublicSchedulerConfig | null;
}

function sanitizeConfig(value: unknown): SchedulerConfig | null {
  if (!value || typeof value !== "object") return null;
  const config = value as Record<string, unknown>;
  if (typeof config.affiliateTag !== "string" || !config.affiliateTag.trim()) return null;
  return {
    affiliateTag: config.affiliateTag.trim(),
    ...(typeof config.telegramBotToken === "string" ? { telegramBotToken: config.telegramBotToken } : {}),
    ...(typeof config.telegramChannelId === "string" ? { telegramChannelId: config.telegramChannelId } : {}),
    ...(typeof config.spreadsheetId === "string" ? { spreadsheetId: config.spreadsheetId } : {}),
  };
}

async function loadSchedulerConfig(): Promise<SchedulerConfig | null> {
  try {
    if (!existsSync(SCHEDULER_CONFIG_FILE)) return null;
    return sanitizeConfig(JSON.parse(await readFile(SCHEDULER_CONFIG_FILE, "utf-8")));
  } catch {
    return null;
  }
}

async function saveSchedulerConfig(config: SchedulerConfig): Promise<void> {
  try {
    await writeFile(SCHEDULER_CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
  } catch (error) {
    log(`[Scheduler] Failed to save config: ${error}`);
  }
}

async function clearSchedulerConfig(): Promise<void> {
  try {
    const { rm } = await import("fs/promises");
    if (existsSync(SCHEDULER_CONFIG_FILE)) await rm(SCHEDULER_CONFIG_FILE, { force: true });
  } catch {
    // Stopping automation should still succeed if the local config file is unavailable.
  }
}

class Scheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private nextRunAt: Date | null = null;
  private lastRunAt: Date | null = null;
  private lastBatchCount = 0;
  private lastBatchSkipped = 0;
  private lastBatchSuccess = false;
  private totalSent = 0;
  private telegramSent = 0;
  private telegramBatchInProgress = false;
  private memoryCount = 0;
  private hourCounts = new Map<string, number>();
  private dayCounts = new Map<string, number>();
  private config: SchedulerConfig | null = null;
  private batchState: BatchState = "idle";
  private batchProgress = 0;
  private batchSent = 0;
  private lastBatchError: string | null = null;

  private hourKey(): string {
    return new Date().toLocaleString("en-CA", { timeZone: IST, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false });
  }

  private dayKey(): string {
    return new Date().toLocaleDateString("en-CA", { timeZone: IST });
  }

  private increment(count: number): void {
    const hour = this.hourKey();
    const day = this.dayKey();
    this.hourCounts.set(hour, (this.hourCounts.get(hour) || 0) + count);
    this.dayCounts.set(day, (this.dayCounts.get(day) || 0) + count);
    this.totalSent += count;
  }

  async autoStart(): Promise<void> {
    const saved = await loadSchedulerConfig();
    if (!saved) {
      log("[Scheduler] No saved Telegram config — waiting for manual start.");
      return;
    }
    if (!saved.telegramBotToken || !saved.telegramChannelId) {
      log("[Scheduler] Saved config is missing Telegram credentials — waiting for Settings.");
      return;
    }
    log(`[Scheduler] Auto-starting Telegram scheduler (affiliate tag: ${saved.affiliateTag})`);
    try {
      await this.start(saved);
    } catch (error) {
      log(`[Scheduler] Could not restore Telegram scheduler: ${error}`);
    }
  }

  async start(config: SchedulerConfig): Promise<void> {
    const cleanConfig = sanitizeConfig(config);
    if (!cleanConfig) throw new Error("A valid affiliate tag is required.");
    if (!cleanConfig.telegramBotToken || !cleanConfig.telegramChannelId) {
      throw new Error("A Telegram bot token and channel ID are required to start automatic posting.");
    }
    this.config = cleanConfig;
    this.isRunning = true;
    await saveSchedulerConfig(cleanConfig);

    const existing = await storage.getUser(ADMIN_USER_ID);
    if (!existing) await storage.upsertUserWithId(ADMIN_USER_ID, "admin", null);
    await storage.updateUser(ADMIN_USER_ID, {
      telegramBotToken: cleanConfig.telegramBotToken || null,
      telegramChannelId: cleanConfig.telegramChannelId || null,
      spreadsheetId: cleanConfig.spreadsheetId || null,
    });

    log("[Scheduler] Started — Telegram batches scheduled for 10:00 AM and 7:00 PM IST.");
    this.scheduleNextTelegramBatch();
  }

  private msUntilISTTime(hour: number, minute = 0): number {
    const offset = 5.5 * 60 * 60 * 1000;
    const dayMs = 24 * 60 * 60 * 1000;
    const nowIST = Date.now() + offset;
    const dayStart = Math.floor(nowIST / dayMs) * dayMs;
    let target = dayStart + (hour * 60 + minute) * 60 * 1000;
    if (target <= nowIST) target += dayMs;
    return target - nowIST;
  }

  private scheduleNextTelegramBatch(): void {
    if (!this.isRunning) return;
    const at10 = this.msUntilISTTime(10, 0);
    const at19 = this.msUntilISTTime(19, 0);
    const delay = Math.min(at10, at19);
    const label = delay === at10 ? "10:00 AM IST" : "7:00 PM IST";
    this.nextRunAt = new Date(Date.now() + delay);
    log(`[Scheduler] Next Telegram batch in ${Math.round(delay / 60000)} min (${label})`);
    if (this.intervalId) clearTimeout(this.intervalId);
    this.intervalId = setTimeout(async () => {
      await this.runBatch();
      this.scheduleNextTelegramBatch();
    }, delay);
  }

  async runTelegramBatchNow(): Promise<boolean> {
    if (!this.config) return false;
    if (this.telegramBatchInProgress) return false;
    await this.runBatch();
    if (this.isRunning) this.scheduleNextTelegramBatch();
    return this.lastBatchSuccess;
  }

  stop(): void {
    if (this.intervalId) clearTimeout(this.intervalId);
    this.intervalId = null;
    this.isRunning = false;
    this.nextRunAt = null;
    this.config = null;
    void clearSchedulerConfig();
    log("[Scheduler] Telegram scheduler stopped.");
  }

  updateConfig(config: SchedulerConfig): void {
    const cleanConfig = sanitizeConfig(config);
    if (!cleanConfig) throw new Error("A valid affiliate tag is required.");
    this.config = cleanConfig;
    void saveSchedulerConfig(cleanConfig);
  }

  getStatus(): SchedulerStats {
    return {
      isRunning: this.isRunning,
      nextRunAt: this.nextRunAt?.toISOString() || null,
      lastRunAt: this.lastRunAt?.toISOString() || null,
      todayCount: this.dayCounts.get(this.dayKey()) || 0,
      thisHourCount: this.hourCounts.get(this.hourKey()) || 0,
      lastBatchCount: this.lastBatchCount,
      lastBatchSkipped: this.lastBatchSkipped,
      lastBatchSuccess: this.lastBatchSuccess,
      totalSent: this.totalSent,
      telegramSent: this.telegramSent,
      memoryCount: this.memoryCount,
      batchState: this.batchState,
      batchProgress: this.batchProgress,
      batchTarget: PRODUCTS_PER_BATCH,
      batchSent: this.batchSent,
      lastBatchError: this.lastBatchError,
      config: this.config
        ? {
            affiliateTag: this.config.affiliateTag,
            telegramChannelId: this.config.telegramChannelId,
            spreadsheetId: this.config.spreadsheetId,
          }
        : null,
    };
  }

  private async runBatch(): Promise<void> {
    if (this.telegramBatchInProgress) {
      log("[Scheduler] Telegram batch already in progress — duplicate trigger ignored.");
      return;
    }
    this.telegramBatchInProgress = true;
    try {
      await this.runBatchInternal();
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unexpected Telegram batch error.";
      this.failBatch(reason);
      log(`[Scheduler] Telegram batch failed: ${reason}`);
    } finally {
      this.telegramBatchInProgress = false;
    }
  }

  private failBatch(reason: string): void {
    this.batchState = "failed";
    this.lastBatchSuccess = false;
    this.lastBatchError = reason;
    this.lastBatchCount = this.batchSent;
    this.lastRunAt = new Date();
  }

  private async runBatchInternal(): Promise<void> {
    this.batchState = "collecting";
    this.batchProgress = 0;
    this.batchSent = 0;
    this.lastBatchCount = 0;
    this.lastBatchSkipped = 0;
    this.lastBatchSuccess = false;
    this.lastBatchError = null;
    this.lastRunAt = new Date();

    if (!this.config) {
      this.failBatch("Telegram automation is not configured.");
      return;
    }
    const { affiliateTag, telegramBotToken, telegramChannelId, spreadsheetId } = this.config;
    if (!telegramBotToken || !telegramChannelId) {
      this.failBatch("Add a Telegram bot token and channel ID in Settings before running a batch.");
      return;
    }

    const categoryIds = Object.keys(telegramSearchTerms);
    if (!categoryIds.length) {
      this.failBatch("No Telegram product categories are configured.");
      return;
    }

    log(`[Scheduler] Collecting exactly ${PRODUCTS_PER_BATCH} verified Telegram listings...`);
    const products: Awaited<ReturnType<typeof discoverTelegramProducts>> = [];
    const seen = new Set<string>();
    let skipped = 0;
    const baseQuota = Math.ceil(PRODUCTS_PER_BATCH / categoryIds.length);
    const categoryLimit = baseQuota + 5;

    for (let index = 0; index < categoryIds.length && products.length < PRODUCTS_PER_BATCH; index++) {
      const category = categoryIds[index];
      const remainingCategories = categoryIds.length - index;
      const target = Math.min(
        categoryLimit,
        Math.ceil((PRODUCTS_PER_BATCH - products.length) / remainingCategories),
      );
      let accepted = 0;

      for (let attempt = 1; attempt <= 3 && accepted < target && products.length < PRODUCTS_PER_BATCH; attempt++) {
        if (isAmazonTemporarilyBlocked()) break;
        try {
          const found = await discoverTelegramProducts(category, Math.max(8, target - accepted + 5));
          for (const product of found) {
            if (accepted >= target || products.length >= PRODUCTS_PER_BATCH) break;
            if (!isVerifiedTelegramProduct(product)) {
              skipped++;
              continue;
            }
            const titleKey = normalizeTitle(product.title);
            const asinKey = product.asin ? `asin:${product.asin}` : "";
            if ((asinKey && seen.has(asinKey)) || !titleKey || seen.has(`title:${titleKey}`)) {
              skipped++;
              continue;
            }
            if ((product.asin && await wasRecentlyPosted(product.asin)) || await wasTitlePosted(product.title)) {
              skipped++;
              continue;
            }
            if (asinKey) seen.add(asinKey);
            seen.add(`title:${titleKey}`);
            products.push(product);
            accepted++;
            this.batchProgress = products.length;
          }
        } catch (error) {
          log(`[Scheduler] Telegram discovery failed for ${category}: ${error}`);
        }
        if (accepted < target && attempt < 3 && !isAmazonTemporarilyBlocked()) await sleep(700);
      }
      log(`[Scheduler] ${category}: ${accepted}/${target} products`);
      if (isAmazonTemporarilyBlocked()) break;
    }

    if (products.length !== PRODUCTS_PER_BATCH) {
      const reason = isAmazonTemporarilyBlocked()
        ? `${getAmazonBlockReason()} Collected ${products.length}/${PRODUCTS_PER_BATCH}; no Telegram messages were sent.`
        : `Only ${products.length}/${PRODUCTS_PER_BATCH} complete live listings were verified. No messages were sent.`;
      this.lastBatchSkipped = skipped + (PRODUCTS_PER_BATCH - products.length);
      this.failBatch(reason);
      log(`[Scheduler] ${reason}`);
      return;
    }

    this.batchState = "sending";
    log(`[Scheduler] Sending ${products.length} Telegram messages...`);
    for (const product of products) {
      let message: string;
      try {
        message = generateTelegramMessageFromDiscovered(product, affiliateTag);
      } catch (error) {
        this.failBatch(error instanceof Error ? error.message : "Could not format a Telegram message.");
        return;
      }

      const sent = await sendTelegramMessage(telegramBotToken, telegramChannelId, message);
      if (!sent) {
        this.lastBatchSkipped = skipped + (PRODUCTS_PER_BATCH - this.batchSent);
        this.failBatch(`Telegram stopped accepting messages after ${this.batchSent}/${PRODUCTS_PER_BATCH} posts. Check bot permissions and channel settings.`);
        log(`[Scheduler] Telegram send failed at ${this.batchSent}/${PRODUCTS_PER_BATCH}; stopping to avoid further partial posts.`);
        return;
      }

      this.batchSent++;
      this.telegramSent++;
      this.batchProgress = PRODUCTS_PER_BATCH;

      const productInfo = {
        title: product.title,
        price: product.price,
        originalPrice: product.originalPrice || "",
        discount: product.discount || "",
        rating: product.rating,
        category: product.category,
        url: product.url,
      };
      try {
        if (product.asin) await markAsPosted(product.asin, productInfo);
        await markTitleAsPosted(productInfo);
      } catch (error) {
        this.lastBatchSkipped = skipped;
        this.failBatch("A Telegram post succeeded, but its duplicate-prevention record could not be saved. The batch stopped.");
        log(`[Scheduler] Could not save deduplication record after a successful post: ${error}`);
        return;
      }

      const telegramUrl = new URL(product.url);
      telegramUrl.searchParams.set("tag", affiliateTag);
      try {
        await storage.createAutomation({
          userId: ADMIN_USER_ID,
          productUrl: telegramUrl.toString(),
          productTitle: product.title,
          price: product.price,
          rating: `${product.rating}/5`,
          whatsappMessage: "",
          telegramMessage: message,
          affiliateTag,
          spreadsheetId: spreadsheetId || null,
        });
      } catch (error) {
        log(`[Scheduler] Telegram post succeeded; automation history could not be saved: ${error}`);
      }

      if (spreadsheetId) {
        try {
          await appendToSheet(spreadsheetId, {
            timestamp: new Date().toISOString(),
            productTitle: product.title,
            price: product.price,
            rating: `${product.rating}/5`,
            productUrl: telegramUrl.toString(),
            whatsappMessage: "",
            telegramMessage: message,
            affiliateTag,
          });
        } catch {
          // Sheets is an optional log destination; Telegram remains the source of truth.
        }
      }

      if (this.batchSent < PRODUCTS_PER_BATCH) await sleep(TG_SEND_DELAY_MS);
    }

    this.memoryCount = await getTotalMemoryCount();
    this.increment(this.batchSent);
    this.lastBatchCount = this.batchSent;
    this.lastBatchSkipped = skipped;
    this.lastBatchSuccess = true;
    this.batchState = "success";
    this.lastBatchError = null;
    this.lastRunAt = new Date();
    log(`[Scheduler] Telegram batch complete: ${this.batchSent}/${PRODUCTS_PER_BATCH} messages sent; memory has ${this.memoryCount} products.`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const scheduler = new Scheduler();
