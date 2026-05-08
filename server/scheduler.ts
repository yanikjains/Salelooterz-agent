import { discoverProducts, discoverHotDeals, categories } from "./productDiscovery";
import { generateWhatsAppMessageFromDiscovered, generateTelegramMessageFromDiscovered } from "./messageGenerator";
import { sendTelegramMessage } from "./telegram";
import { appendToSheet } from "./sheets";
import { storage } from "./storage";
import { waManager } from "./whatsapp";
import { wasRecentlyPosted, markAsPosted, getTotalMemoryCount } from "./asinMemory";
import { log } from "./index";
import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";

export const ADMIN_USER_ID = "admin-scheduler";

const PRODUCTS_PER_BATCH = 15;
const BATCH_INTERVAL_MS = 20 * 60 * 1000; // every 20 min
const SCHEDULER_CONFIG_FILE = "./scheduler-config.json";

export interface SchedulerConfig {
  affiliateTag: string;
  telegramBotToken?: string;
  telegramChannelId?: string;
  whatsappChannelJid?: string;
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
  whatsappSent: number;
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
  private isRunning = false;
  private nextRunAt: Date | null = null;
  private lastRunAt: Date | null = null;
  private lastBatchCount = 0;
  private lastBatchSkipped = 0;
  private lastBatchSuccess = true;
  private categoryIndex = 0;
  private totalSent = 0;
  private telegramSent = 0;
  private whatsappSent = 0;
  private memoryCount = 0;
  private hourCounts = new Map<string, number>();
  private dayCounts = new Map<string, number>();
  private config: SchedulerConfig | null = null;

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

  /**
   * Called once on server boot. Loads any saved config from disk and
   * auto-starts the scheduler so it keeps running without manual clicks.
   */
  async autoStart(): Promise<void> {
    const saved = await loadSchedulerConfig();
    if (!saved) {
      log("[Scheduler] No saved config — waiting for manual start.");
      return;
    }
    log(`[Scheduler] Auto-starting from saved config (tag: ${saved.affiliateTag})`);
    // Apply saved WhatsApp JID if present (waManager loads its own JID from disk too)
    if (saved.whatsappChannelJid) {
      waManager.setChannelJid(saved.whatsappChannelJid);
    }
    await this.start(saved);
  }

  async start(config: SchedulerConfig) {
    if (this.isRunning) { this.config = config; return; }
    this.config = config;
    this.isRunning = true;

    // Persist config so we can auto-restart after server reboots
    await saveSchedulerConfig(config);

    const existing = await storage.getUser(ADMIN_USER_ID);
    if (!existing) await storage.upsertUserWithId(ADMIN_USER_ID, "admin", null);
    await storage.updateUser(ADMIN_USER_ID, {
      telegramBotToken: config.telegramBotToken || null,
      telegramChannelId: config.telegramChannelId || null,
      spreadsheetId: config.spreadsheetId || null,
    });

    log("[Scheduler] Starting — first batch running now...");
    await this.runBatch();

    this.intervalId = setInterval(() => this.runBatch(), BATCH_INTERVAL_MS);
    this.nextRunAt = new Date(Date.now() + BATCH_INTERVAL_MS);
  }

  stop() {
    if (this.intervalId) { clearInterval(this.intervalId); this.intervalId = null; }
    this.isRunning = false;
    this.nextRunAt = null;
    // Clear the saved config so it does NOT auto-restart after the next reboot
    clearSchedulerConfig();
    log("[Scheduler] Stopped.");
  }

  updateConfig(config: SchedulerConfig) {
    this.config = config;
    // Update persisted config too
    saveSchedulerConfig(config);
    if (config.whatsappChannelJid) waManager.setChannelJid(config.whatsappChannelJid);
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
      whatsappSent: this.whatsappSent,
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

      // Deduplicate: skip any ASIN posted within the last 6 months
      const products = [];
      let skipped = 0;
      for (const p of rawProducts) {
        if (!p.asin) { products.push(p); continue; }
        const recent = await wasRecentlyPosted(p.asin);
        if (recent) {
          skipped++;
          log(`[Scheduler] Skipping ${p.asin} (posted within 6 months)`);
        } else {
          products.push(p);
        }
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

      let tgSent = 0, waSent = 0;

      for (const product of products) {
        const whatsappMessage = generateWhatsAppMessageFromDiscovered(product, affiliateTag);
        const telegramMessage = generateTelegramMessageFromDiscovered(product, affiliateTag);

        // Send to Telegram
        if (telegramBotToken && telegramChannelId) {
          try {
            const ok = await sendTelegramMessage(telegramBotToken, telegramChannelId, telegramMessage);
            if (ok) { tgSent++; this.telegramSent++; }
          } catch (e) { log(`[Scheduler] Telegram error: ${e}`); }
          await sleep(2000);
        }

        // Send to WhatsApp
        if (waManager.isConnected()) {
          try {
            const ok = await waManager.sendToChannel(whatsappMessage);
            if (ok) { waSent++; this.whatsappSent++; }
          } catch (e) { log(`[Scheduler] WhatsApp error: ${e}`); }
          await sleep(3000);
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

        // Record in ASIN memory
        if (product.asin) {
          await markAsPosted(product.asin, product.title);
        }
      }

      this.memoryCount = await getTotalMemoryCount();
      this.increment(products.length);
      this.lastBatchCount = products.length;
      this.lastBatchSuccess = true;
      this.lastRunAt = new Date();
      this.nextRunAt = new Date(Date.now() + BATCH_INTERVAL_MS);
      log(`[Scheduler] Done: ${products.length} sent, ${skipped} skipped | TG: ${tgSent} | WA: ${waSent} | Memory: ${this.memoryCount} ASINs`);
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
