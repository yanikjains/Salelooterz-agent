import fs from "fs";
import path from "path";
import type { WhatsAppRow } from "./sheets";

export interface WhatsAppBatch {
  date: string;
  generatedAt: string;
  rows: WhatsAppRow[];
}

export interface WhatsAppExportState {
  status: "generating" | "saved" | "failed";
  startedAt: string;
  completedAt?: string;
  date?: string;
  generated?: number;
  reason?: string;
}

function dataDirectory(): string {
  return path.join(process.cwd(), "data");
}

function statePath(): string {
  return path.join(dataDirectory(), "whatsapp-export-state.json");
}

function writeExportState(state: WhatsAppExportState): void {
  const dataDir = dataDirectory();
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(statePath(), JSON.stringify(state, null, 2), "utf8");
}

export function beginWhatsAppBatchAttempt(startedAt = new Date().toISOString()): void {
  writeExportState({ status: "generating", startedAt });
}

export function markWhatsAppBatchFailed(reason: string, generated: number, completedAt = new Date().toISOString()): void {
  const existing = readWhatsAppExportState();
  writeExportState({
    status: "failed",
    startedAt: existing?.startedAt || completedAt,
    completedAt,
    generated,
    reason,
  });
}

export function readWhatsAppExportState(): WhatsAppExportState | null {
  try {
    const raw = fs.readFileSync(statePath(), "utf8");
    return JSON.parse(raw) as WhatsAppExportState;
  } catch {
    return null;
  }
}

function csvEscape(value: unknown): string {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export function whatsappBatchesToCsv(batches: WhatsAppBatch[]): string {
  // Keep this export deliberately simple: Excel opens one complete message per row,
  // ready to copy and paste into a WhatsApp channel.
  const headers = ["WhatsApp Messages"];
  const lines = [headers.map(csvEscape).join(",")];

  for (const batch of batches) {
    for (const row of batch.rows) {
      lines.push(csvEscape(row.message));
    }
  }

  // BOM helps Excel preserve Hindi text, emojis, and other Unicode characters.
  return `\ufeff${lines.join("\r\n")}\r\n`;
}

/** Save the JSON archive and a spreadsheet-ready CSV without requiring OAuth. */
export function saveWhatsAppBatchFiles(rows: WhatsAppRow[], date: string, generatedAt = new Date().toISOString()): void {
  if (!rows.length) return;
  if (rows.length !== 30) {
    throw new Error(`Refusing to save an incomplete WhatsApp batch: ${rows.length}/30 messages.`);
  }

  const dataDir = dataDirectory();
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const jsonPath = path.join(dataDir, "whatsapp-messages.json");
  const existing: WhatsAppBatch[] = fs.existsSync(jsonPath)
    ? JSON.parse(fs.readFileSync(jsonPath, "utf8"))
    : [];
  const batches = [...existing, { date, generatedAt, rows }].slice(-30);

  fs.writeFileSync(jsonPath, JSON.stringify(batches, null, 2), "utf8");
  // The CSV is the daily handoff file: keep only the newest 30-message batch.
  fs.writeFileSync(path.join(dataDir, "whatsapp-messages.csv"), whatsappBatchesToCsv([batches[batches.length - 1]]), "utf8");
  writeExportState({
    status: "saved",
    startedAt: readWhatsAppExportState()?.startedAt || generatedAt,
    completedAt: new Date().toISOString(),
    date,
    generated: rows.length,
  });
}

/** Push a batch to the user's Google Apps Script web app, without OAuth. */
export async function pushWhatsAppBatchToAppsScript(
  appsScriptUrl: string,
  rows: WhatsAppRow[],
  date: string,
  secret?: string,
  generatedAt = new Date().toISOString(),
): Promise<void> {
  const response = await fetch(appsScriptUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret: secret || "", date, generatedAt, rows }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`Apps Script returned HTTP ${response.status}`);
  }
}