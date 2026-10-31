# 🛡️ SURAKSHA
### Satellite-to-Decision Disaster Intelligence & Prioritised Relief Logistics
**Track:** AI for Defence, Aerospace & National Security · **Zinnovatio 4.0**

[![Architecture](https://img.shields.io/badge/Architecture-Explainable%20Decision%20Engine-blue?style=flat-square)](#-decision-engine--scoring)
[![Geospatial](https://img.shields.io/badge/Database-PostgreSQL%2016%20%2B%20PostGIS-336791?style=flat-square&logo=postgresql)](https://postgis.net)
[![Backend](https://img.shields.io/badge/Backend-FastAPI%20%2B%20Python%203.11-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![Frontend](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite%20%2B%20MapLibre-38bdf8?style=flat-square)](https://maplibre.org)
[![Offline Demo](https://img.shields.io/badge/Demo-Offline%20Fani%20Replay%20Pack-success?style=flat-square)](#-offline-first-reliability)

---

## 🛰️ 30-Second Overview

> **"Official hazard systems tell you a cyclone is coming. They don't tell you *which block, which depot, which road to act on first*."**

**SURAKSHA** transforms multi-source hazard feeds (IMD bulletins, ISRO satellite telemetry) into an explainable, ranked operating picture for India's disaster command and response forces (NDRF, SDMA, Defence units). It identifies:
- **Which administrative blocks** have the highest operational urgency (0–100 score + auditable `reasons[]`)
- **Which strategic assets** (depots, helipads, hospitals, NDRF staging bases) are exposed
- **Which critical supply routes** (National Highways, evacuation corridors) are severed or passable
- **Where to stage nearest-safe relief resources** outside the hazard footprint

**The Core Differentiator:** Deterministic safety interlocks that refuse to auto-escalate on stale data, always defer to official IMD warnings, and explicitly tag every output with its provenance (`OFFICIAL_FORECAST`, `OBSERVED`, `MODEL_ESTIMATE`, `REPLAY`, `SIMULATED`, `INSUFFICIENT_DATA`).

---

## 🏛️ System Architecture

```text
               [EXTERNAL DATA CASCADE]
   IMD Bulletins / CAP Feed  +  ISRO Telemetry  +  OSM / Bhuvan
                              │
                              ▼
        ┌───────────────────────────────────────────┐
        │       4-Tier Fallback Cascade             │
        │  Tier 1: Live IMD / CAP Feed (or cached)  │
        │  Tier 2: Timestamped Local Cache          │
        │  Tier 3: Offline Cyclone Fani Replay Pack │
        │  Tier 4: INSUFFICIENT_DATA Safety Interlock│
        └─────────────────────┬─────────────────────┘
                              │
                              ▼
        ┌───────────────────────────────────────────┐
        │       Geospatial Core (PostGIS)           │
        │  • Odisha Administrative Blocks (Census)  │
        │  • Strategic Infrastructure & Depots      │
        │  • Supply Route Road/Evacuation Network   │
        └─────────────────────┬─────────────────────┘
                              │
                              ▼
        ┌───────────────────────────────────────────┐
        │       Risk & Decision Engine              │
        │  • 6-Factor Weighted Scoring              │
        │  • ST_DWithin Asset Exposure              │
        │  • ST_Intersection Route Cut Analysis    │
        │  • Safety Interlocks (Stale / IMD Wins)   │
        └─────────────────────┬─────────────────────┘
                              │
                              ▼
        ┌───────────────────────────────────────────┐
        │       Application Layer (FastAPI)         │
        │  • Org Boundary Isolation & RBAC          │
        │  • Cyclone State Machine & Audit Trail    │
        │  • Simulated Dispatch Queue               │
        │  • Deterministic Slot-Filled Briefing     │
        └─────────────────────┬─────────────────────┘
                              │
                              ▼
        ┌───────────────────────────────────────────┐
        │     Command Dashboard (React 18 + MapLibre)│
        │  • Dynamic Risk Choropleth & Track View   │
        │  • Live "What-If" Track Re-ranking (<10ms)│
        │  • Auditable Reasons Drawer & Provenance  │
        │  • Dual Dark / Light FireSense Theme      │
        └───────────────────────────────────────────┘
```

---

## 📁 Repository Structure

| Path | Purpose | Status |
|---|---|---|
| `backend/app/` | Authoritative FastAPI backend (routers, RBAC, PostGIS models, alembic migrations) | **Active & Authoritative** |
| `frontend-react/` | Modern React 18 + TypeScript + Vite frontend source code | **Active Source** |
| `static/` | Compiled production dashboard served by FastAPI at `http://localhost:8000/dashboard` | **Active Bundle** |
| `db/seed/` | Verified offline datasets (Fani track, Odisha blocks, curated assets, OSM roads) | **Active Data Pack** |
| `legacy/` | Frozen legacy prototype artifacts & flat scripts | *Archived / Frozen* |

---

## ⚡ Core Capabilities

### 1. Explainable Operational Prioritisation
Rather than opaque black-box models, SURAKSHA computes a transparent 0–100 operational urgency score across 6 weighted factors:
- **Forecast Wind Exposure (30%):** Wind field intersection with block geometry
- **Rainfall & Flood Susceptibility (20%):** Precip accumulation × terrain vulnerability
- **Storm Surge / Coastal Proximity (15%):** Landfall distance & coastal elevation
- **Population Exposure (20%):** Census population density
- **Critical Infrastructure Density (10%):** Strategic assets within 10 km
- **Urgency / Time-to-Impact (5%):** <24h, <48h windowing

Every single block outputs an auditable `reasons[]` array explaining exact contributions so commanders and judges can ask *"Why is Block X ranked #1?"* and get an immediate, verifiable answer.

### 2. Deterministic Safety Interlocks
- **Stale-Data Freeze:** If data age exceeds 6 hours, automated escalations are locked and the system forces `REVIEW_REQUIRED`.
- **IMD Authority Lock:** In any divergence between model estimates and official bulletins, official IMD alerts govern and the divergence is highlighted.
- **No Unverified Assumptions:** Route segments are never marked `PASSABLE` without spatial evidence; unknown segments default to `UNKNOWN`.

### 3. Spatial Relief Logistics Layer
- **Asset Vulnerability:** Evaluates hospitals, fuel stations, relief stockpiles, ports, and bases via `ST_DWithin` distance decay and criticality weights.
- **Route Status:** Intersects forecasted hazard footprints with transport links:
  - `> 50%` footprint intersection $\rightarrow$ **CUT**
  - `> 10%` footprint intersection $\rightarrow$ **AT_RISK**
  - Verified clear $\rightarrow$ **PASSABLE**
- **Nearest-Safe Staging:** Suggests secure staging hubs outside the hazard perimeter with verified intact routes.

### 4. Interactive "What-If" Track Re-ranking
Commanders can adjust projected storm tracks or intensity (±20%) in real time. The engine re-ranks all blocks, recalculates route severances, and repositions staging recommendations with client-side mathematical execution in **< 10 milliseconds** and server-side validation in **< 15 milliseconds**.

---

## 🔒 Role-Based Access Control & Organizational Scope

| Role | Target Persona | Key Capabilities |
|---|---|---|
| **Admin** | System / Agency IT Lead | Manage organization users, view audit logs, configure system boundaries |
| **Authority** | Disaster Commander (NDRF / SDMA) | Approve relief tasks, change cyclone lifecycle, execute what-if simulations |
| **Analyst** | Geospatial / Intelligence Analyst | Inspect risk factors, evaluate spatial layers, propose relief tasks |
| **Responder** | Field Team Lead | Access assigned operational tasks, update task progression (simulated) |
| **Public** | Citizen Portal | Read-only access to `/public/alerts` public safety advisories |

---

## 🚀 Quickstart & Local Setup

SURAKSHA runs fully containerized via Docker Compose.

### Prerequisites
- Docker & Docker Compose
- Python 3.11+ (if running tests locally)

### 1. Clone & Configure
```bash
git clone https://github.com/PaliiiXRAY/suraksha.git
cd suraksha
cp .env.example .env
```

### 2. Launch Stack
```bash
docker compose up -d
```
The stack will spin up:
- **Database:** PostgreSQL with PostGIS at `localhost:5432`
- **Backend API:** FastAPI with automated OpenAPI docs at `http://localhost:8000/docs`
- **Dashboard:** Interactive Command Interface served at `http://localhost:8000/dashboard`

### 3. Run Test Suite
```bash
# Run in-container (PostGIS + dependencies fully configured)
docker compose exec backend python -m pytest -q

# 400+ unit and integration tests passing across cyclone risk engine, spatial exposure, state machine, safety interlocks, and API contracts.
```

### 4. Seed Offline Demo Fixtures
```bash
docker compose exec backend python seed_demo.py --scenario all
```

---

## 🎯 Offline-First Reliability & Data Pack
Network connectivity at disaster response sites and hackathon venues is notoriously fragile. SURAKSHA guarantees **100% offline demonstration capability** through a pre-packaged, timestamped **Cyclone Fani (May 2019) Replay Pack** (`db/seed/data/`). The entire spatial engine, route analysis, what-if simulation, and situation brief run completely locally without requiring external network connectivity.

### Pre-Seeded Offline Pack (`db/seed/data/` · Total Size: ~110 KB)
| File | Description | Source & License | Tag |
|---|---|---|---|
| `fani_2019_track.geojson` | 20 chronological fix points (April 26 – May 4, 2019) with landfall at Puri | IMD Cyclone Warning Division (GODL-India) | `REPLAY` |
| `fani_2019_warnings.json` | 4 official warning bulletins with stage, wind, and surge alerts | IMD National Weather Forecasting Centre (GODL-India) | `REPLAY` |
| `odisha_blocks.geojson` | 39 administrative block polygons across 8 coastal/flood districts | Local Government Directory (LGD) / Census (GODL) | `HISTORICAL` |
| `block_population.csv` | 39 block demographics: total & vulnerable (u5/o65) population | Office of Registrar General / Census 2011 (GODL) | `HISTORICAL` |
| `osm_roads_coastal_odisha.geojson` | 13 arterial and evacuation corridors in Kendrapara, Balasore, Puri | OpenStreetMap contributors (ODbL 1.0) | `OBSERVED` |
| `strategic_assets.csv` | 42 curated installations (hospitals, shelters, NDRF bases, fuel, ports) | Curated from OSDMA / NHM / PPT Public Registries | `OBSERVED` |

Full per-file metadata, retrieval dates, and legal licenses are cataloged in [`db/seed/sources.md`](db/seed/sources.md).

---

## 🏷️ Provenance Badges (Zero Illusions)

Every score, track fix, road segment, and dispatch task carries one of five canonical tags plus one safety fallback (detailed in [`docs/PROVENANCE_SPEC.md`](docs/PROVENANCE_SPEC.md)):
- `OFFICIAL_FORECAST` — Direct, unmanipulated forecast from IMD (governs all decisions)
- `OBSERVED` — Physical ground truth (OSM roads, curated public registries)
- `MODEL_ESTIMATE` — Algorithmic priority score (0–100) or route cut ratio
- `REPLAY` — Historical Cyclone Fani verification pack
- `SIMULATED` — What-if perturbation or simulated responder task
- `INSUFFICIENT_DATA` — Safety gate fallback when telemetry is stale (>6h) or missing

---

## 📚 Essential Documentation
- **[5-Minute Timed Demo Script](docs/DEMO_SCRIPT.md):** Minute-by-minute walkthrough hit for hit.
- **[Presentation Slides](docs/SLIDES.md):** 10-slide high-impact deck for the Defence & Aerospace track.
- **[Judge Q&A Defense Guide](docs/JUDGE_QA.md):** 20 battle-tested questions with bold answers.
- **[Rehearsal & Drill Guide](docs/REHEARSAL_GUIDE.md):** Team timing and contingency ladder.
- **[System Architecture](ARCHITECTURE.md):** Technical design, data flows, and container diagrams.
- **[Architectural Decisions Log (ADR)](DECISIONS.md):** Architectural decisions (D1–D20).

---

## 📜 The Honesty Contract

1. **Priority Score $\neq$ Probability:** The 0–100 score is an operational urgency indicator, never a probability of occurrence.
2. **Simulated Response Tasks:** All dispatches and operational tasks are explicitly tagged with `is_simulated: true`.
3. **Transparent Provenance:** Every metric displays an explicit badge: `OFFICIAL_FORECAST`, `OBSERVED`, `MODEL_ESTIMATE`, `REPLAY`, or `SIMULATED`.
4. **Official System Integration:** SURAKSHA is designed to supplement and convert official warnings (IMD/ISRO/NDMA) into actionable logistics—never to override or replace official warning mandates.
