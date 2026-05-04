import { discoverProducts, discoverHotDeals, categories } from "./productDiscovery";
import { generateWhatsAppMessageFromDiscovered, generateTelegramMessageFromDiscovered } from "./messageGenerator";
import { sendTelegramMessage } from "./telegram";
import { appendToSheet } from "./sheets";
import { storage } from "./storage";
import { log } from "./index";

export const ADMIN_USER_ID = "admin-scheduler";

const PRODUCTS_PER_BATCH = 15;       // products per run
const BATCH_INTERVAL_MS = 20 * 60 * 1000; // every 20 minutes → 45/hour → ~1080/day

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
  lastBatchSuccess: boolean;
  totalSent: number;
  config: SchedulerConfig | null;
}

class Scheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private nextRunAt: Date | null = null;
  private lastRunAt: Date | null = null;
  private lastBatchCount = 0;
  private lastBatchSuccess = true;
  private categoryIndex = 0;
  private totalSent = 0;

  // Per-hour tracking
  private hourCounts: Map<string, number> = new Map();
  // Per-day tracking
  private dayCounts: Map<string, number> = new Map();

  private config: SchedulerConfig | null = null;

  private hourKey(): string {
    const n = new Date();
    return `${n.getFullYear()}-${n.getMonth()}-${n.getDate()}-${n.getHours()}`;
  }

  private dayKey(): string {
    const n = new Date();
    return `${n.getFullYear()}-${n.getMonth()}-${n.getDate()}`;
  }

  private increment(count: number) {
    const h = this.hourKey();
    const d = this.dayKey();
    this.hourCounts.set(h, (this.hourCounts.get(h) || 0) + count);
    this.dayCounts.set(d, (this.dayCounts.get(d) || 0) + count);
    this.totalSent += count;
  }

  async start(config: SchedulerConfig): Promise<void> {
    if (this.isRunning) {
      this.config = config;
      return;
    }
    this.config = config;
    this.isRunning = true;

    // Ensure admin user exists in storage
    const existing = await storage.getUser(ADMIN_USER_ID);
    if (!existing) {
      await storage.upsertUserWithId(ADMIN_USER_ID, "admin", null);
    }

    log("[Scheduler] Starting — first batch running now...");
    await this.runBatch();

    this.intervalId = setInterval(async () => {
      await this.runBatch();
    }, BATCH_INTERVAL_MS);

    this.nextRunAt = new Date(Date.now() + BATCH_INTERVAL_MS);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    this.nextRunAt = null;
    log("[Scheduler] Stopped.");
  }

  updateConfig(config: SchedulerConfig): void {
    this.config = config;
  }

  getStatus(): SchedulerStats {
    return {
      isRunning: this.isRunning,
      nextRunAt: this.nextRunAt?.toISOString() || null,
      lastRunAt: this.lastRunAt?.toISOString() || null,
      todayCount: this.dayCounts.get(this.dayKey()) || 0,
      thisHourCount: this.hourCounts.get(this.hourKey()) || 0,
      lastBatchCount: this.lastBatchCount,
      lastBatchSuccess: this.lastBatchSuccess,
      totalSent: this.totalSent,
      config: this.config,
    };
  }

  private async runBatch(): Promise<void> {
    if (!this.config) return;
    const { affiliateTag, telegramBotToken, telegramChannelId, spreadsheetId } = this.config;

    const categoryIds = categories.map(c => c.id);
    // Alternate between hot deals and category-specific
    const useHot = this.categoryIndex % 4 === 0;
    const category = useHot ? "hot" : categoryIds[this.categoryIndex % categoryIds.length];
    this.categoryIndex++;

    log(`[Scheduler] Running batch — category: "${category}", products: ${PRODUCTS_PER_BATCH}`);

    try {
      let products;
      try {
        products = useHot
          ? await discoverHotDeals(PRODUCTS_PER_BATCH)
          : await discoverProducts(category, PRODUCTS_PER_BATCH);
      } catch (scrapeErr) {
        log(`[Scheduler] Scrape failed for category "${category}": ${scrapeErr}`);
        this.lastBatchSuccess = false;
        this.lastRunAt = new Date();
        this.nextRunAt = new Date(Date.now() + BATCH_INTERVAL_MS);
        return;
      }

      if (!products || products.length === 0) {
        log(`[Scheduler] No products found for "${category}", skipping batch`);
        this.lastBatchSuccess = false;
        this.lastRunAt = new Date();
        this.nextRunAt = new Date(Date.now() + BATCH_INTERVAL_MS);
        return;
      }

      let sent = 0;

      for (const product of products) {
        const whatsappMessage = generateWhatsAppMessageFromDiscovered(product, affiliateTag);
        const telegramMessage = generateTelegramMessageFromDiscovered(product, affiliateTag);

        // Auto-send to Telegram
        if (telegramBotToken && telegramChannelId) {
          try {
            const ok = await sendTelegramMessage(telegramBotToken, telegramChannelId, telegramMessage);
            if (ok) sent++;
          } catch (e) {
            log(`[Scheduler] Telegram send failed: ${e}`);
          }
          // Rate limit: wait 2s between Telegram messages (max 30/sec allowed, we stay safe)
          await sleep(2000);
        }

        // Export to Google Sheets
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
          } catch (e) {
            log(`[Scheduler] Sheets export failed: ${e}`);
          }
        }

        // Store in automations
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
        } catch (e) {
          log(`[Scheduler] Storage failed: ${e}`);
        }
      }

      this.increment(sent > 0 ? sent : products.length);
      this.lastBatchCount = products.length;
      this.lastBatchSuccess = true;
      this.lastRunAt = new Date();
      this.nextRunAt = new Date(Date.now() + BATCH_INTERVAL_MS);

      log(`[Scheduler] Batch done: ${products.length} products, ${sent} sent to Telegram`);
    } catch (err) {
      log(`[Scheduler] Batch error: ${err}`);
      this.lastBatchSuccess = false;
      this.lastRunAt = new Date();
      this.nextRunAt = new Date(Date.now() + BATCH_INTERVAL_MS);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

export const scheduler = new Scheduler();
