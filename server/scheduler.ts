import { discoverProducts, discoverPremiumProducts, discoverHotDeals, categories, categorySearchTerms, premiumWhatsAppSearchTerms } from "./productDiscovery";
import { getAmazonBlockReason, isAmazonTemporarilyBlocked } from "./scraper";
import { generateTelegramMessageFromDiscovered, generateWhatsAppMessageFromDiscovered, generatePersonalizedWhatsAppMessage, isAmazingWhatsAppDeal } from "./messageGenerator";
import { sendTelegramMessage } from "./telegram";
import { appendToSheet, appendWhatsAppBatchToSheet, type WhatsAppRow } from "./sheets";
import { storage } from "./storage";
import { wasRecentlyPosted, wasTitlePosted, markAsPosted, markTitleAsPosted, normalizeTitle, getTotalMemoryCount } from "./asinMemory";
import { log } from "./index";
import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import {
  saveWhatsAppBatchFiles,
  pushWhatsAppBatchToAppsScript,
  beginWhatsAppBatchAttempt,
  markWhatsAppBatchFailed,
} from "./whatsappExport";

export const ADMIN_USER_ID = "admin-scheduler";

// Telegram: 150 products per batch, twice daily (10 AM IST + 7 PM IST)
const PRODUCTS_PER_BATCH   = 150;
const TG_SEND_DELAY_MS     = 800;   // 800ms between sends (~2 min for 150 msgs)

// WhatsApp: exactly 30 messages generated automatically once per day
const WHATSAPP_BATCH_SIZE  = 30;
const WA_DATE_FILE         = "./whatsapp-last-batch-date.txt";

const SCHEDULER_CONFIG_FILE = "./scheduler-config.json";

export interface SchedulerConfig {
  affiliateTag: string;
  telegramBotToken?: string;
  telegramChannelId?: string;
  spreadsheetId?: string;
  googleAppsScriptUrl?: string;
  googleAppsScriptSecret?: string;
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

export interface WhatsAppBatchResult {
  generated: number;
  saved: boolean;
  reason?: string;
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
  private whatsappBatchInProgress = false;

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

    log("[Scheduler] Started — Telegram batches scheduled for 10:00 AM and 7:00 PM IST.");
    this.scheduleNextTelegramBatch();

    // Daily notepad batch at 3:00 PM IST (30 messages)
    await this.scheduleWhatsAppBatch();
  }

  private async scheduleWhatsAppBatch() {
    const lastDate = await this.waLastDate();
    const today    = this.todayIST();

    // Never run immediately on startup — always wait for 3:00 PM IST
    if (lastDate === today) {
      log("[Scheduler] Notepad batch already done today — next one at 3:00 PM IST tomorrow.");
    }

    // Schedule next batch at 3:00 PM IST
    const msTo3PM = this.msUntilISTTime(15, 0);
    log(`[Scheduler] Next notepad batch in ${Math.round(msTo3PM / 60000)} min (3:00 PM IST)`);
    if (this.waIntervalId) clearTimeout(this.waIntervalId);
    this.waIntervalId = setTimeout(async () => {
      await this.runWhatsAppBatch();
      // Recalculate from the next fixed IST target so batch duration never drifts the schedule.
      await this.scheduleWhatsAppBatch();
    }, msTo3PM) as unknown as NodeJS.Timeout;
  }

  public async runWhatsAppBatch(): Promise<WhatsAppBatchResult> {
    if (this.whatsappBatchInProgress) {
      return {
        generated: 0,
        saved: false,
        reason: "A WhatsApp batch is already being generated. Wait for it to finish before starting another one.",
      };
    }

    this.whatsappBatchInProgress = true;
    beginWhatsAppBatchAttempt();
    try {
      const result = await this.runWhatsAppBatchInternal();
      if (!result.saved) markWhatsAppBatchFailed(result.reason || "No complete batch was saved.", result.generated);
      return result;
    } catch (error) {
      const reason = error instanceof Error ? error.message : "WhatsApp batch generation failed.";
      markWhatsAppBatchFailed(reason, 0);
      throw error;
    } finally {
      this.whatsappBatchInProgress = false;
    }
  }

