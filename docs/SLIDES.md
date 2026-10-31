# SURAKSHA — Presentation Slide Deck (10 Slides)
**Track:** AI for Defence, Aerospace & National Security · Zinnovatio 4.0  
**Format:** 5-Minute Timed Pitch + Live Product Demonstration  
**Pitch Team:** M4 (Narrator/Lead) · M3 (Screen Pilot) · M1 & M2 (Technical Q&A)

---

## Slide 1: Title & The Mission
```
========================================================================================
                                     SURAKSHA
             Satellite-to-Decision Disaster Intelligence for India's Armed Forces
========================================================================================
            "Official hazard warnings in, prioritised operational decisions out —
                          and NEVER the other way around."

  [ TRACK: AI for Defence, Aerospace & National Security ]  [ EVENT: Zinnovatio 4.0 ]
  [ BADGES: 100% Offline-Verified | Zero-WiFi Survival | Explainable Heuristics ]
========================================================================================
```
- **Visual:** Satellite synthetic aperture radar view of Cyclone Fani over the Bay of Bengal overlaid with tactical grid boundaries and command nodes.
- **Narrator (0:00 - 0:10):**
  > "Distinguished judges, when a severe cyclone churns in the Bay of Bengal, India's meteorological apparatus provides world-class warnings. But for an NDRF battalion commander, a state disaster commissioner, or an army relief coordinator, a massive red warning contour leaves the hardest questions unanswered: *Which block needs immediate evacuation? Which road is cut? And which relief depot is safe to stage from right now?*"

---

## Slide 2: The Command Triage Gap
```
========================================================================================
                     THE TRIAGE GAP: WHAT COMMANDERS ACTUALLY NEED
========================================================================================
  OFFICIAL DISSEMINATION (IMD / NDEM)        SURAKSHA OPERATIONAL DECISION ENGINE
  ------------------------------------       ------------------------------------
  [✓] "Red Alert: 14 Coastal Districts"      [→] Exactly WHICH block ranks #1 right now?
  [✓] "Gale winds 200 km/h over coast"       [→] Exactly WHY does it rank there? (Auditable reasons)
  [✓] "Storm surge 1.5m above tide"          [→] WHICH supply routes are CUT vs PASSABLE?
  [✓] General evacuation advisories          [→] WHERE should the nearest safe depot stage?

  TODAY'S REALITY: Hours of phone calls, paper maps, and manual triage under storm blackout.
  SURAKSHA: Fuses satellite telemetry + ground infrastructure into an instant priority queue.
========================================================================================
```
- **Narrator (0:10 - 0:30):**
  > "Disseminating hazard data is solved. Converting that hazard data into an auditable, ranked operational action queue is the missing link. SURAKSHA bridges that gap with explainable scoring, spatial route exposure, and deterministic safety interlocks that refuse to lie when data is bad."

---

## Slide 3: System Architecture & 4-Tier Fallback Cascade
```
========================================================================================
                       SYSTEM ARCHITECTURE & FALLBACK CASCADE
========================================================================================
  [ IMD API / CAP ]      [ ISRO MOSDAC ]      [ NASA FIRMS ]      [ OPENSTREETMAP ]
         │                      │                   │                    │
         └──────────────┬───────┴───────────────────┴────────────────────┘
                        ▼
       [ TIER 1: Live IMD API ] ──(Fail)──► [ TIER 2: IMD CAP RSS Feed ]
                                                   │ (Fail)
                                                   ▼
       [ TIER 4: Fani 2019 Replay ] ◄──(Fail)── [ TIER 3: Local Timestamped Cache ]
              (Default Demo Mode)
                        │
                        ▼
         ┌─────────────────────────────────────────────────────────┐
         │              GEOSPATIAL CORE & DECISION ENGINE          │
         │  • Area Risk (6 Factors + reasons[])                   │
         │  • Asset Exposure (ST_DWithin + Decay)                 │
         │  • Route Severance (ST_Intersection)                   │
         │  • Safety Interlocks (Stale-Refuse · IMD-Wins · Clamp) │
         └─────────────────────────────────────────────────────────┘
                        │
                        ▼
  [ COMMAND DASHBOARD ] ── [ SITUATION BRIEF ] ── [ AUDITABLE TASK LIFECYCLE ]
========================================================================================
```
- **Key Message:** Zero white-screen architecture. If venue wifi dies completely, the system degrades seamlessly with zero human panic.

---

