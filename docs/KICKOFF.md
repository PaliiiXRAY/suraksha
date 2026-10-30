# SURAKSHA — Hackathon Kickoff Briefing (Day 1)
**Zinnovatio 4.0 · Oct 30–31, 2026 · read in full before your first task.**

> Derived from `RUNBOOK.md` (§1 hardware, §2 roles, §5 hour-by-hour) and `ARCHITECTURE.md`.
> **If anything here conflicts with RUNBOOK.md, RUNBOOK wins.** `AGENTS.md` governs all agent sessions.

---

## 0. Role assignment (locked at kickoff — do not swap)

| Member | Role | Machine | Owns (code) | Never touches |
|---|---|---|---|---|
| **Bhagavat** | **M1 — Geo/Backend** | Linux | Cyclone migrations (additive), `backend/app/db/seed/` loaders, risk engine `backend/app/services/risk/` (area_engine, exposure, routes) | frontend JS, slides |
| **Adii** | **M2 — API** | i5, no GPU | FastAPI cyclone routers, org-scoped RBAC, cyclone state machine, interlocks middleware, audit | map rendering, seed data |
| **Lead (you)** | **M3 — Frontend/Map + demo machine** | i5 + RTX 3060 | `static/` command dashboard: MapLibre risk map, ranked table + reasons drawer, what-if slider, provenance badges, banners | backend logic beyond calling endpoints |
| **Priyanshu** | **M4 — Data/Demo/Docs** | Mac | `db/seed/data/` downloads + provenance, strategic-assets CSV, live/replay toggle, Situation Brief template, slides, docs, rehearsals | engine code |

**Integration contract (agree at H0, do NOT change):** M2 publishes OpenAPI at `/docs`; M3 builds against it from H4 using mock JSON in `static/fixtures/` if needed. Engine output shape (M1 → M2 → M3):

```json
{ "area_code": "...", "score": 0-100, "rank": 1, "reasons": [{"factor","weight","contribution","detail"}],
  "interlock_flags": [], "provenance_tag": "REPLAY|OFFICIAL_FORECAST|MODEL_ESTIMATE|SIMULATED|INSUFFICIENT_DATA" }
```

**Hard rules:** no GPU work anywhere · no Node build (static + CDN only) · nothing ships labelled live unless it is · every dispatch visibly `SIMULATED` · risk score is a **priority score, never a probability**.

---

## 1. Everyone's first 30 minutes (before any code)

```bash
git clone https://github.com/PaliiiXRAY/suraksha.git && cd suraksha
docker compose up -d
pip install -r requirements.txt -r requirements-ml.txt pytest   # python3 on Linux/Mac
python -m pytest -q                                            # MUST end: 194 passed
```

If it does **not** say `194 passed`, stop and say so in the group chat before writing a line of code — the base is green on every machine by design; a red base means an environment problem, not a code problem. Read `AGENTS.md` (agent rules) and skim `ARCHITECTURE.md` §4 (the engine) + §4.2 (the interlocks). Then start your card below.

**Git flow (enforced by GitHub, not a suggestion):** branch `feat/<topic>` / `fix/<topic>` → push → PR → **1 approving review** → merge. Direct pushes to `main` are rejected by branch protection. Your agent must do the same.

**Agent prompt template (from RUNBOOK §3):**
> "You are working on SURAKSHA, defined in ARCHITECTURE.md and docs/SRS.md. Read both first. Implement <task>. Constraints: <from SRS>. Acceptance: <test>. Do not modify files outside <paths>."

---

## 2. M1 — Bhagavat (Geo/Backend, Linux)

**Mission:** the cyclone data model and the transparent scoring engine. Additive migrations only — **never drop or alter existing FireSense tables.**

| # | Task | Acceptance (check off only when true) |
|---|---|---|
| T1 | Additive alembic migration in `backend/app/db/migrations/`: `organizations`, `hazard_events`, `areas` (geom, population, elevation, coastal, flood_susceptibility), `area_risk`, `strategic_assets`, `supply_routes` — per ARCHITECTURE §6 | fresh `docker compose down -v && up` → `docker compose exec backend alembic upgrade head` clean; existing `pytest -q` still **194 passed**; `alembic downgrade -1` also works |
| T2 | Seed loaders in `backend/app/db/seed/` reading M4's CSVs (blocks, assets) — idempotent | run twice → zero duplicate rows; block count == CSV rows |
| T3 | `backend/app/services/risk/area_engine.py`: 6-factor weighted scoring (ARCHITECTURE §4.1: wind 30 / rainfall 20 / population 20 / surge 15 / infra 10 / urgency 5), **every factor emits a reason{}** | pytest: coastal block @ wind 120 km/h scores **> 70**; reasons[] contributions sum ≈ score; same inputs → same score (deterministic) |
| T4 (H8+) | Asset exposure (`ST_DWithin`, 10 km × criticality) + route status (`ST_Intersection`: >50% CUT / >10% AT_RISK / else PASSABLE-but-labelled-UNKNOWN-without-evidence) | pytest with fixture geometries; **no route ever returns PASSABLE without evidence** |

