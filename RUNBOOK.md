# SURAKSHA — Team Runbook
**Read this first. It is the single source of truth for the 24 hours.**
Track: AI for Defence, Aerospace & National Security · Zinnovatio 4.0 · Oct 30–31, 2026 · Team of 4

---

## 0. The Pitch in 30 Seconds (everyone must memorise this)

> "Official hazard systems tell you a cyclone is coming. They don't tell you *which block, which depot, which road to act on first*. SURAKSHA fuses IMD, ISRO and NASA satellite feeds into a single explainable operating picture for India's response forces — ranked priorities, threatened supply routes, staging recommendations — with a safety interlock that refuses to act on stale data and always defers to official warnings. One engine, built on our NTRO-origin FireSense platform. And it runs fully offline on cached Cyclone Fani data, so this demo cannot fail."

**Wow moment:** drag the cyclone track → map, priority queue, threatened assets and route statuses re-rank live, every block explaining *why*.

---

## 1. Hardware Reality Check (so nobody panics)

| Machine | Assign to | Why |
|---|---|---|
| i5 + RTX 3050 (strongest) | **Demo machine** + M3 frontend | runs Docker stack + dashboard; GPU irrelevant — nothing needs it |
| i5, no GPU | **M2 API** | FastAPI + tests are CPU-trivial |
| Linux | **M1 Geo/Backend** | Docker/PostGIS scripting smoothest; also runs shared stack as hot spare |
| Mac | **M4 Data/Demo + Docs** | slides, seed data, README; beware `docker compose` file-sharing slowness — keep data volumes small |

**Hard rules:**
- **No GPU anywhere.** The "AI" is rule-based scoring + one LLM **API** call (template fallback). Do not attempt local models.
- **No Node build.** Frontend = static files + CDN (Tailwind, MapLibre). No `npm install`, no Vite, no webpack. This kills last hackathon's "IDE builds forever" problem.
- Everything runs in Docker Compose. If one machine struggles, that member codes against the shared stack on the demo machine (SSH/LAN or shared screen).

---

## 2. Roles & Ownership

| Member | Owns | Never touches |
|---|---|---|
| **M1 — Geo/Backend** | PostGIS schema + migrations, `db/seed/` (Fani replay, Odisha blocks, assets CSV), risk engine (`services/risk/area_engine.py`, `exposure.py`), route flagging | frontend JS, slides |
| **M2 — API** | FastAPI routers (hazard_events, area_risk, tasks, briefing), org-scoped RBAC, cyclone state machine, interlocks middleware, audit logging | map rendering, seed data |
| **M3 — Frontend/Map** | Command dashboard: MapLibre map colored by risk, ranked table + reasons drawer, what-if slider, provenance badges, staging/asset panels | backend logic beyond calling endpoints |
| **M4 — Data/Demo/Docs** | Downloads (Fani track+warnings, block polygons, population, OSM roads), strategic-asset curation (~40 rows), live/replay toggle, slides, README/ARCHITECTURE/DECISIONS/JUDGE_QA, demo rehearsals | engine code |

**Integration contract (agree at Hour 0, do not change):** M2 publishes OpenAPI at `/docs`; M3 builds against it from Hour 4 using mock JSON if needed; M1's engine output shape = `{area_code, score, rank, reasons[], interlock_flags[], provenance_tag}`.

---

## 3. Working With AI Agents (opencode / antigravity)

Last time the IDE was slow because it tried to build huge things. This time:

1. **Give agents small tasks with acceptance tests, never "build the backend".** Bad: "make the risk engine". Good: "write `area_engine.py` implementing the 6-factor scoring in ARCHITECTURE.md §4.1 with reasons[] output; acceptance: pytest test scoring a block with wind 120km/h coastal scores > 70."
2. **Task file pattern:** each member keeps `tasks.md` in their area: `- [ ] FR-3.1 wind factor … | acceptance: <test>` — check off only when the test passes.
3. **One agent session per repo clone, small diffs.** After each agent edit: run tests, commit. Never let an agent refactor outside its task.
4. **Prompt template:** "You are working on SURAKSHA, defined in ARCHITECTURE.md and SRS.md at repo root. Read both first. Implement <task>. Constraints: <from SRS>. Acceptance: <test>. Do not modify files outside <paths>."
5. If the agent is slow/looping: stop it, write the code by hand — everything in this plan is deliberately small enough to hand-write. The agent is a typing accelerator, not the architect. **The plan is the architect.**

---

## 4. Tonight (Oct 29) — ~3h, all four

- [ ] **M4:** email/message organizers: confirm pre-existing project evolution is allowed (FireSense base) — disqualification risk, must know.
- [ ] **All:** `git checkout -b suraksha-cyclone` from latest main. FireSense stays intact.
- [ ] **M1+M2 (with teammate who did the audit):** P0 honesty/security fixes on the *legacy* app (F-01 traversal, F-02 auth, F-18/19 fake scores+ledger, F-09 fake context, DATA-01 "247 events" label) — commit to `pre-demo-hardening`. ~4h, done by midnight, non-negotiable.
- [ ] **M4:** register IMD API + MOSDAC (may not clear — fine). Download: Fani 2019 track + IMD warning archive; Odisha block polygons (LGD/census); block population; OSM road extract (Kendrapara/Balasore/Puri); curate ~40 strategic assets (hospitals, shelters, NDRF bases, depots, ports) into `assets.csv`.
- [ ] **M3:** scaffold dashboard shell (CDN Tailwind + MapLibre, one map, no data yet).
- [ ] **M2:** verify `docker compose up` + `pytest` green on all four machines. If CI/tests claim mismatches exist, fix the README numbers, don't chase green CI.
- [ ] **All:** 20-min sync: read ARCHITECTURE.md + SRS together, agree on the integration contract.

