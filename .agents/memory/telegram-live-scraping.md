---
name: Telegram live scraping
description: Data integrity and failure behavior for live Amazon deal collection.
---

Only use current, verified detail-page values for Telegram posts. If Amazon blocks or throttles requests, stop collection and leave the batch incomplete; do not fill it with stale or invented prices, ratings, review counts, or product facts.

**Why:** Amazon India can return robot checks and transient errors during live scraping. Search snippets alone may not confirm current offer details, and a partial batch must not be reported as successfully posted.

**How to apply:** Require the product title, deal price, higher MRP, rating, review count, and Amazon URL before formatting a post. Halt quickly on a detected block and report the incomplete batch clearly.
