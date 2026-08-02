---
name: WhatsApp export fallback
description: Product decision for exporting WhatsApp deal batches without a Google Sheets connection.
---

When Google Sheets OAuth is unavailable, WhatsApp batches must still be archived locally and offered as a spreadsheet-ready CSV download. The scheduled batch should save this backup before attempting any connected-service export.

**Why:** The user may not have credits or may decline the Google Sheets connection, but still needs an automated, importable deal list.

**How to apply:** Preserve the local JSON archive and CSV download whenever changing WhatsApp batch generation or export behavior.