---

## 5. Hour-by-Hour (venue)

### Day 1 — Oct 30

| Hours | M1 Geo/Backend | M2 API | M3 Frontend | M4 Data/Demo |
|---|---|---|---|---|
| 0–4 | `organizations/areas/hazard_events/area_risk/strategic_assets/supply_routes` migrations; seed blocks+assets from CSVs | org-scoped auth on existing endpoints; hazard_event CRUD + cyclone state machine | app shell, org/role switcher, MapLibre base map with block polygons | Fani replay pack finalized → DB; provenance badge component spec to M3 |
| 4–8 | area risk engine v1 (6 factors + reasons[]) + asset exposure (ST_DWithin) | `/area-risk`, `/asset-exposure` endpoints; interlocks middleware v1 (stale-refuse) | map colored by risk score; ranked table; reasons drawer | live/replay toggle; Situation Brief template fallback; start slides |
| 8–12 | engine v2: route status (ST_Intersection) + staging recommendation | tasks queue + simulated dispatch + audit; `/briefing` endpoint (template first) | **what-if slider: drag track → call recompute → live re-rank** | judge-QA doc (10 questions); rehearsal #1 |
| 12–16 | interlocks v2 (IMD-wins, clamp, UNKNOWN-routes); performance pass (<2s re-rank) | what-if endpoint (non-persistent recompute); RBAC edge cases + tests | asset/route panels; SIMULATED/REPLAY banners everywhere | README, ARCHITECTURE, DECISIONS (6 entries) drafted |

### Day 2 — Oct 31

| Hours | Everyone |
|---|---|
| 0–6 | Integration window. Wire live IMD CAP as bonus toggle. M4 records demo video as insurance. |
| 6–10 | Harden per SRS Acceptance Criteria 1–6. DECISIONS.md finished ("why rule-based not ML", "why replay-first", "why no routing", "what we fixed from our own audit"). |
| 10–14 | Rehearse ×3, timed 5 min each. Code freeze at 12:00. |
| 14–18 | Fix only rehearsal-breaking bugs. Slides final. Eat. |
| 18–24 | Present: M4 drives demo, M3 runs screen, M1+M2 take technical Q&A. |

**Contingency ladder (if behind at Hour 12, cut in this order):** ① LLM briefing (keep template) → ② route-status table (keep asset exposure) → ③ staging recommendation. **Never cut:** reasons[], interlock demo, what-if slider, provenance badges.

---

## 6. The 5-Minute Demo Script (timed)

1. **0:00–0:30** — Problem: IMD warns; commanders still ask "which block first?" (show the 4 questions on one slide)
2. **0:30–1:30** — Dashboard: Fani track + blocks colored by risk + ranked queue, every row expandable to reasons (badge: REPLAY)
3. **1:30–3:00** — **Wow:** drag track inland → map + queue + assets + routes re-rank live; staging rec updates (badge: SIMULATED)
4. **3:00–4:00** — Interlock demo: stale the feed → system refuses EVAC_ORDERED, shows REVIEW_REQUIRED, logs it. "It will not act on bad data."
5. **4:00–4:45** — Approve one simulated resupply task → lifecycle + audit entry; Situation Brief reads out the picture
6. **4:45–5:00** — Flip live toggle (if wifi): "this same engine monitored Cyclone Arnab via IMD this week" — one shared engine, many missions. Close.

---

## 7. Judge Q&A — Top 10 (memorise the bold answers)

1. **"How is this different from NDEM/IMD/SACHET?"** → They disseminate hazard layers. We convert them into a ranked, explainable action queue — which block, which asset, which route, in what order — with interlocks. We supplement, never override.
2. **"Why rule-based scoring, not ML?"** → With no validated training data, an uncalibrated model is theater. Transparent weights + reasons[] a commander can audit beats a black box. (FireSense's XGBoost exists for thermal classification; risk prioritisation stays explainable.)
3. **"Is 0–100 a probability?"** → No. It's an operational priority score. Stated on-screen and in README.
4. **"Why Odisha only?"** → Depth over breadth: real block polygons, real Fani data, real logistics layer. The engine is region-agnostic; all-India is config, not code.
5. **"What if your data is stale/wrong?"** → The interlock refuses to auto-escalate and forces REVIEW_REQUIRED; IMD always wins disagreements. Demoed live in minute 4.
6. **"Is this live?"** → Provenance badge on every number: OFFICIAL / MODEL_ESTIMATE / REPLAY. Demo defaults to Fani 2019 replay; live IMD toggle shown if connectivity allows.
7. **"Do you dispatch real responders?"** → No. Everything is `is_simulated: true`, visibly badged. Real dispatch needs MoUs we don't claim to have.
8. **"Where's the AI?"** → Fusion + prioritisation engine, explainability, interlock reasoning, and a briefing agent. Plus inherited XGBoost thermal classification.
9. **"Did you build this during the hackathon?"** → We extended our own NTRO-origin platform (FireSense) — openly disclosed, and the cyclone intelligence + logistics layer is entirely new. *(Adjust per organizer answer on pre-existing projects.)*
10. **"Can it be gamed/hacked?"** → RBAC on every route, append-only audit, and our own pre-hackathon audit fixed P0 issues (path traversal, unauth mutation, fabricated demo values) — we can show the commit history.

---

## 8. Definition of Done (per feature)

A feature is done only when: (1) code merged to `suraksha-cyclone`, (2) acceptance test from SRS passes, (3) provenance/interlock behavior verified manually, (4) no new files in repo root outside the agreed structure. Slides/docs are M4's "code" — same rules.

**Final word:** the differentiator is not the map. It's that a defence judge can ask "why?" about any pixel on that screen and get a traceable, honest answer — and that the system refuses to lie when its data is bad. Everything else is packaging.
