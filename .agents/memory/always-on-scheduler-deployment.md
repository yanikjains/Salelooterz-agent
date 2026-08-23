---
name: Always-on scheduler deployment
description: Deployment constraint for apps whose background timers must continue without web traffic.
---

Background schedulers, scrapers, and bot posting loops must use an always-running VM deployment rather than autoscaling.

**Why:** Autoscaling deployments can scale down when idle, which pauses in-process timers and makes scheduled work unreliable.

**How to apply:** Configure production as a VM with the compiled production run command, then have the owner publish it and choose private visibility when the app is intended for one-user access.