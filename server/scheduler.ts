import { discoverProducts, discoverHotDeals, categories, categorySearchTerms } from "./productDiscovery";
import { generateTelegramMessageFromDiscovered, generateWhatsAppMessageFromDiscovered, generatePersonalizedWhatsAppMessage } from "./messageGenerator";
import { sendTelegramMessage } from "./telegram";
import { appendToSheet } from "./sheets";
import { storage } from "./storage";
import { wasRecentlyPosted, wasTitlePosted, markAsPosted, markTitleAsPosted, getTotalMemoryCount } from "./asinMemory";
import { log } from "./index";
import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";

export const ADMIN_USER_ID = "admin-scheduler";

// Telegram: 13 products × every 60 min × 24 h = 312/day
const PRODUCTS_PER_BATCH   = 13;
const BATCH_INTERVAL_MS    = 60 * 60 * 1000;   // 60 minutes

// WhatsApp: 30 messages generated automatically once per day
const WHATSAPP_BATCH_SIZE  = 30;
const WA_DATE_FILE         = "./whatsapp-last-batch-date.txt";

const SCHEDULER_CONFIG_FILE = "./scheduler-config.json";

export interface SchedulerConfig {
  affiliateTag: string;
  telegramBotToken?: string;
  telegramChannelId?: string;
  spreadsheetId?: string;
}

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
  config: SchedulerConfig | null;
}

async function loadSchedulerConfig(): Promise<SchedulerConfig | null> {
  try {
    if (existsSync(SCHEDULER_CONFIG_FILE)) {
      const raw = await readFile(SCHEDULER_CONFIG_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed?.affiliateTag) return parsed as SchedulerConfig;
    }
  } catch {}
  return null;
}

