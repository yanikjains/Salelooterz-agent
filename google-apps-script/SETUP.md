# Google Apps Script setup (no Replit connector)

This is a free alternative to the Replit Google Sheets connector. SaleLooterz
pushes each WhatsApp batch directly to your own Google Sheet through a Google
Apps Script web app. Replit does not need to be published.

## Setup

1. Open the Google Sheet where you want the deals.
2. Select **Extensions → Apps Script**.
3. Paste `google-apps-script/Code.gs` into
   the Apps Script editor.
4. Change `CHANGE_THIS_SECRET` to a private value.
5. Click **Save**, choose `setup` from the function dropdown, and click
   **Run** once.
6. Approve the Google permissions when prompted.
7. Click **Deploy → New deployment → Web app**.
8. Choose **Execute as: Me** and **Who has access: Anyone**, then deploy.
9. Copy the URL ending in `/exec`.
10. In SaleLooterz Settings, paste it into **Apps Script Web App URL** and
    paste the same secret into **Apps Script Secret**, then save.

The script creates a `WhatsApp Messages` tab and receives the daily batch after
SaleLooterz generates it at 3 PM IST. It uses the Amazon URL to avoid duplicate
imports.

You can use the dashboard's **Generate Now** action to test an immediate push.

## Important

The Replit workflow must be running when the batch is generated because the app
performs the outgoing POST. A workspace that is stopped or sleeping cannot run
the scheduled batch until it is started again.