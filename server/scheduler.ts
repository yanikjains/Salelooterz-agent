import { discoverProducts, discoverHotDeals, categories } from "./productDiscovery";
import { generateWhatsAppMessageFromDiscovered, generateTelegramMessageFromDiscovered } from "./messageGenerator";
import { sendTelegramMessage } from "./telegram";
import { appendToSheet } from "./sheets";
import { storage } from "./storage";
import { waManager } from "./whatsapp";
import { log } from "./index";

export const ADMIN_USER_ID = "admin-scheduler";

const PRODUCTS_PER_BATCH = 15;
const BATCH_INTERVAL_MS = 20 * 60 * 1000; // every 20 min → 45/hr → ~1080/day

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
  lastBatchSuccess: boolean;
  totalSent: number;
  telegramSent: number;
  whatsappSent: number;
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
  private telegramSent = 0;
  private whatsappSent = 0;
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

  async start(config: SchedulerConfig) {
    if (this.isRunning) { this.config = config; return; }
    this.config = config;
    this.isRunning = true;

    const existing = await storage.getUser(ADMIN_USER_ID);
    if (!existing) await storage.upsertUserWithId(ADMIN_USER_ID, "admin", null);

    log("[Scheduler] Starting — first batch running now...");
    await this.runBatch();

    this.intervalId = setInterval(() => this.runBatch(), BATCH_INTERVAL_MS);
    this.nextRunAt = new Date(Date.now() + BATCH_INTERVAL_MS);
  }

  stop() {
    if (this.intervalId) { clearInterval(this.intervalId); this.intervalId = null; }
    this.isRunning = false;
    this.nextRunAt = null;
    log("[Scheduler] Stopped.");
  }

  updateConfig(config: SchedulerConfig) { this.config = config; }

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
      telegramSent: this.telegramSent,
      whatsappSent: this.whatsappSent,
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
      const products = useHot
        ? await discoverHotDeals(PRODUCTS_PER_BATCH)
        : await discoverProducts(category, PRODUCTS_PER_BATCH);

      if (!products?.length) {
        log("[Scheduler] No products found, skipping");
        this.lastBatchSuccess = false;
        this.lastRunAt = new Date();
        this.nextRunAt = new Date(Date.now() + BATCH_INTERVAL_MS);
        return;
      }

      let tgSent = 0, waSent = 0;

      for (const product of products) {
        const whatsappMessage = generateWhatsAppMessageFromDiscovered(product, affiliateTag);
        const telegramMessage = generateTelegramMessageFromDiscovered(product, affiliateTag);

        // ── Send to Telegram ──
        if (telegramBotToken && telegramChannelId) {
          try {
            const ok = await sendTelegramMessage(telegramBotToken, telegramChannelId, telegramMessage);
            if (ok) { tgSent++; this.telegramSent++; }
          } catch (e) { log(`[Scheduler] Telegram error: ${e}`); }
          await sleep(2000); // Telegram rate limit
        }

        // ── Send to WhatsApp ──
        if (waManager.isConnected()) {
          try {
            const ok = await waManager.sendToChannel(whatsappMessage);
            if (ok) { waSent++; this.whatsappSent++; }
          } catch (e) { log(`[Scheduler] WhatsApp error: ${e}`); }
          await sleep(3000); // WhatsApp rate limit (more conservative)
        }

        // ── Google Sheets ──
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

        // ── Store ──
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
      }

      this.increment(products.length);
      this.lastBatchCount = products.length;
      this.lastBatchSuccess = true;
      this.lastRunAt = new Date();
      this.nextRunAt = new Date(Date.now() + BATCH_INTERVAL_MS);
      log(`[Scheduler] Done: ${products.length} products | TG: ${tgSent} | WA: ${waSent}`);
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