async function saveSchedulerConfig(config: SchedulerConfig): Promise<void> {
  try {
    await writeFile(SCHEDULER_CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
  } catch (err) {
    log(`[Scheduler] Failed to save config: ${err}`);
  }
}

async function clearSchedulerConfig(): Promise<void> {
  try {
    const { rm } = await import("fs/promises");
    if (existsSync(SCHEDULER_CONFIG_FILE)) {
      await rm(SCHEDULER_CONFIG_FILE, { force: true });
    }
  } catch {}
}

class Scheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private waIntervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private nextRunAt: Date | null = null;
  private lastRunAt: Date | null = null;
  private lastBatchCount = 0;
  private lastBatchSkipped = 0;
  private lastBatchSuccess = true;
  private categoryIndex = 0;
  private totalSent = 0;
  private telegramSent = 0;
  private waDailyCount = 0;
  private memoryCount = 0;
  private hourCounts = new Map<string, number>();
  private dayCounts = new Map<string, number>();
  private config: SchedulerConfig | null = null;

  /** IST date string e.g. "2026-07-05" */
  private todayIST(): string {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  }

  /** ms until next midnight IST */
  private msUntilMidnightIST(): number {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const midnight = new Date(istNow);
    midnight.setUTCHours(24, 0, 0, 0);
    return midnight.getTime() - istNow.getTime();
  }

  private async waLastDate(): Promise<string> {
    try {
      if (existsSync(WA_DATE_FILE)) return (await readFile(WA_DATE_FILE, "utf-8")).trim();
    } catch {}
    return "";
  }

  private async saveWaDate(date: string): Promise<void> {
    try { await writeFile(WA_DATE_FILE, date, "utf-8"); } catch {}
  }

  private hourKey() {
    const n = new Date();
    return `${n.getFullYear()}-${n.getMonth()}-${n.getDate()}-${n.getHours()}`;
  }
  private dayKey() {
    const n = new Date();
    return `${n.getFullYear()}-${n.getMonth()}-${n.getDate()}`;
  }
  private increment(count: number) {
    const h = this.hourKey(), d = this.dayKey();
    this.hourCounts.set(h, (this.hourCounts.get(h) || 0) + count);
    this.dayCounts.set(d, (this.dayCounts.get(d) || 0) + count);
    this.totalSent += count;
  }

  async autoStart(): Promise<void> {
    const saved = await loadSchedulerConfig();
    if (!saved) {
      log("[Scheduler] No saved config — waiting for manual start.");
      return;
    }
    log(`[Scheduler] Auto-starting from saved config (tag: ${saved.affiliateTag})`);
    await this.start(saved);
  }

  async start(config: SchedulerConfig) {
    if (this.isRunning) { this.config = config; return; }
    this.config = config;
    this.isRunning = true;

    await saveSchedulerConfig(config);

    const existing = await storage.getUser(ADMIN_USER_ID);
    if (!existing) await storage.upsertUserWithId(ADMIN_USER_ID, "admin", null);
    await storage.updateUser(ADMIN_USER_ID, {
      telegramBotToken: config.telegramBotToken || null,
      telegramChannelId: config.telegramChannelId || null,
      spreadsheetId: config.spreadsheetId || null,
    });

    log("[Scheduler] Starting — first Telegram batch running now...");
    await this.runBatch();
    this.intervalId = setInterval(() => this.runBatch(), BATCH_INTERVAL_MS);
    this.nextRunAt = new Date(Date.now() + BATCH_INTERVAL_MS);

    // Daily WhatsApp batch — run immediately if not yet done today, then repeat every 24 h
    await this.scheduleWhatsAppBatch();
  }

  private async scheduleWhatsAppBatch() {
    const lastDate = await this.waLastDate();
    const today    = this.todayIST();

    if (lastDate !== today) {
      log("[Scheduler] Daily WhatsApp batch not yet done today — running now...");
      await this.runWhatsAppBatch();
    } else {
      log("[Scheduler] Daily WhatsApp batch already done today.");
    }

    // Schedule next batch at midnight IST
    const msToMidnight = this.msUntilMidnightIST();
    log(`[Scheduler] Next WhatsApp batch in ${Math.round(msToMidnight / 60000)} min (midnight IST)`);
    if (this.waIntervalId) clearTimeout(this.waIntervalId);
    this.waIntervalId = setTimeout(async () => {
      await this.runWhatsAppBatch();
      // After midnight, repeat every 24 h
      this.waIntervalId = setInterval(() => this.runWhatsAppBatch(), 24 * 60 * 60 * 1000);
    }, msToMidnight) as unknown as NodeJS.Timeout;
  }

  private async runWhatsAppBatch() {
    if (!this.config) return;
    const { affiliateTag } = this.config;
    const user = await storage.getUser(ADMIN_USER_ID).catch(() => null);
    const spreadsheetId = user?.spreadsheetId || null;
    const catIds = Object.keys(categorySearchTerms);
    let generated = 0;

    log("[Scheduler] Running daily WhatsApp batch...");
    for (const cat of catIds) {
      if (generated >= WHATSAPP_BATCH_SIZE) break;
      try {
        const raw = await discoverProducts(cat, 5);
        for (const product of raw) {
          if (generated >= WHATSAPP_BATCH_SIZE) break;
          // Dedup
          if (product.asin) { if (await wasRecentlyPosted(product.asin)) continue; }
          else              { if (await wasTitlePosted(product.title))    continue; }

          const whatsappMessage = generatePersonalizedWhatsAppMessage(product, affiliateTag, cat);
          await storage.createAutomation({
            userId: ADMIN_USER_ID,
            productUrl: product.url,
            productTitle: product.title,
            price: product.price,
            rating: `${product.rating}/5`,
            whatsappMessage,
            telegramMessage: "",
            affiliateTag,
            spreadsheetId: spreadsheetId || null,
          }).catch(() => {});

          const pInfo = { title: product.title, price: product.price, originalPrice: (product as any).originalPrice || "", discount: (product as any).discount || "", rating: product.rating, category: cat, url: product.url };
          if (product.asin) await markAsPosted(product.asin, pInfo);
          else              await markTitleAsPosted(pInfo);

          generated++;
        }
        await sleep(1200);
      } catch { continue; }
    }

    this.waDailyCount = generated;
    await this.saveWaDate(this.todayIST());
    log(`[Scheduler] WhatsApp batch done: ${generated} messages stored`);
  }

  stop() {
    if (this.intervalId)   { clearInterval(this.intervalId);   this.intervalId   = null; }
    if (this.waIntervalId) { clearTimeout(this.waIntervalId);  this.waIntervalId = null; }
    this.isRunning = false;
    this.nextRunAt = null;
    clearSchedulerConfig();
    log("[Scheduler] Stopped.");
  }

  updateConfig(config: SchedulerConfig) {
    this.config = config;
    saveSchedulerConfig(config);
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
      config: this.config,
    };
  }

  private async runBatch() {
    if (!this.config) return;
    const { affiliateTag, telegramBotToken, telegramChannelId, spreadsheetId } = this.config;

    const categoryIds = categories.map(c => c.id);
    const useHot = this.categoryIndex % 4 === 0;
    const category = useHot ? "hot" : categoryIds[this.categoryIndex % categoryIds.length];
    this.categoryIndex++;

    log(`[Scheduler] Batch — category: "${category}"`);

    try {
      const rawProducts = useHot
        ? await discoverHotDeals(PRODUCTS_PER_BATCH)
        : await discoverProducts(category, PRODUCTS_PER_BATCH);

      if (!rawProducts?.length) {
        log("[Scheduler] No products found, skipping");
        this.lastBatchSuccess = false;
        this.lastRunAt = new Date();
        this.nextRunAt = new Date(Date.now() + BATCH_INTERVAL_MS);
        return;
      }

      const products = [];
      let skipped = 0;
      for (const p of rawProducts) {
        if (p.asin) {
          const seen = await wasRecentlyPosted(p.asin);
          if (seen) {
            skipped++;
            log(`[Scheduler] Skipping ${p.asin} — already posted`);
            continue;
          }
        } else {
          const seen = await wasTitlePosted(p.title);
          if (seen) {
            skipped++;
            log(`[Scheduler] Skipping "${p.title.slice(0, 50)}" (no ASIN) — already posted`);
            continue;
          }
        }
        products.push(p);
      }
      this.lastBatchSkipped = skipped;
      if (skipped > 0) log(`[Scheduler] Deduplication: ${skipped} skipped, ${products.length} new`);

      if (!products.length) {
        log("[Scheduler] All products in this batch were duplicates — skipping");
        this.lastBatchCount = 0;
        this.lastBatchSuccess = true;
        this.lastRunAt = new Date();
        this.nextRunAt = new Date(Date.now() + BATCH_INTERVAL_MS);
        return;
      }

      let tgSent = 0;

      for (const product of products) {
        const telegramMessage = generateTelegramMessageFromDiscovered(product, affiliateTag);
        const whatsappMessage = generateWhatsAppMessageFromDiscovered(product, affiliateTag);

        // Send to Telegram
        if (telegramBotToken && telegramChannelId) {
          try {
            const ok = await sendTelegramMessage(telegramBotToken, telegramChannelId, telegramMessage);
            if (ok) { tgSent++; this.telegramSent++; }
          } catch (e) { log(`[Scheduler] Telegram error: ${e}`); }
          await sleep(2000);
        }

        // Google Sheets
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

        // Store in automations log
        try {
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
        } catch {}

        const productInfo = {
          title: product.title,
          price: product.price,
          originalPrice: (product as any).originalPrice || "",
          discount: (product as any).discount || "",
          rating: product.rating,
          category: product.category,
          url: product.url,
        };
        if (product.asin) {
          await markAsPosted(product.asin, productInfo);
        } else {
          await markTitleAsPosted(productInfo);
        }
      }

      this.memoryCount = await getTotalMemoryCount();
      this.increment(products.length);
      this.lastBatchCount = products.length;
      this.lastBatchSuccess = true;
      this.lastRunAt = new Date();
      this.nextRunAt = new Date(Date.now() + BATCH_INTERVAL_MS);
      log(`[Scheduler] Done: ${products.length} sent | TG: ${tgSent} | Memory: ${this.memoryCount} ASINs`);
    } catch (err) {
      log(`[Scheduler] Batch error: ${err}`);
      this.lastBatchSuccess = false;
      this.lastRunAt = new Date();
      this.nextRunAt = new Date(Date.now() + BATCH_INTERVAL_MS);
    }
  }
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

export const scheduler = new Scheduler();