  private async runWhatsAppBatchInternal(): Promise<WhatsAppBatchResult> {
    if (!this.config) {
      return { generated: 0, saved: false, reason: "Scheduler is not configured." };
    }
    const batchStartedAt = new Date();
    const generatedAt = batchStartedAt.toISOString();
    const {
      affiliateTag,
      spreadsheetId: configSheetId,
      googleAppsScriptUrl,
      googleAppsScriptSecret,
    } = this.config;
    const user = await storage.getUser(ADMIN_USER_ID).catch(() => null);
    const spreadsheetId = configSheetId || user?.spreadsheetId || null;

    // Thirty focused categories. Every category gets a chance to contribute
    // one deal before any category can contribute a second deal.
    const allGroups = Object.keys(premiumWhatsAppSearchTerms);
    const representedCategories = new Set<string>();
    log(`[Scheduler] Running daily WhatsApp batch at ${batchStartedAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST (MRP > ₹2,000, ≥60% off, rating ≥4, reviews ≥100) — target ${WHATSAPP_BATCH_SIZE}...`);

    const sheetRows: WhatsAppRow[] = [];
    const pendingRecords: { asin?: string; info: Parameters<typeof markAsPosted>[1] }[] = [];
    const seenInBatch = new Set<string>();

    // Search multiple rounds. A fixed three-per-category cap caused partial
    // batches whenever Amazon returned blocked, duplicate, or filtered results.
    rounds:
    for (let round = 1; round <= 3 && sheetRows.length < WHATSAPP_BATCH_SIZE; round++) {
      for (const cat of allGroups) {
        if (sheetRows.length >= WHATSAPP_BATCH_SIZE) break;
        try {
          const raw = await discoverPremiumProducts(cat, 15);
          let acceptedForCategory = 0;
          for (const product of raw) {
            if (sheetRows.length >= WHATSAPP_BATCH_SIZE) break;

          // Real-values guard: must have a title and a non-zero deal price
          if (!product.title || product.title.trim().length < 5) continue;
          const dealPriceNum = parseFloat(String(product.price || "").replace(/[₹,\s]/g, "").replace(/[^0-9.]/g, "")) || 0;
          if (dealPriceNum <= 0) continue;

          // Require original price (MRP) ≥ ₹3,000 — no cheap products on notepad
          const origPriceStr = (product as any).originalPrice || product.price || "";
          const origPriceNum = parseInt(origPriceStr.replace(/[₹,\s]/g, '').replace(/[^0-9]/g, '')) || 0;
           if (origPriceNum <= 2000) continue;

           // Only proven, popular products with a real calculated 60%+ saving.
           if (!isAmazingWhatsAppDeal(product)) continue;
           if (representedCategories.size < allGroups.length && representedCategories.has(cat)) continue;

           const asinKey = product.asin ? `asin:${product.asin}` : "";
           const titleKey = `title:${normalizeTitle(product.title)}`;
           // A different ASIN can still be the same product family/variant.
           // Reject either identity match within the current batch.
           if ((asinKey && seenInBatch.has(asinKey)) || seenInBatch.has(titleKey)) continue;
           if (product.asin && await wasRecentlyPosted(product.asin)) continue;
           if (await wasTitlePosted(product.title)) continue;
           if (asinKey) seenInBatch.add(asinKey);
           seenInBatch.add(titleKey);
           representedCategories.add(cat);

           const scrapedAt = product.scrapedAt ? new Date(product.scrapedAt) : new Date();
           const whatsappMessage = generatePersonalizedWhatsAppMessage(product, affiliateTag, cat, scrapedAt);

           const discountStr = (product as any).discount || "";
           sheetRows.push({
            category: cat,
            productTitle: product.title,
            price: product.price,
            originalPrice: (product as any).originalPrice || "",
            discount: discountStr,
            rating: product.rating > 0 ? `${product.rating}/5` : "",
            productUrl: `${product.url}?tag=${affiliateTag}`,
            message: whatsappMessage,
             scrapedAt: scrapedAt.toISOString(),
          });

          const pInfo = { title: product.title, price: product.price, originalPrice: (product as any).originalPrice || "", discount: discountStr, rating: product.rating, category: cat, url: product.url };
          pendingRecords.push({ asin: product.asin || undefined, info: pInfo });
          acceptedForCategory++;
        }
          log(`[Scheduler] WhatsApp round ${round}, group "${cat}": ${acceptedForCategory} products`);
          await sleep(1500);
         } catch {
           if (isAmazonTemporarilyBlocked()) {
             log(`[Scheduler] Stopping WhatsApp scrape early: ${getAmazonBlockReason()}`);
             break rounds;
           }
           continue;
         }
         if (isAmazonTemporarilyBlocked()) {
           log(`[Scheduler] Stopping WhatsApp scrape early: ${getAmazonBlockReason()}`);
           break rounds;
         }
      }
    }

     const generated = sheetRows.length;
     if (generated !== WHATSAPP_BATCH_SIZE) {
       log(`[Scheduler] WhatsApp batch not saved: found ${generated}/${WHATSAPP_BATCH_SIZE} qualified live products.`);
        return {
          generated,
          saved: false,
          reason: `Only ${generated} fresh qualified products were found. Nothing was exported.`,
        };
     }

     // Always save a local archive and spreadsheet-ready CSV first.
     let localSaved = false;
     if (sheetRows.length) {
       try {
         saveWhatsAppBatchFiles(sheetRows, this.todayIST(), generatedAt);
         localSaved = true;
         log(`[Scheduler] WhatsApp: local JSON + CSV backup saved`);
       } catch (err) {
         log(`[Scheduler] WhatsApp local backup failed: ${err}`);
       }
     }

     // Optional no-OAuth Google Sheets path: POST to the user's Apps Script web app.
     let appsScriptSaved = false;
     if (sheetRows.length && googleAppsScriptUrl) {
       try {
         await pushWhatsAppBatchToAppsScript(
           googleAppsScriptUrl,
           sheetRows,
           this.todayIST(),
           googleAppsScriptSecret,
           generatedAt,
         );
         appsScriptSaved = true;
         log(`[Scheduler] WhatsApp: ${sheetRows.length} messages pushed to Apps Script`);
       } catch (err) {
         log(`[Scheduler] Apps Script push failed: ${err}`);
       }
     }

     // Write all messages to Google Sheets (date-organised tab)
     let sheetSaved = false;
    if (sheetRows.length && spreadsheetId) {
      try {
         await appendWhatsAppBatchToSheet(spreadsheetId, sheetRows, generatedAt);
         sheetSaved = true;
        log(`[Scheduler] WhatsApp: ${sheetRows.length} messages exported to Google Sheets`);
      } catch (err) {
        log(`[Scheduler] WhatsApp Sheets export failed: ${err}`);
      }
     } else if (!spreadsheetId && !googleAppsScriptUrl) {
       log(`[Scheduler] WhatsApp: no Google Sheets export configured — local backup only`);
    }

     const requiredExports = [
       spreadsheetId ? sheetSaved : null,
       googleAppsScriptUrl ? appsScriptSaved : null,
     ].filter((value): value is boolean => value !== null);
     const deliverySucceeded = requiredExports.length
       ? requiredExports.every(Boolean)
       : localSaved;
     if (!deliverySucceeded) {
       log(`[Scheduler] WhatsApp batch not marked as posted because the required export failed.`);
        return {
          generated,
          saved: false,
          reason: "The complete batch was found, but the configured export failed.",
        };
     }

     // Mark products only after the complete 30-message batch is saved/exported.
     for (const record of pendingRecords) {
        if (record.asin) await markAsPosted(record.asin, record.info);
        // Keep both identities in memory so ASIN variants and repeated search
        // results cannot be posted again during the next 90 days.
        await markTitleAsPosted(record.info);
     }

    this.waDailyCount = generated;
    await this.saveWaDate(this.todayIST());
    log(`[Scheduler] WhatsApp premium batch done: ${generated} messages → Sheets`);
     return { generated, saved: true };
  }

