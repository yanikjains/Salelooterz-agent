/*
 * SaleLooterz → Google Sheets push receiver
 *
 * Setup:
 * 1. Paste this file into Extensions → Apps Script in your Google Sheet.
 * 2. Set APP_SECRET to a private value. Leave it blank only if you accept
 *    unauthenticated POSTs to this web app.
 * 3. Run setup() once and approve the Google permissions.
 * 4. Deploy → New deployment → Web app:
 *      Execute as: Me
 *      Who has access: Anyone
 * 5. Copy the /exec URL into SaleLooterz Settings → Apps Script Web App URL.
 * 6. Put the same APP_SECRET into SaleLooterz Settings → Apps Script Secret.
 *
 * SaleLooterz sends each WhatsApp batch here automatically after generation.
 */

const CONFIG = {
  SHEET_NAME: "WhatsApp Messages",
  TIME_ZONE: "Asia/Kolkata",
  APP_SECRET: "CHANGE_THIS_SECRET",
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

/** Run once after pasting the script. */
function setup() {
  const sheet = getOrCreateSheet_();
  ensureHeaders_(sheet);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, HEADERS.length);
}

/** Receives a WhatsApp batch from SaleLooterz. */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse_({ ok: false, error: "Missing request body" });
    }

    const payload = JSON.parse(e.postData.contents);
    if (CONFIG.APP_SECRET && payload.secret !== CONFIG.APP_SECRET) {
      return jsonResponse_({ ok: false, error: "Unauthorized" });
    }
    if (!Array.isArray(payload.rows)) {
      return jsonResponse_({ ok: false, error: "rows must be an array" });
    }

    const sheet = getOrCreateSheet_();
    ensureHeaders_(sheet);
    const existingKeys = getExistingKeys_(sheet);
    const newRows = [];

    payload.rows.forEach(function (row) {
      // Amazon URL is stable and prevents duplicate imports.
      const key = String(row.productUrl || row.productTitle || "").trim();
      if (!key || existingKeys.has(key)) return;

      newRows.push([
        // Use the timestamp captured when this product was scraped, not the
        // time the whole 30-message batch finished.
        formatIst_(row.scrapedAt || payload.generatedAt, payload.date),
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

    if (newRows.length) {
      sheet
        .getRange(sheet.getLastRow() + 1, 1, newRows.length, HEADERS.length)
        .setValues(newRows);
      sheet
        .getRange(2, 1, Math.max(sheet.getLastRow() - 1, 1), 1)
        .setNumberFormat("dd mmm yyyy hh:mm:ss");
    }

    sheet.setFrozenRows(1);
    Logger.log("SaleLooterz received " + newRows.length + " new deals");
    return jsonResponse_({ ok: true, imported: newRows.length });
  } catch (error) {
    Logger.log(String(error));
    return jsonResponse_({ ok: false, error: String(error) });
  }
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
    .forEach(function (row) {
      const key = String(row[0] || "").trim();
      if (key) keys.add(key);
    });
  return keys;
}

function formatIst_(generatedAt, fallbackDate) {
  if (!generatedAt) return fallbackDate || "";
  const date = new Date(generatedAt);
  if (isNaN(date.getTime())) return fallbackDate || "";
  return Utilities.formatDate(
    date,
    CONFIG.TIME_ZONE,
    "dd MMM yyyy HH:mm:ss"
  );
}

function jsonResponse_(body) {
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}