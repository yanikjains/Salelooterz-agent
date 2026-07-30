import { google } from 'googleapis';
import { log } from './index';

let cachedConnectionSettings: any = null;
let tokenExpiryTime = 0;

async function getAccessToken() {
  const now = Date.now();
  
  // Return cached token if still valid (with 5 minute buffer)
  if (cachedConnectionSettings && tokenExpiryTime > (now + 5 * 60 * 1000)) {
    return cachedConnectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('REPLIT_CONNECTORS not available');
  }

  if (!hostname) {
    throw new Error('REPLIT_CONNECTORS_HOSTNAME not configured');
  }

  try {
    const response = await fetch(
      'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-sheet',
      {
        headers: {
          'Accept': 'application/json',
          'X_REPLIT_TOKEN': xReplitToken
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Connectors API returned ${response.status}`);
    }

    const data = await response.json();
    const connection = data.items?.[0];

    if (!connection) {
      throw new Error('Google Sheets connector not configured. Please set it up in Replit first.');
    }

    const accessToken = connection.settings?.access_token || connection.settings?.oauth?.credentials?.access_token;
    
    if (!accessToken) {
      throw new Error('No access token in connector configuration');
    }

    // Cache the connection and set expiry
    cachedConnectionSettings = connection;
    const expiresIn = connection.settings?.expires_in || 3600;
    tokenExpiryTime = now + (expiresIn * 1000);

    return accessToken;
  } catch (error) {
    log(`[Sheets] Failed to get access token: ${error}`);
    throw error;
  }
}

async function getUncachableGoogleSheetClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.sheets({ version: 'v4', auth: oauth2Client });
}

export interface SheetRow {
  timestamp: string;
  productTitle: string;
  price: string;
  rating: string;
  productUrl: string;
  whatsappMessage: string;
  telegramMessage: string;
  affiliateTag: string;
}

export async function appendToSheet(spreadsheetId: string, row: SheetRow) {
  if (!spreadsheetId) {
    throw new Error('No spreadsheet ID provided');
  }

  try {
    const sheets = await getUncachableGoogleSheetClient();
    
    const values = [
      [
        row.timestamp,
        row.productTitle,
        row.price,
        row.rating,
        row.productUrl,
        row.whatsappMessage,
        row.telegramMessage,
        row.affiliateTag
      ]
    ];

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Sheet1!A:H',
      valueInputOption: 'RAW',
      requestBody: {
        values,
      },
    });

    log(`[Sheets] ✓ Appended: ${row.productTitle}`);
    return response;
  } catch (error) {
    log(`[Sheets] ✗ Failed to append to sheet ${spreadsheetId}: ${error}`);
    throw error;
  }
}

export interface WhatsAppRow {
  category: string;
  productTitle: string;
  price: string;
  originalPrice: string;
  discount: string;
  rating: string;
  productUrl: string;
  message: string;
}

// Column headers — keep in sync with dataRows below
const WA_HEADERS = [
  "Date & Time (IST)", "Category", "Product",
  "Deal Price", "Original Price", "Discount", "Rating",
  "Amazon URL", "WhatsApp Message",
];

/**
 * Writes a daily WhatsApp batch to a dedicated "WhatsApp Messages" tab.
 * Creates the tab + header row on first run.
 * Inserts a date-separator row before each batch so messages are easy to scan by date.
 */
export async function appendWhatsAppBatchToSheet(
  spreadsheetId: string,
  rows: WhatsAppRow[]
): Promise<void> {
  if (!spreadsheetId || !rows.length) return;

  const sheets = await getUncachableGoogleSheetClient();
  const TAB = "WhatsApp Messages";

  // ── 1. Ensure the tab + header exist ─────────────────────────────────────
  let tabExists = false;
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    tabExists = (meta.data.sheets || []).some(
      s => s.properties?.title === TAB
    );
  } catch (err) {
    log(`[Sheets] Could not read spreadsheet metadata: ${err}`);
    throw err;
  }

  if (!tabExists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: TAB } } }],
      },
    });
    // Write header row
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${TAB}'!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [WA_HEADERS] },
    });
    log(`[Sheets] Created tab "${TAB}" with headers`);
  }

  // ── 2. Build rows ─────────────────────────────────────────────────────────
  const nowIST = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
  const dateLabel = new Date().toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata", day: "numeric", month: "long", year: "numeric",
  });

  const colCount = WA_HEADERS.length;
  const separatorRow = [`══════ ${dateLabel} ══════`, ...Array(colCount - 1).fill("")];

  const dataRows = rows.map(r => [
    nowIST,
    r.category,
    r.productTitle,
    r.price,
    r.originalPrice || "",
    r.discount || "",
    r.rating || "",
    r.productUrl,
    r.message,
  ]);

  // ── 3. Append to sheet ────────────────────────────────────────────────────
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${TAB}'!A:I`,
    valueInputOption: "RAW",
    requestBody: { values: [separatorRow, ...dataRows] },
  });

  log(`[Sheets] ✓ WhatsApp batch (${rows.length} msgs) written to "${TAB}"`);
}

