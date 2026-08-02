# Google Apps Script setup (no Replit connector)

This is a free alternative to the Replit Google Sheets connector. Your own
Google Sheet runs the sync and imports the WhatsApp archive from SaleLooterz.

## Setup

1. Make sure the SaleLooterz app is published and copy its public URL.
2. Open the Google Sheet where you want the deals.
3. Select **Extensions → Apps Script**.
4. Open `google-apps-script/Code.gs` from this project and paste it into
   the Apps Script editor.
5. Replace `PASTE_YOUR_PUBLISHED_REPLIT_URL_HERE` with the public app URL,
   for example `https://your-app.example`.
6. Click **Save**, choose `setup` from the function dropdown, and click
   **Run**.
7. Approve the Google permissions when prompted.

The script creates a `WhatsApp Messages` tab, imports the existing deals, and
creates a daily trigger around **3:15 PM IST**. It uses the Amazon URL to avoid
importing the same deal twice.

You can run `syncWhatsAppDeals` manually whenever you want an immediate import.

## Important

The Replit app must be reachable by Google Apps Script. Use a published app URL,
not `localhost` or a temporary browser preview URL. The bot continues generating
and saving the deals at 3 PM IST; the Sheet imports them shortly afterward.