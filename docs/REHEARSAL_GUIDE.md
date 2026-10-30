# SURAKSHA — Rehearsal #1 Timing & Drill Guide (Hour 10)
**Session Purpose:** Validate the 5-minute timed presentation flow per `docs/DEMO_SCRIPT.md` with zero pauses, smooth handoffs, and 100% offline reliability.  
**Roles during Rehearsal:**
- **M4 (Narrator & Driver):** Keeps the clock, tells the story, articulates the problem and defense rationale.
- **M3 (Screen Pilot):** Operates the dashboard, performs the live track drag, clicks into the reasons drawer.
- **M1 & M2 (Q&A Defense):** Timekeeper, technical interrogators simulating hostile judges.

---

## 1. Minute-by-Minute Execution Checklist

```
[0:00] ──► [0:30] ──► [1:30] ──► [3:00] ──► [4:00] ──► [4:45] ──► [5:00]
Slide 1-2   Dashboard   Reasons   What-If   Interlocks Resupply   Wrap/Live
(Hook)      (Replay)    (Audit)   (Drags)   (Refusal)  & Brief    (Offline)
```

| Time Slot | Visual Target | M3 Screen Action | M4 Narration Key Points | Target Check |
|---|---|---|---|---|
| **0:00 – 0:30** | Slide 1 & Slide 2 | Show title slide, then switch to the 4 questions slide | Open with the hook: "IMD tells you a cyclone is coming. It doesn't tell you *which block, which depot, which road to act on first*." | Hook delivered in < 30s |
| **0:30 – 1:30** | Live Dashboard (127.0.0.1:8000) | Switch to browser. Highlight top bar banner (`[REPLAY]`), point to Puri track & choropleth | "This is Cyclone Fani (May 2019) replayed from official IMD data. Every block has a 0–100 operational priority score. Click any row — here's *why* it ranked there." | Puri Sadar #1 clicked; reasons drawer opens smoothly |
| **1:30 – 3:00** | What-If Slider / Map Drag | **THE WOW MOMENT:** Grab cyclone track control, drag 35 km inland towards Cuttack | "Watch — in under two seconds, the entire theatre re-ranks. Cuttack spikes, NH-53 flips to CUT, and staging moves to Cuttack. Every number updates to [SIMULATED]." | Re-rank completes < 2s; badge switches to SIMULATED |
| **3:00 – 4:00** | Interlock Trigger Button | Click the "Simulate Feed Staleness (>6h)" demo button | "Now the safety interlock: we age telemetry past 6 hours. System *refuses* EVAC_ORDERED, shows REVIEW_REQUIRED, and logs refusal. It will not act on bad data." | REVIEW_REQUIRED banner appears; transition blocked |
| **4:00 – 4:45** | Task Queue & Briefing Panel | Click "Approve Task #101", then click "Generate Situation Briefing" | "Approve resupply task: proposed → approved → en_route. Audited. The briefing officer reads the situation in 6 lines — generated locally with zero external API calls." | Task status changes; 6-line briefing renders instant |
| **4:45 – 5:00** | Live Toggle (Optional) / Wrap | (If connected) Flip live toggle, or point to offline banner | "One engine, many missions. This same engine tracks live Bay of Bengal alerts or thermal anomalies. Official warnings in, prioritized decisions out — and never the other way around." | Stop watch hits exactly 4:55 - 5:00 |

---

## 2. Team Pre-Flight Verification (5 Minutes Before Any Rehearsal)

Run this quick verification sequence:
1. `docker compose up -d` (or verify backend is responding at `http://localhost:8000/docs`).
2. Verify test suite passes: `python3 -m pytest tests/test_seed_data_pack.py tests/test_situation_briefing.py`.
3. Open `http://localhost:8000/` in Chrome.
4. **CRITICAL STEP:** Disable laptop Wi-Fi for at least one full rehearsal run. Confirm that every click, map render, what-if drag, and situation brief renders flawlessly without internet.

---

## 3. Contingency Ladder & Panic Prevention

If anything goes wrong during rehearsal or live judging:
- **Laggy Slider:** Do one quick track drag during the pre-flight setup to warm the browser geometry buffer.
- **Presenter Stumbles:** M4 pauses for 2 seconds, takes a breath, and points to the reasons drawer: *"Let's look at the numbers — wind 215 km/h, surge 2.1 km..."*
- **Judge Interrupts Early with "Is this live?":** Point directly to the purple badge on the top banner: *"No, sir. This is badged REPLAY — historical Cyclone Fani. We have an optional live toggle, but this demo runs 100% offline so network drops cannot kill the session."*
- **Browser Tab Crashes:** Refresh the tab (`Cmd+R` / `F5`). The state persists in PostGIS and local cache. Reload takes < 1 second.
