/**
 * ASIN Memory — persistent deduplication layer (file-based)
 *
 * Stores every Amazon ASIN ever posted in a local JSON file.
 * A product is blocked for 6 months (180 days) after last posting.
 * After 6 months it's allowed again with fresh scraped info.
 *
 * Persists across server restarts. File: ./asin-memory.json
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { log } from "./index";

const MEMORY_FILE = "./asin-memory.json";
const REPOST_AFTER_DAYS = 180;

interface AsinRecord {
  title: string;
  firstSeenAt: string;  // ISO
  lastSeenAt: string;   // ISO
  timesPosted: number;
}

type AsinStore = Record<string, AsinRecord>;

let store: AsinStore = {};
let dirty = false;
let saveTimer: NodeJS.Timeout | null = null;

/** Load memory from disk on boot */
export async function initAsinMemory(): Promise<void> {
  try {
    if (existsSync(MEMORY_FILE)) {
      const raw = await readFile(MEMORY_FILE, "utf-8");
      store = JSON.parse(raw) as AsinStore;
      log(`[AsinMemory] Loaded ${Object.keys(store).length} ASINs from disk`);
    } else {
      store = {};
      log("[AsinMemory] Starting fresh — no memory file yet");
    }
  } catch (err) {
    store = {};
    log(`[AsinMemory] Could not read memory file, starting fresh: ${err}`);
  }
}

/** Flush to disk (debounced — max one write per 5 seconds) */
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
      log(`[AsinMemory] Save error: ${err}`);
    }
  }, 5000);
}

/**
 * Returns true if this ASIN was posted within the last 6 months.
 * Returns false if new or last posted more than 6 months ago.
 */
export async function wasRecentlyPosted(asin: string): Promise<boolean> {
  const record = store[asin];
  if (!record) return false;
  const daysSince = (Date.now() - new Date(record.lastSeenAt).getTime()) / (1000 * 60 * 60 * 24);
  return daysSince < REPOST_AFTER_DAYS;
}

/**
 * Records that we just posted this ASIN.
 * Updates in-memory store and schedules a disk flush.
 */
export async function markAsPosted(asin: string, title: string): Promise<void> {
  const now = new Date().toISOString();
  const existing = store[asin];
  store[asin] = {
    title,
    firstSeenAt: existing?.firstSeenAt ?? now,
    lastSeenAt: now,
    timesPosted: (existing?.timesPosted ?? 0) + 1,
  };
  scheduleSave();
}

/** Total unique ASINs ever recorded */
export async function getTotalMemoryCount(): Promise<number> {
  return Object.keys(store).length;
}
