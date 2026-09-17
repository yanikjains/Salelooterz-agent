---
name: WhatsApp export freshness and Amazon blocking
description: Reliability rules for live WhatsApp batches when Amazon blocks scraper requests.
---

The WhatsApp CSV must never fall back to the last historical batch after a newer generation attempt fails or is still running. A batch is downloadable only after a complete 30-row local export is saved by the current export flow.

**Why:** Amazon India can return robot checks and HTTP 500/503 responses to repeated live requests. Treating that as an empty search and continuing across every category makes Generate Now appear stuck, while the old CSV can be mistaken for fresh data.

**How to apply:** Preserve the generating/saved/failed export state, fail fast on repeated Amazon throttle/block responses, and keep incomplete or failed attempts unavailable for download. Never fabricate or reuse product facts when live detail-page verification is unavailable.