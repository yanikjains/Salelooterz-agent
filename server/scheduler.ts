import { discoverProducts, discoverPremiumProducts, discoverHotDeals, categories, categorySearchTerms } from "./productDiscovery";
import { generateTelegramMessageFromDiscovered, generateWhatsAppMessageFromDiscovered, generatePersonalizedWhatsAppMessage, isPremiumDeal } from "./messageGenerator";
import { sendTelegramMessage } from "./telegram";
import { appendToSheet, appendWhatsAppBatchToSheet, type WhatsAppRow } from "./sheets";
import { storage } from "./storage";
import { wasRecentlyPosted, wasTitlePosted, markAsPosted, markTitleAsPosted, getTotalMemoryCount } from "./asinMemory";
import { log } from "./index";
import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";

export const ADMIN_USER_ID = "admin-scheduler";

// Telegram: 300 products sent ALL AT ONCE, once per day
const PRODUCTS_PER_BATCH   = 300;
const TG_SEND_DELAY_MS     = 800;   // 800ms between sends (~4 min for 300 msgs)

// WhatsApp: exactly 30 messages generated automatically once per day
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

  /** ms until next midnight IST (used for WhatsApp) */
  private msUntilMidnightIST(): number {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const midnight = new Date(istNow);
    midnight.setUTCHours(24, 0, 0, 0);
    return midnight.getTime() - istNow.getTime();
  }

  /** ms until next 3:00 AM IST (used for Telegram batch) */
  private msUntil3AMIST(): number {
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // +5:30
    const istNow = Date.now() + IST_OFFSET_MS;
    // Minutes elapsed since last IST midnight
    const istMinuteOfDay = Math.floor((istNow % (24 * 60 * 60 * 1000)) / 60000);
    const target = 3 * 60; // 3:00 AM = 180 min from midnight IST
    const remaining = istMinuteOfDay < target
      ? (target - istMinuteOfDay) * 60 * 1000
      : (24 * 60 - istMinuteOfDay + target) * 60 * 1000;
    return remaining;
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

    log("[Scheduler] Starting — sending all 300 Telegram messages now...");
    await this.runBatch();
    await this.scheduleTelegramNextDay();

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
    const { affiliateTag, spreadsheetId: configSheetId } = this.config;
    const user = await storage.getUser(ADMIN_USER_ID).catch(() => null);
    const spreadsheetId = configSheetId || user?.spreadsheetId || null;

    // All groups: 7 product categories + 4 demographic groups = 11 total
    const allGroups = [
      ...Object.keys(categorySearchTerms),
      "boys", "girls", "men", "women",
    ];
    const perGroup = Math.ceil(WHATSAPP_BATCH_SIZE / allGroups.length);

    log(`[Scheduler] Running daily WhatsApp PREMIUM batch — ${allGroups.length} groups, ~${perGroup} each...`);

    const sheetRows: WhatsAppRow[] = [];
    let generated = 0;

    for (const cat of allGroups) {
      if (generated >= WHATSAPP_BATCH_SIZE) break;
      try {
        const raw = await discoverPremiumProducts(cat, perGroup + 3);
        let groupCount = 0;
        for (const product of raw) {
          if (generated >= WHATSAPP_BATCH_SIZE || groupCount >= perGroup) break;
          if (!isPremiumDeal(product.price, product.discount || "")) continue;
          if (product.asin) { if (await wasRecentlyPosted(product.asin)) continue; }
          else              { if (await wasTitlePosted(product.title))    continue; }

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
          else              await markTitleAsPosted(pInfo);

          generated++;
          groupCount++;
        }
        log(`[Scheduler] WhatsApp group "${cat}": ${groupCount} products`);
        await sleep(1500);
      } catch { continue; }
    }

    // Write all messages to Google Sheets (date-organised tab)
    if (sheetRows.length && spreadsheetId) {
      try {
        await appendWhatsAppBatchToSheet(spreadsheetId, sheetRows);
        log(`[Scheduler] WhatsApp: ${sheetRows.length} messages exported to Google Sheets`);
      } catch (err) {
        log(`[Scheduler] WhatsApp Sheets export failed: ${err}`);
      }
    } else if (!spreadsheetId) {
      log(`[Scheduler] WhatsApp: no Sheet ID configured — messages not exported`);
    }

    this.waDailyCount = generated;
    await this.saveWaDate(this.todayIST());
    log(`[Scheduler] WhatsApp premium batch done: ${generated} messages → Sheets`);
  }

  private async scheduleTelegramNextDay() {
    const msTo3AM = this.msUntil3AMIST();
    const next3AM = new Date(Date.now() + msTo3AM);
    this.nextRunAt = next3AM;
    log(`[Scheduler] Next Telegram batch in ${Math.round(msTo3AM / 60000)} min (3:00 AM IST)`);
    if (this.intervalId) clearTimeout(this.intervalId as unknown as NodeJS.Timeout);
    this.intervalId = setTimeout(async () => {
      await this.runBatch();
      await this.scheduleTelegramNextDay();
    }, msTo3AM) as unknown as NodeJS.Timeout;
  }

  stop() {
    if (this.intervalId)   { clearTimeout(this.intervalId as unknown as NodeJS.Timeout); this.intervalId = null; }
    if (this.waIntervalId) { clearTimeout(this.waIntervalId); this.waIntervalId = null; }
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

    log(`[Scheduler] Starting full Telegram batch — collecting up to ${PRODUCTS_PER_BATCH} products...`);

    const collectedProducts: any[] = [];
    // Local dedup within THIS batch run (before markAsPosted is called)
    const seenInBatch = new Set<string>();
    let totalSkipped = 0;

    // Cycle through all categories (+ hot deals) multiple times to fill 300
    const allCategoryIds = [...categories.map(c => c.id), "hot"];
    // Try each category up to 3 rounds to reach the target
    outer: for (let round = 0; round < 3; round++) {
      for (const cat of allCategoryIds) {
        if (collectedProducts.length >= PRODUCTS_PER_BATCH) break outer;
        const needed = PRODUCTS_PER_BATCH - collectedProducts.length;
        const fetchCount = Math.min(needed + 5, 15);
        log(`[Scheduler] Scraping "${cat}" (round ${round + 1}) — need ${needed} more`);
        try {
          const rawProducts = cat === "hot"
            ? await discoverHotDeals(fetchCount)
            : await discoverProducts(cat, fetchCount);

          for (const p of (rawProducts || [])) {
            if (collectedProducts.length >= PRODUCTS_PER_BATCH) break;
            // Deduplicate: check both persistent memory AND current batch
            const key = p.asin || `title:${p.title.toLowerCase().trim().slice(0, 80)}`;
            if (seenInBatch.has(key)) { totalSkipped++; continue; }
            if (p.asin) {
              if (await wasRecentlyPosted(p.asin)) { totalSkipped++; continue; }
            } else {
              if (await wasTitlePosted(p.title)) { totalSkipped++; continue; }
            }
            seenInBatch.add(key);
            collectedProducts.push(p);
          }
          await sleep(800);
        } catch (err) {
          log(`[Scheduler] Scrape error for "${cat}": ${err}`);
        }
      }
    }

    if (totalSkipped > 0) log(`[Scheduler] Dedup: ${totalSkipped} skipped, ${collectedProducts.length} new`);

    if (!collectedProducts.length) {
      log("[Scheduler] No new products found — all were duplicates or scraping failed");
      this.lastBatchCount = 0;
      this.lastBatchSuccess = false;
      this.lastRunAt = new Date();
      return;
    }

    log(`[Scheduler] Sending ${collectedProducts.length} messages to Telegram...`);
    let tgSent = 0;

    for (const product of collectedProducts) {
      const telegramMessage = generateTelegramMessageFromDiscovered(product, affiliateTag);
      const whatsappMessage = generateWhatsAppMessageFromDiscovered(product, affiliateTag);

      // Send to Telegram
      if (telegramBotToken && telegramChannelId) {
        try {
          const ok = await sendTelegramMessage(telegramBotToken, telegramChannelId, telegramMessage);
          if (ok) { tgSent++; this.telegramSent++; }
        } catch (e) { log(`[Scheduler] Telegram error: ${e}`); }
        await sleep(TG_SEND_DELAY_MS);
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
      if (product.asin) await markAsPosted(product.asin, productInfo);
      else              await markTitleAsPosted(productInfo);
    }

    this.memoryCount = await getTotalMemoryCount();
    this.increment(collectedProducts.length);
    this.lastBatchCount = collectedProducts.length;
    this.lastBatchSkipped = totalSkipped;
    this.lastBatchSuccess = true;
    this.lastRunAt = new Date();
    log(`[Scheduler] Batch complete: ${collectedProducts.length} processed | TG sent: ${tgSent} | Memory: ${this.memoryCount} ASINs`);
  }
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

export const scheduler = new Scheduler();
