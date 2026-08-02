/*
 * SaleLooterz → Google Sheets sync
 *
 * One-time setup:
 * 1. Open your Google Sheet.
 * 2. Go to Extensions → Apps Script.
 * 3. Paste this file into Code.gs.
 * 4. Replace APP_URL below with your published Replit app URL.
 * 5. Run setup() once and approve Google's permission request.
 *
 * The script reads the bot's local WhatsApp archive through:
 * /api/admin/whatsapp-messages
 */

const CONFIG = {
  APP_URL: "PASTE_YOUR_PUBLISHED_REPLIT_URL_HERE",
  SHEET_NAME: "WhatsApp Messages",
  TIME_ZONE: "Asia/Kolkata",
};

const HEADERS = [
  "Date & Time (IST)",
  "Category",
  "Product",
  "Deal Price",
  "Original Price",
  "Discount",
  "Rating",
  "Amazon URL",
  "WhatsApp Message",
];

/**
 * Run this once after pasting the script.
 * It creates the tab and a daily 3:15 PM IST trigger.
 */
function setup() {
  validateConfig_();
  const sheet = getOrCreateSheet_();
  ensureHeaders_(sheet);

  ScriptApp.getProjectTriggers()
    .filter(trigger => trigger.getHandlerFunction() === "syncWhatsAppDeals")
    .forEach(trigger => ScriptApp.deleteTrigger(trigger));

  ScriptApp.newTrigger("syncWhatsAppDeals")
    .timeBased()
    .atHour(15)
    .nearMinute(15)
    .everyDays(1)
    .create();

  syncWhatsAppDeals();
}

/**
 * Sync new WhatsApp deals into the sheet.
 * This can also be run manually at any time.
 */
function syncWhatsAppDeals() {
  validateConfig_();
  const sheet = getOrCreateSheet_();
  ensureHeaders_(sheet);

  const response = UrlFetchApp.fetch(
    CONFIG.APP_URL.replace(/\/+$/, "") + "/api/admin/whatsapp-messages",
    { muteHttpExceptions: true, followRedirects: true }
  );

  if (response.getResponseCode() !== 200) {
    throw new Error(
      "SaleLooterz returned HTTP " +
      response.getResponseCode() +
      ": " +
      response.getContentText().slice(0, 300)
    );
  }

  const payload = JSON.parse(response.getContentText());
  const batches = payload.batches || [];
  const existingKeys = getExistingKeys_(sheet);
  const newRows = [];

  batches.forEach(batch => {
    (batch.rows || []).forEach(row => {
      // Amazon URL is stable, so it is used to prevent duplicate imports.
      const key = String(row.productUrl || row.productTitle || "").trim();
      if (!key || existingKeys.has(key)) return;

      newRows.push([
        formatIst_(batch.generatedAt, batch.date),
        row.category || "",
        row.productTitle || "",
        row.price || "",
        row.originalPrice || "",
        row.discount || "",
        row.rating || "",
        row.productUrl || "",
        row.message || "",
      ]);
      existingKeys.add(key);
    });
  });

  if (newRows.length) {
    sheet
      .getRange(sheet.getLastRow() + 1, 1, newRows.length, HEADERS.length)
      .setValues(newRows);
    sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 1), 1)
      .setNumberFormat("dd mmm yyyy hh:mm:ss");
  }

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, HEADERS.length);
  Logger.log("SaleLooterz sync complete: " + newRows.length + " new deals");
}

function getOrCreateSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  return spreadsheet.getSheetByName(CONFIG.SHEET_NAME) ||
    spreadsheet.insertSheet(CONFIG.SHEET_NAME);
}

function ensureHeaders_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.getRange(1, 1, 1, HEADERS.length)
      .setFontWeight("bold")
      .setBackground("#0f172a")
      .setFontColor("#ffffff");
  }
}

function getExistingKeys_(sheet) {
  const keys = new Set();
  if (sheet.getLastRow() < 2) return keys;

  // Amazon URL is column 8.
  sheet.getRange(2, 8, sheet.getLastRow() - 1, 1)
    .getValues()
    .forEach(row => {
      const key = String(row[0] || "").trim();
      if (key) keys.add(key);
    });
  return keys;
}

function formatIst_(generatedAt, fallbackDate) {
  if (!generatedAt) return fallbackDate || "";
  const date = new Date(generatedAt);
  if (isNaN(date.getTime())) return fallbackDate || "";
  return Utilities.formatDate(date, CONFIG.TIME_ZONE, "dd MMM yyyy HH:mm:ss");
}

function validateConfig_() {
  if (!CONFIG.APP_URL || CONFIG.APP_URL.indexOf("PASTE_") === 0) {
    throw new Error("Replace APP_URL in Code.gs with your published Replit app URL.");
  }
}