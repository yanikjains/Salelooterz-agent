/**
 * ASIN + Title Memory — permanent deduplication layer (file-based)
 *
 * Once a product is posted (by ASIN or by title), it is NEVER posted again.
 * Both stores persist across server restarts via local JSON files.
 */

import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { log } from "./index";

const MEMORY_FILE = "./asin-memory.json";
const TITLE_MEMORY_FILE = "./title-memory.json";

interface AsinRecord {
  title: string;
  firstSeenAt: string;
  timesPosted: number;
}

type AsinStore = Record<string, AsinRecord>;

let store: AsinStore = {};
let titleStore: Set<string> = new Set();

let dirty = false;
let titleDirty = false;
let saveTimer: NodeJS.Timeout | null = null;
let titleSaveTimer: NodeJS.Timeout | null = null;

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 120);
}

/** Load both memories from disk on boot */
export async function initAsinMemory(): Promise<void> {
  try {
    if (existsSync(MEMORY_FILE)) {
      const raw = await readFile(MEMORY_FILE, "utf-8");
      store = JSON.parse(raw) as AsinStore;
      log(`[AsinMemory] Loaded ${Object.keys(store).length} ASINs from disk`);
    } else {
      store = {};
    }
  } catch (err) {
    store = {};
    log(`[AsinMemory] Could not read ASIN memory, starting fresh: ${err}`);
  }

  try {
    if (existsSync(TITLE_MEMORY_FILE)) {
      const raw = await readFile(TITLE_MEMORY_FILE, "utf-8");
      const arr = JSON.parse(raw) as string[];
      titleStore = new Set(arr);
      log(`[AsinMemory] Loaded ${titleStore.size} titles from disk`);
    } else {
      titleStore = new Set();
    }
  } catch (err) {
    titleStore = new Set();
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
    try {
      await writeFile(MEMORY_FILE, JSON.stringify(store, null, 2), "utf-8");
    } catch (err) {
      log(`[AsinMemory] ASIN save error: ${err}`);
    }
  }, 5000);
}

function scheduleTitleSave() {
  titleDirty = true;
  if (titleSaveTimer) return;
  titleSaveTimer = setTimeout(async () => {
    titleSaveTimer = null;
    if (!titleDirty) return;
    titleDirty = false;
    try {
      await writeFile(TITLE_MEMORY_FILE, JSON.stringify([...titleStore], null, 2), "utf-8");
    } catch (err) {
      log(`[AsinMemory] Title save error: ${err}`);
    }
  }, 5000);
}

/**
 * Returns true if this ASIN was ever posted before (permanent block).
 */
export async function wasRecentlyPosted(asin: string): Promise<boolean> {
  return !!store[asin];
}

/**
 * Returns true if a product with this title was ever posted before (permanent block).
 * Used for products that have no ASIN.
 */
export async function wasTitlePosted(title: string): Promise<boolean> {
  return titleStore.has(normalizeTitle(title));
}

/**
 * Records that we just posted this ASIN — permanently blocks it.
 */
export async function markAsPosted(asin: string, title: string): Promise<void> {
  const now = new Date().toISOString();
  const existing = store[asin];
  store[asin] = {
    title,
    firstSeenAt: existing?.firstSeenAt ?? now,
    timesPosted: (existing?.timesPosted ?? 0) + 1,
  };
  scheduleSave();
}

/**
 * Records a product by title — permanently blocks it.
 * Used for products without an ASIN.
 */
export async function markTitleAsPosted(title: string): Promise<void> {
  titleStore.add(normalizeTitle(title));
  scheduleTitleSave();
}

/** Total unique products ever recorded (ASINs + titles) */
export async function getTotalMemoryCount(): Promise<number> {
  return Object.keys(store).length + titleStore.size;
}