  /** ms until the next occurrence of a given IST hour:minute */
  private msUntilISTTime(hour: number, minute = 0): number {
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const DAY_MS = 24 * 60 * 60 * 1000;
    const istNow = Date.now() + IST_OFFSET_MS;
    const istDayStart = Math.floor(istNow / DAY_MS) * DAY_MS;
    let target = istDayStart + (hour * 60 + minute) * 60 * 1000;
    if (target <= istNow) target += DAY_MS;
    return target - istNow;
  }

  private scheduleNextTelegramBatch() {
    // Two daily slots: 10:00 AM IST and 7:00 PM IST
    const msTo10AM = this.msUntilISTTime(10, 0);
    const msTo7PM  = this.msUntilISTTime(19, 0);
    // Pick whichever is sooner
    const msNext = Math.min(msTo10AM, msTo7PM);
    const label  = msNext === msTo10AM ? "10:00 AM IST" : "7:00 PM IST";
    this.nextRunAt = new Date(Date.now() + msNext);
    log(`[Scheduler] Next Telegram batch in ${Math.round(msNext / 60000)} min (${label})`);
    if (this.intervalId) clearTimeout(this.intervalId as unknown as NodeJS.Timeout);
    this.intervalId = setTimeout(async () => {
      await this.runBatch();
      this.scheduleNextTelegramBatch();
    }, msNext) as unknown as NodeJS.Timeout;
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
    const {
      affiliateTag,
      telegramBotToken,
      telegramChannelId,
      googleAppsScriptUrl,
    } = this.config;
    const spreadsheetId = googleAppsScriptUrl ? undefined : this.config.spreadsheetId;

    if (!telegramBotToken || !telegramChannelId) {
      log("[Scheduler] Telegram batch skipped: bot token or channel ID is not configured.");
      this.lastBatchCount = 0;
      this.lastBatchSkipped = PRODUCTS_PER_BATCH;
      this.lastBatchSuccess = false;
      this.lastRunAt = new Date();
      return;
    }

    log(`[Scheduler] Starting Telegram batch — collecting up to ${PRODUCTS_PER_BATCH} products...`);

    const collectedProducts: any[] = [];
    // Dual-key dedup: exact ASIN  +  normalised title prefix (catches variants with same title)
    const seenInBatch = new Set<string>();
    let totalSkipped = 0;

    const normTitle = (t: string) =>
      t.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 55);

