/**
 * ASIN + Title Memory — permanent deduplication layer with full product details
 *
 * Stores every product ever posted with its full details (price, discount, rating, etc).
 * Once a product is posted it is NEVER posted again.
 * Persists across server restarts via local JSON files.
 */

import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { log } from "./index";

const MEMORY_FILE = "./asin-memory.json";
const TITLE_MEMORY_FILE = "./title-memory.json";

export interface ProductRecord {
  title: string;
  price: string;
  originalPrice: string;
  discount: string;
  discountPct: number;       // parsed numeric %, 0 if unknown
  rating: number;
  category: string;
  url: string;
  firstSeenAt: string;
  timesPosted: number;
}

type AsinStore  = Record<string, ProductRecord>;
type TitleStore = Record<string, ProductRecord>;

let store:      AsinStore  = {};
let titleStore: TitleStore = {};

let dirty      = false;
let titleDirty = false;
let saveTimer:      NodeJS.Timeout | null = null;
let titleSaveTimer: NodeJS.Timeout | null = null;

export function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 120);
}

/** Parse "30% OFF" → 30, "" → 0 */
export function parseDiscountPct(discount: string): number {
  const m = discount.match(/(\d+(\.\d+)?)/);
  return m ? Math.round(parseFloat(m[1])) : 0;
}

/** Load both memories from disk on boot */
export async function initAsinMemory(): Promise<void> {
  try {
    if (existsSync(MEMORY_FILE)) {
      const raw = await readFile(MEMORY_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      // migrate old format (title/firstSeenAt/timesPosted only)
      for (const [k, v] of Object.entries(parsed as Record<string, any>)) {
        store[k] = {
          title:        v.title        ?? "",
          price:        v.price        ?? "",
          originalPrice:v.originalPrice?? "",
          discount:     v.discount     ?? "",
          discountPct:  v.discountPct  ?? parseDiscountPct(v.discount ?? ""),
          rating:       v.rating       ?? 0,
          category:     v.category     ?? "",
          url:          v.url          ?? "",
          firstSeenAt:  v.firstSeenAt  ?? new Date().toISOString(),
          timesPosted:  v.timesPosted  ?? 1,
        };
      }
      log(`[AsinMemory] Loaded ${Object.keys(store).length} ASINs from disk`);
    }
  } catch (err) {
    store = {};
    log(`[AsinMemory] Could not read ASIN memory, starting fresh: ${err}`);
  }

  try {
    if (existsSync(TITLE_MEMORY_FILE)) {
      const raw = await readFile(TITLE_MEMORY_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      // migrate old format (array of strings)
      if (Array.isArray(parsed)) {
        for (const t of parsed as string[]) {
          titleStore[t] = { title: t, price: "", originalPrice: "", discount: "", discountPct: 0, rating: 0, category: "", url: "", firstSeenAt: new Date().toISOString(), timesPosted: 1 };
        }
      } else {
        titleStore = parsed as TitleStore;
      }
      log(`[AsinMemory] Loaded ${Object.keys(titleStore).length} titles from disk`);
    }
  } catch (err) {
    titleStore = {};
    log(`[AsinMemory] Could not read title memory, starting fresh: ${err}`);
  }
}

function scheduleSave() {
  dirty = true;
  if (saveTimer) return;
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    if (!dirty) return;
    dirty = false;
    try { await writeFile(MEMORY_FILE, JSON.stringify(store, null, 2), "utf-8"); }
    catch (err) { log(`[AsinMemory] ASIN save error: ${err}`); }
  }, 5000);
}

function scheduleTitleSave() {
  titleDirty = true;
  if (titleSaveTimer) return;
  titleSaveTimer = setTimeout(async () => {
    titleSaveTimer = null;
    if (!titleDirty) return;
    titleDirty = false;
    try { await writeFile(TITLE_MEMORY_FILE, JSON.stringify(titleStore, null, 2), "utf-8"); }
    catch (err) { log(`[AsinMemory] Title save error: ${err}`); }
  }, 5000);
}

export async function wasRecentlyPosted(asin: string): Promise<boolean> {
  return !!store[asin];
}

export async function wasTitlePosted(title: string): Promise<boolean> {
  return !!titleStore[normalizeTitle(title)];
}

export interface ProductInfo {
  title:         string;
  price:         string;
  originalPrice: string;
  discount:      string;
  rating:        number;
  category:      string;
  url:           string;
}

export async function markAsPosted(asin: string, product: ProductInfo): Promise<void> {
  const now = new Date().toISOString();
  const existing = store[asin];
  store[asin] = {
    title:         product.title,
    price:         product.price,
    originalPrice: product.originalPrice,
    discount:      product.discount,
    discountPct:   parseDiscountPct(product.discount),
    rating:        product.rating,
    category:      product.category,
    url:           product.url,
    firstSeenAt:   existing?.firstSeenAt ?? now,
    timesPosted:   (existing?.timesPosted ?? 0) + 1,
  };
  scheduleSave();
}

export async function markTitleAsPosted(product: ProductInfo): Promise<void> {
  const key = normalizeTitle(product.title);
  const now = new Date().toISOString();
  const existing = titleStore[key];
  titleStore[key] = {
    title:         product.title,
    price:         product.price,
    originalPrice: product.originalPrice,
    discount:      product.discount,
    discountPct:   parseDiscountPct(product.discount),
    rating:        product.rating,
    category:      product.category,
    url:           product.url,
    firstSeenAt:   existing?.firstSeenAt ?? now,
    timesPosted:   (existing?.timesPosted ?? 0) + 1,
  };
  scheduleTitleSave();
}

/** Returns aggregated stats across ALL ever-scraped products */
export async function getMemoryStats(): Promise<{
  totalProducts: number;
  avgDiscountPct: number;
  maxDiscountPct: number;
  minDiscountPct: number;
  avgRating: number;
  categoryBreakdown: Record<string, number>;
  topDiscountProducts: Array<{ title: string; discount: string; price: string; category: string }>;
}> {
  const all: ProductRecord[] = [
    ...Object.values(store),
    ...Object.values(titleStore),
  ];

  const withDiscount = all.filter(p => p.discountPct > 0);
  const withRating   = all.filter(p => p.rating > 0);

  const avgDiscountPct = withDiscount.length
    ? Math.round(withDiscount.reduce((s, p) => s + p.discountPct, 0) / withDiscount.length)
    : 0;
  const maxDiscountPct = withDiscount.length ? Math.max(...withDiscount.map(p => p.discountPct)) : 0;
  const minDiscountPct = withDiscount.length ? Math.min(...withDiscount.map(p => p.discountPct)) : 0;
  const avgRating      = withRating.length
    ? Math.round((withRating.reduce((s, p) => s + p.rating, 0) / withRating.length) * 10) / 10
    : 0;

  const categoryBreakdown: Record<string, number> = {};
  for (const p of all) {
    const cat = p.category || "unknown";
    categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
  }

  const topDiscountProducts = withDiscount
    .sort((a, b) => b.discountPct - a.discountPct)
    .slice(0, 5)
    .map(p => ({ title: p.title.slice(0, 60), discount: p.discount, price: p.price, category: p.category }));

  return { totalProducts: all.length, avgDiscountPct, maxDiscountPct, minDiscountPct, avgRating, categoryBreakdown, topDiscountProducts };
}

export async function getTotalMemoryCount(): Promise<number> {
  return Object.keys(store).length + Object.keys(titleStore).length;
}