**Unblock strategy:** develop T3 against synthetic fixture geometries (don't wait for downloads); M4's polygons land by H4.
**Branch:** `feat/cyclone-schema` (T1/T2), `feat/risk-engine` (T3/T4).

## 3. M2 — Adii (API, i5)

**Mission:** expose the engine safely — org-scoped RBAC, the cyclone state machine, and the deterministic interlocks that live **outside** any LLM path.

| # | Task | Acceptance |
|---|---|---|
| T1 | Cyclone state machine, pure module `backend/app/services/cyclone/state_machine.py` + tests (no DB needed — start now) | full transition matrix tested: `MONITORING→WARNING→EVAC_ORDERED→DEPLOYED→RESOLVED`, `STAND_DOWN` only from WARNING; invalid/skipped transitions rejected; **`EVAC_ORDERED` refused whenever `interlock_flags != []`** (ARCHITECTURE §7) |
| T2 | Hazard-event CRUD router + `PATCH /hazard-events/{id}/status`, org-scoped RBAC (after M1 T1 lands ~H2) | cross-org read/write → **403**; every transition writes an audit row |
| T3 | Interlocks middleware v1: source older than 6h → force `REVIEW_REQUIRED`, refuse auto-escalation | pytest: stale-timestamp scenario refuses; fresh scenario proceeds |
| T4 (H4+) | `/area-risk`, `/asset-exposure` endpoints returning the contract shape; (H12) `/what-if` non-persistent recompute; `/briefing` template-first | response schema matches contract exactly; what-if leaves DB unchanged |

**Branch:** `feat/cyclone-api`, `feat/interlocks`.

## 4. M3 — Lead (Frontend/Map, RTX 3060 machine)

**Mission:** the screen a defence judge touches. The existing FireSense dashboard (`static/`, served by FastAPI at `/dashboard`) is your base — extend, don't rewrite.

| # | Task | Acceptance |
|---|---|---|
| T1 | Cyclone command shell: org/role switcher, MapLibre base map with block polygons, **REPLAY banner + provenance badge component** (spec from M4 by H4) | loads at `/dashboard`; badge reads `REPLAY: CYCLONE FANI (May 2019)` |
| T2 | Blocks choropleth by risk score + ranked table + **reasons drawer** (drive from `static/fixtures/` mock matching the contract until M2's endpoints exist) | every row expands to reasons[]; nothing on screen lacks a provenance badge |
| T3 | **What-if slider** (the wow moment): drag cyclone track → `POST /what-if` → map + queue + assets re-rank live | full re-rank visible **< 2 s**; stays labelled SIMULATED |
| T4 | Asset/route panels; SIMULATED badges on every dispatch affordance; human-approve step visible before any task state change | demo script §3–§5 runs end-to-end |

**Branch:** `feat/command-dashboard`.

## 5. M4 — Priyanshu (Data/Demo/Docs, Mac)

**Mission:** the offline truth and the story. The demo must survive dead venue wifi.

| # | Task | Acceptance |
|---|---|---|
| T1 | Download pack → `db/seed/data/` + `sources.md` (source, timestamp, license per file): Fani 2019 track + IMD warning archive; Odisha block polygons (LGD/census); block population; OSM road extract (Kendrapara/Balasore/Puri) | total < 50 MB; opens offline; sources.md complete; **nothing labelled live that isn't** |
| T2 | Strategic assets CSV ~40 rows (hospitals, shelters, NDRF bases, relief depots, ports, fuel) with lat/lon + criticality | schema agreed with M1's T2 loader; all coordinates inside Odisha bbox |
| T3 | Provenance-badge spec (the 5 tags, exact strings) → M3 by H4; live/replay toggle design; Situation Brief **template fallback** text | brief renders with zero external calls |
| T4 | Slides; extend `docs/JUDGE_QA.md`; rehearsal #1 timed by H10; H12+ docs pass (README/ARCHITECTURE/DECISIONS) | 5-min run of `docs/DEMO_SCRIPT.md` hits every beat |

**Mac pitfall:** Docker Desktop file-sharing makes bind mounts slow — keep volumes small/named, or run against the lead's stack over LAN/shared screen.
**Branch:** `feat/data-pack`, `docs/demo`.

---

## 6. Hour-by-hour (canonical table = RUNBOOK §5 — condensed checkpoints)

| Hour | Checkpoint (all members) |
|---|---|
| H0 | 20-min sync: pitch read-aloud (RUNBOOK §0) · contract locked · roles confirmed |
| H2 | M1 T1 migration merged (PR) · M2 T1 state-machine tests green · M4 downloads in flight · M3 shell loading |
| H4 | **Integration point:** contract endpoints or fixtures usable by M3; M4 badge spec delivered |
| H8 | Engine v1 + `/area-risk` + map colored by risk + ranked table working end-to-end |
| H10 | Rehearsal #1 (M4 times it, M3 drives) |
| H12 | **Contingency gate:** if behind, cut ① LLM briefing (keep template) → ② route-status table (keep asset exposure) → ③ staging rec. **Never cut:** reasons[], interlock demo, what-if slider, provenance badges |
| H16 | Day-1 clean stop: all PRs merged or closed, `main` green, README draft done |

**Never cut, ever:** the interlock demo (minute 4 of the demo script) and reasons[] — they are the product. The map is packaging; an honest, auditable "why?" for every pixel is the differentiator.

**Standing rules during the event:** small tasks to agents with acceptance tests (RUNBOOK §3) · stage only your own files, never `git add -A` · never commit `.env`/secrets · every consequential action human-approved and visibly SIMULATED · docs sync per `AGENTS.md` §12.