    // ── Fixed quotas across all focused categories ────────────────────────────
    // 30 categories × 5 products = exactly 150 per scheduled batch.
    const allCategoryIds = Object.keys(premiumWhatsAppSearchTerms);
    const quotaPerCat = PRODUCTS_PER_BATCH / allCategoryIds.length;

    for (const cat of allCategoryIds) {
      const catTarget = Math.min(quotaPerCat, PRODUCTS_PER_BATCH - collectedProducts.length);
      if (catTarget <= 0) break;

      let catCollected = 0;
      // Try up to 3 different search terms for this category
      for (let attempt = 0; attempt < 3 && catCollected < catTarget; attempt++) {
        const fetchCount = catTarget - catCollected + 5;
        log(`[Scheduler] Scraping "${cat}" (attempt ${attempt + 1}) — need ${catTarget - catCollected} more`);
        try {
          const rawProducts = await discoverPremiumProducts(cat, fetchCount);

          for (const p of (rawProducts || [])) {
            if (catCollected >= catTarget) break;

            // ── Real-values guard: skip products with missing/zero price, no title, or no rating ──
            if (!p.title || p.title.trim().length < 5) { totalSkipped++; continue; }
            const priceNum = parseFloat(String(p.price || "").replace(/[₹,\s]/g, "").replace(/[^0-9.]/g, "")) || 0;
            if (priceNum <= 0) { totalSkipped++; continue; }
            const ratingNum = typeof p.rating === "number" ? p.rating : parseFloat(String(p.rating || "0"));
            if (ratingNum <= 0) { totalSkipped++; continue; }

            // ASIN key
            const asinKey = p.asin ? `asin:${p.asin}` : null;
            // Normalised-title key (catches same-product variants)
            const titleKey = `t:${normTitle(p.title)}`;
            if ((asinKey && seenInBatch.has(asinKey)) || seenInBatch.has(titleKey)) {
              totalSkipped++; continue;
            }
            if (p.asin) {
              if (await wasRecentlyPosted(p.asin)) { totalSkipped++; continue; }
            } else {
              if (await wasTitlePosted(p.title)) { totalSkipped++; continue; }
            }
            if (asinKey) seenInBatch.add(asinKey);
            seenInBatch.add(titleKey);
            collectedProducts.push(p);
            catCollected++;
          }
          if (catCollected < catTarget) await sleep(900);
        } catch (err) {
          log(`[Scheduler] Scrape error for "${cat}": ${err}`);
        }
      }
      log(`[Scheduler] "${cat}" → ${catCollected} products (quota ${catTarget})`);
    }

