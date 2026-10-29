# SURAKSHA — 5-Minute Demo Script (timed)

**Driver:** M4 narrates · M3 operates the screen · M1+M2 on Q&A standby.
**Pre-flight (5 min before):** `docker compose up -d` · open dashboard · confirm REPLAY badge shows · wifi OFF (deliberately — see step 6).

| Time | Screen | Say |
|---|---|---|
| **0:00–0:30** | Slide: 4 questions commanders ask | "IMD tells you a cyclone is coming. It doesn't tell you *which block, which depot, which road to act on first*. That triage still happens on paper and phone calls. SURAKSHA is the missing decision layer on top of India's existing warning infrastructure." |
| **0:30–1:30** | Dashboard: Fani track + Odisha blocks colored by risk + ranked queue (badge: **REPLAY**) | "This is Cyclone Fani, May 2019, replayed from official IMD data. Every block carries a 0–100 operational priority score. Click any row — here's exactly *why* it ranked where it did: wind exposure, population, surge proximity, critical assets nearby. Fully auditable, no black box." |
| **1:30–3:00** | **WOW:** drag the cyclone track inland · map + queue + assets + routes re-rank live (badge: **SIMULATED**) | "Watch — I drag the track inland. In under two seconds the entire picture re-ranks: priority blocks change, new relief stockpiles fall into the path, and this resupply route flips to CUT. The staging recommendation moves to Cuttack. This is the what-if layer a command officer actually needs." |
| **3:00–4:00** | Interlock demo: staleness trigger → EVAC_ORDERED rejected (REVIEW_REQUIRED) | "Now the safety interlock. I age the data feed past six hours. The system *refuses* to auto-escalate — it demands human review and logs the refusal. And whenever our model disagrees with IMD, IMD wins, and we show you the disagreement. It will not act on bad data." |
| **4:00–4:45** | Approve one simulated resupply task → lifecycle + audit entry; situation briefing reads out | "One command: approve a resupply task. Full lifecycle — proposed, approved, en_route — with an immutable audit trail. Every dispatch is simulated and badged; human approval is required at every consequential step. The briefing officer reads the situation in six lines." |
| **4:45–5:00** | (If wifi) flip live toggle → live IMD CAP tier lights up | "Same engine, live: this week it tracked Cyclone Arnab through the Bay of Bengal on official IMD feeds. One engine, many missions — today a cyclone, tomorrow the thermal-anomaly pipeline already inside this platform." |

## Closing line
"Official warnings in, prioritised decisions out — and never the other way around."

## Failure drills (memorise)
- **Wifi dies mid-live-toggle:** "That's exactly why the demo you just saw needed no network. The live tier is optional by design."
- **Slider feels laggy:** pre-warm it before the round (one drag during setup).
- **Map tiles missing:** MapLibre works from cached data; if a basemap fails, switch to the block-polygon-only view — the risk choropleth is drawn from our own PostGIS data, not tiles.
- **Anything breaks:** "The replay demo has zero external dependencies — we can restart the container and rerun in 30 seconds." Then do exactly that.
