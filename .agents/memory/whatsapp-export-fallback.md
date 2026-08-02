---
name: WhatsApp export fallback
description: Product decision for exporting WhatsApp deal batches without a Google Sheets connection.
---

When Google Sheets OAuth is unavailable, WhatsApp batches must still be archived locally and offered as a spreadsheet-ready CSV download. If the user wants Google Sheets without publishing Replit, use a Google Apps Script web app receiver: the scheduled batch POSTs rows to it, while the local backup remains the fallback.

**Why:** The user may not have credits or may decline the Google Sheets connection, but still needs an automated, importable deal list. A push receiver avoids requiring a public Replit URL.

**How to apply:** Preserve the local JSON archive and CSV download whenever changing WhatsApp batch generation or export behavior. Prefer the Apps Script URL when configured and skip the Replit Sheets connector path.