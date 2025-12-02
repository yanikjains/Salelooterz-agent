import { google } from 'googleapis';

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
    console.error('Failed to get access token:', error);
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

    console.log(`✓ Successfully appended to Google Sheet ${spreadsheetId}: ${row.productTitle}`);
    return response;
  } catch (error) {
    console.error(`✗ Failed to append to Google Sheet ${spreadsheetId}:`, error);
    throw error;
  }
}

export async function createNewSheet(title: string) {
  const sheets = await getUncachableGoogleSheetClient();
  
  const response = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title,
      },
      sheets: [
        {
          properties: {
            title: 'Sheet1',
          },
          data: [
            {
              rowData: [
                {
                  values: [
                    { userEnteredValue: { stringValue: 'Timestamp' } },
                    { userEnteredValue: { stringValue: 'Product Title' } },
                    { userEnteredValue: { stringValue: 'Price' } },
                    { userEnteredValue: { stringValue: 'Rating' } },
                    { userEnteredValue: { stringValue: 'Product URL' } },
                    { userEnteredValue: { stringValue: 'WhatsApp Message' } },
                    { userEnteredValue: { stringValue: 'Telegram Message' } },
                    { userEnteredValue: { stringValue: 'Affiliate Tag' } },
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  });

  return response.data.spreadsheetId!;
}

export async function appendToMarketingSheet(email: string, name: string) {
  const sheets = await getUncachableGoogleSheetClient();
  
  try {
    // Try to append to existing "Marketing Leads" sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.MARKETING_SHEET_ID || "marketing-leads",
      range: 'Sheet1!A:B',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[email, name]]
      },
    });
  } catch (err) {
    console.error('Marketing sheet append error:', err);
    throw err;
  }
}

export async function getOrCreateSheet(sheetName: string = 'AmzViral Automation'): Promise<string> {
  const sheets = await getUncachableGoogleSheetClient();
  
  try {
    const response = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: sheetName,
        },
      },
    });
    
    const spreadsheetId = response.data.spreadsheetId!;
    
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Sheet1!A1:H1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[
          'Timestamp',
          'Product Title',
          'Price',
          'Rating',
          'Product URL',
          'WhatsApp Message',
          'Telegram Message',
          'Affiliate Tag'
        ]]
      }
    });
    
    return spreadsheetId;
  } catch (error) {
    throw error;
  }
}
