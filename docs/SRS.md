# SURAKSHA — Software Requirements Specification (SRS)
Version 1.0 · Oct 29, 2026 · Team of 4 · 24-hour build

---

## 1. Introduction

### 1.1 Purpose
This SRS defines the requirements for **SURAKSHA**, a satellite-based multi-hazard disaster-intelligence, response-prioritisation, and relief-logistics platform for India's disaster-response and defence forces, built on FastAPI + PostgreSQL/PostGIS.

### 1.2 Scope
**In scope (MVP):** multi-tenant agency platform; cyclone hazard end-to-end (Odisha coast + inland flood blocks); area-wise explainable risk engine; strategic-asset and supply-route exposure; response-task queue with simulated dispatch; what-if scenario slider; situation briefing; cached-replay demo mode; citizen public bulletin (read-only).

**Out of scope (explicit):** all-India coverage; earthquakes/landslides; convoy routing/optimization; inventory management; pricing/payments; real emergency dispatch; ML model training.

### 1.3 Definitions
| Term | Meaning |
|---|---|
| **Area** | A geographic block (census unit) in Odisha; the unit of risk analysis |
| **Provenance tag** | One of OFFICIAL_FORECAST / MODEL_ESTIMATE / REPLAY / SIMULATED / INSUFFICIENT_DATA attached to every score |
| **Interlock** | A deterministic safety gate that refuses/degrades/clamps a recommendation |
| **Replay pack** | Pre-downloaded, timestamped Cyclone Fani 2019 dataset enabling offline demo |
| **Priority score** | 0–100 operational urgency score; explicitly NOT a probability |

### 1.4 References
IMD API & CAP feed · ISRO MOSDAC · NASA FIRMS · OSM (ODbL) · Bhuvan/NRSC flood layers

---

## 2. Overall Description

### 2.1 Product Perspective
SURAKSHA is the missing **decision layer** on top of India's existing warning infrastructure (IMD, ISRO, NDMA). Official systems disseminate hazard layers; SURAKSHA converts them into a ranked, explainable action queue: *which block, which asset, which route, which depot — in what order, and why.*

### 2.2 User Classes (roles, org-scoped via `org_id`)
| Role | Persona | Key permissions |
|---|---|---|
| **Admin** (org) | Agency IT lead | manage org users, invite members |
| **Authority** | Command officer (SDMA/NDRF) | approve tasks, transition hazard state, trigger what-if |
| **Analyst** | Intel analyst | view all risk outputs, recompute engine, propose tasks |
| **Responder** | Field unit lead | view assigned tasks, update task status |
| **Public** | Citizen | read `/public/alerts` bulletins only |

### 2.3 Operating Constraints
- C1: Demo must run **fully offline** (cached replay). Live data is a bonus tier only.
- C2: Frontend is **build-less** (CDN + ES modules) — no Node toolchain at the venue.
- C3: All environments identical via Docker Compose.
- C4: No GPU available/required on any team machine.
- C5: All writes audited; audit log append-only.

---

## 3. Functional Requirements

### 3.1 Multi-tenancy & Access Control
| ID | Requirement | Priority |
|---|---|---|
| FR-1.1 | System shall store users under an `organization` with `org_type`; all incidents/risks/tasks are scoped to the user's org | Must |
| FR-1.2 | JWT auth; server enforces role→endpoint matrix; unauthenticated requests → 401, wrong role → 403 | Must |
| FR-1.3 | Org admin can invite users and assign roles | Should |

### 3.2 Hazard Event Management
| ID | Requirement | Priority |
|---|---|---|
| FR-2.1 | Authority/Analyst can register a hazard event (cyclone) with source, provenance tag, track geometry, metadata (wind, forward speed, timestamps) | Must |
| FR-2.2 | System shall enforce cyclone lifecycle: MONITORING → WARNING → EVAC_ORDERED → DEPLOYED → RESOLVED (+STAND_DOWN); transitions logged | Must |
| FR-2.3 | EVAC_ORDERED shall be rejected if any interlock flag is open | Must |
| FR-2.4 | Secondary hazard feeds (e.g. thermal anomalies) shall integrate into the unified risk model | Must |
| FR-2.5 | Every event displays source name, source publish time, and provenance badge | Must |

### 3.3 Area-wise Risk Engine
| ID | Requirement | Priority |
|---|---|---|
| FR-3.1 | System shall compute a 0–100 priority score per area (block) from 6 weighted factors (wind 30, rainfall+flood 20, surge 15, population 20, infrastructure 10, urgency 5) | Must |
| FR-3.2 | Each computed score shall include `reasons[]`: factor, weight, contribution, human-readable detail | Must |
| FR-3.3 | System shall rank areas per event and expose ranked list + per-area detail | Must |
| FR-3.4 | Missing inputs shall be reported as "unknown" and excluded from scoring (never defaulted to neutral 50) | Must |
| FR-3.5 | Engine recompute shall complete < 5s for ~500 blocks | Must |

### 3.4 Decision Interlocks
| ID | Requirement | Priority |
|---|---|---|
| FR-4.1 | Stale data (source age > 6h) → force REVIEW_REQUIRED; no auto-escalation | Must |
| FR-4.2 | Official IMD warning always supersedes model output; disagreements displayed, not hidden | Must |
| FR-4.3 | Route status shall never be PASSABLE without spatial evidence; missing data → UNKNOWN | Must |
| FR-4.4 | Dispatch recommendations clamped: units with readiness < 0.4 excluded | Must |
| FR-4.5 | All interlock events logged to audit trail | Must |