## Slide 4: The 5 Provenance Badges — Zero Illusions
```
========================================================================================
                    PROVENANCE TAGGING: TOTAL OPERATIONAL HONESTY
========================================================================================
  Every metric, polygon, and task on screen carries one of 5 strict provenance badges:

  1. [OFFICIAL_FORECAST]  Cobalt Blue   IMD Warnings & Track Fixes (Governs all decisions)
  2. [OBSERVED]           Emerald Green OSM Roads, OSDMA Asset Locations (Ground truth)
  3. [MODEL_ESTIMATE]     Amber         0–100 Area Priority Scores, Route Severance Ratios
  4. [REPLAY]             Purple        Historical Cyclone Fani Offline Verification Pack
  5. [SIMULATED]          Rose          What-If Track Perturbations & Mock Response Tasks
  *  [INSUFFICIENT_DATA]  Slate Grey    Safety Gate: Stale data forces human review

  NON-NEGOTIABLE HONESTY CONTRACT:
  • Priority scores are operational urgency heuristics — NEVER claimed as probabilities.
  • All responder tasks are badged SIMULATED — zero fake claims of live dispatch.
========================================================================================
```
- **Narrator (0:30 - 1:00):**
  > "Credibility is our product. In defence applications, a black-box model that makes up numbers gets people killed. Every single figure on screen tells the commander exactly where it came from."

---

## Slide 5: The Transparent Decision Engine
```
========================================================================================
                  THE 6-FACTOR AREA RISK ENGINE: AUDITABLE BY DESIGN
========================================================================================
   FACTOR                      WEIGHT   DATA SOURCE            EVALUATION METHOD
  ──────────────────────────────────────────────────────────────────────────────────────
   1. Forecast Wind Intensity   30%     IMD Official Forecast  Peak sustained wind in block
   2. Rain & Flood Prone        20%     Bhuvan / NRSC Inund.   Historical flood susceptibility
   3. Storm Surge Proximity     15%     Coastal / Track Fix    Distance to eye landfall + elev.
   4. Population Exposure       20%     Census 2011 / LGD      Vulnerable demographic counts
   5. Critical Infrastructure   10%     OSDMA Strategic Assets Density of assets within 10 km
   6. Urgency (Time-to-Impact)   5%     Forward Track Vector   Hours until 90 km/h wind envelope
  ──────────────────────────────────────────────────────────────────────────────────────
   TOTAL PRIORITY SCORE         100%    Ranked 0 to 100        Every row emits reasons[]!

  THE reasons[] PRODUCT:
  Clicking any block opens the drawer: "Wind 215 km/h (+28.5), Surge 2.1 km (+14.2)..."
========================================================================================
```
- **Narrator (1:00 - 1:30):**
  > "Why rule-based rather than machine learning? Because with no validated regional cyclone impact dataset, training an uncalibrated neural net is theater. A transparent, weighted 6-factor model with traceable reasons[] allows a defence judge or a field commander to inspect every mathematical contribution."

---

## Slide 6: The "Wow" Moment: What-If Track Simulation
```
========================================================================================
                 THE "WOW" MOMENT: INTERACTIVE WHAT-IF SIMULATION
========================================================================================
  [ LIVE ACTION ON SCREEN: Pilot drags Cyclone Track 40 km North-West inland ]

  WHAT HAPPENS IN < 1.8 SECONDS:
  1. Map Canvas Re-renders: 90 km/h and 120 km/h hazard wind contours recalculate live.
  2. Priority Queue Re-ranks: Puri drops from #1 to #4; Cuttack and Kendrapara spike to #1 & #2.
  3. Strategic Assets Compromised: Paradip Fuel Terminal and Kendrapara Substation flagged.
  4. Supply Routes Severed: NH-53 Expressway status flips from PASSABLE to CUT.
  5. Staging Recommendation Moves: Staging moves from Cuttack to Bhubaneswar safe corridor.
  6. Visible Badge Switches: All updated metrics instantly badge as [SIMULATED].

  PostGIS Spatial Engine handles ~500 blocks in sub-second query latency on a standard laptop.
========================================================================================
```
- **Narrator (1:30 - 3:00):**
  > "Watch the screen. As our pilot drags the track inland, the entire operational picture re-ranks in under two seconds. The supply corridor flips to CUT, and the staging recommendation automatically relocates. That is the tactical what-if capability response commanders have never had."

---

