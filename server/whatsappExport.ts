import fs from "fs";
import path from "path";
import type { WhatsAppRow } from "./sheets";

export interface WhatsAppBatch {
  date: string;
  generatedAt: string;
  rows: WhatsAppRow[];
}

function csvEscape(value: unknown): string {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export function whatsappBatchesToCsv(batches: WhatsAppBatch[]): string {
  const headers = [
    "Date & Time (IST)", "Category", "Product", "Deal Price",
    "Original Price", "Discount", "Rating", "Amazon URL", "WhatsApp Message",
  ];
  const lines = [headers.map(csvEscape).join(",")];

  for (const batch of batches) {
    for (const row of batch.rows) {
      lines.push([
        batch.generatedAt,
        row.category,
        row.productTitle,
        row.price,
        row.originalPrice,
        row.discount,
        row.rating,
        row.productUrl,
        row.message,
      ].map(csvEscape).join(","));
    }
  }

  return `${lines.join("\n")}\n`;
}

/** Save the JSON archive and a spreadsheet-ready CSV without requiring OAuth. */
export function saveWhatsAppBatchFiles(rows: WhatsAppRow[], date: string, generatedAt = new Date().toISOString()): void {
  if (!rows.length) return;

  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const jsonPath = path.join(dataDir, "whatsapp-messages.json");
  const existing: WhatsAppBatch[] = fs.existsSync(jsonPath)
    ? JSON.parse(fs.readFileSync(jsonPath, "utf8"))
    : [];
  const batches = [...existing, { date, generatedAt, rows }].slice(-30);

  fs.writeFileSync(jsonPath, JSON.stringify(batches, null, 2), "utf8");
  fs.writeFileSync(path.join(dataDir, "whatsapp-messages.csv"), whatsappBatchesToCsv(batches), "utf8");
}