### 3.5 Relief-Logistics Layer
| ID | Requirement | Priority |
|---|---|---|
| FR-5.1 | System shall score strategic-asset exposure (ST_DWithin + distance decay × criticality) for asset types: relief stockpile, NDRF/Army base, helipad, fuel depot, hospital, shelter, port, rail head, telecom tower, substation | Must |
| FR-5.2 | System shall flag route segments by intersection length with hazard footprint: >50% = CUT, >10% = AT_RISK, else PASSABLE (with evidence text) | Must |
| FR-5.3 | System shall recommend a nearest-safe staging point per threatened area: safe depot outside footprint with intact route evidence | Must |
| FR-5.4 | Scope guard: no routing optimization, no scheduling | Must (negative req.) |

### 3.6 What-if Simulation
| ID | Requirement | Priority |
|---|---|---|
| FR-6.1 | Authority can drag/adjust cyclone track (or intensity ±20%) and re-run engine without persisting | Must |
| FR-6.2 | Map, ranked queue, asset panel, and route statuses re-rank live (< 2s) with updated reasons | Must |
| FR-6.3 | UI shall label what-if output as SIMULATED | Must |

### 3.7 Response Task Queue
| ID | Requirement | Priority |
|---|---|---|
| FR-7.1 | Authority/Analyst can create task (inspect / evacuate / resupply / stage_at) linked to area and/or asset, with rationale text | Must |
| FR-7.2 | Task lifecycle: proposed → approved → en_route → arrived → completed; responder updates own tasks | Must |
| FR-7.3 | All tasks carry `is_simulated: true` and visible SIMULATED badge | Must |
| FR-7.4 | Task list filterable by status, area, assignee | Should |

### 3.8 Situation Briefing (optional, AI)
| ID | Requirement | Priority |
|---|---|---|
| FR-8.1 | Generate a ≤6-line natural-language command briefing from structured risk output (event summary, top areas w/ reasons, threatened assets/routes, staging rec) | Should |
| FR-8.2 | Briefing generated via LLM API; on API failure, fall back to deterministic template from reasons[] | Must (fallback) |
| FR-8.3 | Briefing shall display provenance: "generated from MODEL_ESTIMATE data, 14:32 IST" | Must |

### 3.9 Data Ingestion & Fallback
| ID | Requirement | Priority |
|---|---|---|
| FR-9.1 | Ingestion adapters: IMD API, IMD CAP RSS, NASA FIRMS, each with source timestamp stored | Must |
| FR-9.2 | 4-tier cascade (live → CAP → cache → Fani replay); failure degrades gracefully, banner updates | Must |
| FR-9.3 | Malformed upstream rows (missing coords/date) rejected or flagged — never defaulted | Must |

### 3.10 Public Bulletin
| ID | Requirement | Priority |
|---|---|---|
| FR-10.1 | Public GET endpoint returns active alerts with area name, plain-language advisory, source attribution, timestamp | Must |
| FR-10.2 | Public endpoint read-only, rate-limited, no PII | Must |

---

## 4. Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-1 | **Reliability:** demo runs 100% offline from replay pack; zero external calls required for the scripted demo |
| NFR-2 | **Explainability:** every score has reasons[]; a judge can answer "why is this Priority 1?" from the UI alone |
| NFR-3 | **Provenance:** every number on screen carries a visible source + freshness badge |
| NFR-4 | **Security:** all mutating endpoints auth+role enforced; no path traversal; external API keys kept server-side only |
| NFR-5 | **Auditability:** append-only log; every state transition, task change, and interlock event recorded with user + timestamp |
| NFR-6 | **Performance:** dashboard first paint < 3s; what-if re-rank < 2s; area-risk endpoint < 1s (500 blocks) |
| NFR-7 | **Portability:** `docker compose up` works identically across developer environments |
| NFR-8 | **Honesty:** no UI text claims live data during replay; no "sealed ledger"/blockchain claims without implementation; no probability claims |

---

## 5. External Interfaces

| Interface | Direction | Notes |
|---|---|---|
| IMD API (api.imd.gov.in) | In | key in `.env`; cyclone products |
| IMD CAP RSS (S3 bucket) | In | open feed; parsed for warnings |
| NASA FIRMS | In | thermal hotspot data; key server-side |
| OSM Overpass / extracts | In | road network + facility context; cache + throttle |
| LLM API (briefing) | Out/In | free tier; template fallback; timeout < 10s |
| Bhuvan/NRSC layers | In (pre-downloaded) | flood susceptibility, elevation — static files |

---

## 6. Acceptance Criteria (MVP = demo-passable)

1. Register org + 3 users (authority/analyst/responder), each sees only permitted actions.
2. Load Fani 2019 replay → dashboard shows track, blocks colored by risk, ranked table with reasons.
3. Drag track inland → within 2s: map, ranking, asset panel, route statuses re-rank with updated reasons; banner reads SIMULATED.
4. Interlock demo: artificially stale the source → EVAC_ORDERED rejected with REVIEW_REQUIRED; audit log shows the event.
5. Create + approve a simulated resupply task → lifecycle transitions work, SIMULATED badge visible.
6. Kill wifi → entire scripted demo still passes.
7. README, ARCHITECTURE.md, DECISIONS.md, JUDGE_QA.md present in repo root; no clutter.