## Slide 7: Safety Interlocks — It Refuses to Lie
```
========================================================================================
                     DECISION INTERLOCKS: THE SAFETY FIREWALL
========================================================================================
  A decision-support system must know when to REFUSE action.

  INTERLOCK 1: STALE-REFUSE
  • Condition: Input feed telemetry older than 6 hours.
  • Behavior: System freezes auto-escalation; blocks transition to EVAC_ORDERED.
  • UI Impact: Forces [REVIEW_REQUIRED] banner and logs interlock event to audit trail.

  INTERLOCK 2: IMD-WINS-ALWAYS
  • Condition: Model estimate diverges from official IMD Red/Orange warning level.
  • Behavior: Official IMD warning strictly supersedes model calculation.
  • UI Impact: Displays the discrepancy openly rather than hiding it.

  INTERLOCK 3: NEVER-ASSUME-SAFE
  • Condition: Road corridor lacks active spatial sensor or telemetry evidence.
  • Behavior: Classified as UNKNOWN, never defaulted to PASSABLE.

  INTERLOCK 4: READINESS CLAMP
  • Condition: Responder unit readiness < 0.40.
  • Behavior: Clamped from automatic staging recommendations.
========================================================================================
```
- **Narrator (3:00 - 4:00):**
  > "Here is our interlock test. We age the telemetry past six hours. Notice that the system refuses to trigger EVAC_ORDERED. It demotes the confidence, raises a REVIEW_REQUIRED flag, and logs the refusal into the immutable audit trail. It will not act on bad data."

---

## Slide 8: Relief-Logistics Layer (Asset Exposure & Cut Routes)
```
========================================================================================
                     RELIEF-LOGISTICS LAYER: SPATIAL TRUTH
========================================================================================
  We do NOT claim speculative vehicle routing optimization.
  We provide verified SPATIAL EXPOSURE:

  1. STRATEGIC ASSET EXPOSURE (ST_DWithin + Distance Decay):
     • 42 Curated installations across coastal Odisha (Hospitals, Depots, Bases, Ports, Fuel).
     • Distance decay function scores physical threat without guessing building damage.

  2. SUPPLY ROUTE SEVERANCE (ST_Intersection Length):
     • > 50% Route length inside hazard footprint  ──► [ CUT ]
     • 10% to 50% Route length inside footprint    ──► [ AT RISK ]
     • < 10% Route length inside footprint         ──► [ PASSABLE WITH EVIDENCE ]

  3. NEAREST-SAFE STAGING RECOMMENDATION:
     • Identifies high-capacity depot outside hazard envelope with confirmed open routes.
     • Example: Recommends 3rd BN NDRF Mundali Hub when coastal depots are compromised.
========================================================================================
```
- **Narrator (4:00 - 4:25):**
  > "We deliberately excluded convoy routing and fuel optimization. Why? Because road conditions in a cyclone change unpredictably. What commanders need is honest spatial exposure: which roads are geometrically severed by the storm surge, and which depots remain outside the danger zone."

---

## Slide 9: Situation Briefing & Auditable Task Lifecycle
```
========================================================================================
              AUTONOMOUS SITUATION BRIEFING & TASK LIFECYCLE
========================================================================================
  DETERMINISTIC SITUATION BRIEFING (Offline Fallback Engine):
  • Zero external LLM API calls required.
  • Generates 6-line concise operational summary in < 5 milliseconds.
  • 100% grounded in structured system outputs (hazard, top blocks, cut routes, staging).

  APPEND-ONLY AUDIT TRAIL:
  • Every state transition (MONITORING ──► WARNING ──► EVAC_ORDERED ──► DEPLOYED) logged.
  • Every task approval records user_id, timestamp, and rationale.
  • Role-Based Access Control (RBAC): Authority approves; Responder executes; Public reads.
========================================================================================
```
- **Narrator (4:25 - 4:45):**
  > "With a single click, the briefing engine synthesizes the entire operational theatre into six unambiguous lines. It runs locally with zero external network calls. When the commander approves a relief dispatch, it enters an auditable state machine with complete provenance."

---

## Slide 10: Defence Heritage, Tech Stack & Summary
```
========================================================================================
                         WHY SURAKSHA WINS FOR DEFENCE
========================================================================================
  TECHNICAL REALITY:
  • Authoritative Backend: FastAPI + PostgreSQL 16 / PostGIS (100+ automated unit tests).
  • Zero-Build Frontend: CDN Tailwind + MapLibre GL served directly as static assets.
  • Hardware Portability: Runs on ANY laptop with Docker Compose — ZERO GPU required.
  • Provenance Integrity: 5 strict tags; offline Fani replay guarantees demo survival.

  HERITAGE & EXTENSIBILITY:
  • Multi-hazard core: Unifies cyclone landfall models with satellite thermal intelligence.
  • One engine, many missions: Disaster command today; aerospace surveillance tomorrow.

  "Official warnings in, prioritised decisions out — and never the other way around."
========================================================================================
```
- **Narrator (4:45 - 5:00):**
  > "To conclude: SURAKSHA is not a toy prototype reliant on venue internet. It is a hardened, explainable decision-support engine engineered for the real operational realities of India's defence and disaster forces. Thank you, and we welcome your questions."