    log(`[Scheduler] Collection done: ${collectedProducts.length} products, ${totalSkipped} dupes skipped`);

    if (collectedProducts.length !== PRODUCTS_PER_BATCH) {
      log(`[Scheduler] Telegram batch not sent: found ${collectedProducts.length}/${PRODUCTS_PER_BATCH} verified products.`);
      this.lastBatchCount = 0;
      this.lastBatchSkipped = totalSkipped + (PRODUCTS_PER_BATCH - collectedProducts.length);
      this.lastBatchSuccess = false;
      this.lastRunAt = new Date();
      return;
    }

    log(`[Scheduler] Sending ${collectedProducts.length} messages to Telegram...`);
    let tgSent = 0;
    const sentProducts: any[] = [];

    const markSentProducts = async () => {
      for (const product of sentProducts) {
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
        else await markTitleAsPosted(productInfo);
      }
    };

    // ── Test Sheets connectivity ONCE before the loop ─────────────────────────
    // If the connector isn't set up, skip all per-product writes silently
    // instead of logging 300 identical errors.
    let sheetsEnabled = false;
    if (spreadsheetId) {
      try {
        await appendToSheet(spreadsheetId, {
          timestamp: new Date().toISOString(),
          productTitle: "__ connectivity check __",
          price: "", rating: "", productUrl: "", whatsappMessage: "", telegramMessage: "", affiliateTag: "",
        });
        sheetsEnabled = true;
      } catch (e) {
        const msg = String(e);
        if (msg.includes("connector not configured") || msg.includes("REPLIT_CONNECTORS")) {
          log("[Scheduler] Google Sheets connector not set up — Sheets logging disabled for this batch");
        } else {
          log(`[Scheduler] Sheets connectivity check failed: ${e}`);
        }
      }
    }

    for (const product of collectedProducts) {
      const telegramMessage = generateTelegramMessageFromDiscovered(product, affiliateTag);
      const whatsappMessage = generateWhatsAppMessageFromDiscovered(product, affiliateTag);

      // Send to Telegram
      if (telegramBotToken && telegramChannelId) {
        try {
          const ok = await sendTelegramMessage(telegramBotToken, telegramChannelId, telegramMessage);
          if (ok) {
            tgSent++;
            this.telegramSent++;
            sentProducts.push(product);
          } else {
            log(`[Scheduler] Telegram send failed after retries; stopping this batch at ${tgSent}/${PRODUCTS_PER_BATCH}.`);
            break;
          }
        } catch (e) {
          log(`[Scheduler] Telegram error: ${e}`);
          break;
        }
        await sleep(TG_SEND_DELAY_MS);
      }

      // Google Sheets — only if connector is confirmed working
      if (sheetsEnabled) {
        try {
          await appendToSheet(spreadsheetId!, {
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

    }

    if (tgSent !== PRODUCTS_PER_BATCH) {
      await markSentProducts();
      this.memoryCount = await getTotalMemoryCount();
      this.lastBatchCount = tgSent;
      this.lastBatchSkipped = totalSkipped + (PRODUCTS_PER_BATCH - tgSent);
      this.lastBatchSuccess = false;
      this.lastRunAt = new Date();
      log(`[Scheduler] Telegram batch incomplete: ${tgSent}/${PRODUCTS_PER_BATCH} messages sent.`);
      return;
    }

    await markSentProducts();
    this.memoryCount = await getTotalMemoryCount();
    this.increment(tgSent);
    this.lastBatchCount = tgSent;
    this.lastBatchSkipped = totalSkipped;
    this.lastBatchSuccess = true;
    this.lastRunAt = new Date();
    log(`[Scheduler] Batch complete: ${collectedProducts.length} processed | TG sent: ${tgSent} | Memory: ${this.memoryCount} ASINs`);
  }
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

export const scheduler = new Scheduler();
