# 🛡️ SURAKSHA
### Satellite-to-Decision Disaster Intelligence & Prioritised Relief Logistics
**Track:** AI for Defence, Aerospace & National Security · **Zinnovatio 4.0**

[![Architecture](https://img.shields.io/badge/Architecture-Explainable%20Decision%20Engine-blue?style=flat-square)](#-decision-engine--scoring)
[![Geospatial](https://img.shields.io/badge/Database-PostgreSQL%2016%20%2B%20PostGIS-336791?style=flat-square&logo=postgresql)](https://postgis.net)
[![Backend](https://img.shields.io/badge/Backend-FastAPI%20%2B%20Python%203.11-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![Frontend](https://img.shields.io/badge/Frontend-Build--less%20MapLibre%20%2B%20Tailwind-38bdf8?style=flat-square)](https://maplibre.org)
[![Offline Demo](https://img.shields.io/badge/Demo-Offline%20Fani%20Replay%20Pack-success?style=flat-square)](#-offline-first-reliability)

---

## 🛰️ 30-Second Overview

> **"Official hazard systems tell you a cyclone is coming. They don't tell you *which block, which depot, which road to act on first*."**

**SURAKSHA** transforms multi-source hazard feeds (IMD, ISRO MOSDAC, satellite telemetry) into an explainable, ranked operating picture for India's disaster command and response forces (NDRF, SDMA, Defence units). It identifies:
- **Which administrative blocks** have the highest operational urgency (0–100 score + auditable `reasons[]`)
- **Which strategic assets** (depots, helipads, hospitals, NDRF staging bases) are exposed
- **Which critical supply routes** (National Highways, rail corridors) are severed or passable
- **Where to stage nearest-safe relief resources** outside the hazard footprint

**The Core Differentiator:** Deterministic safety interlocks that refuse to auto-escalate on stale data, always defer to official IMD warnings, and explicitly tag every output with its provenance (`OFFICIAL_FORECAST`, `MODEL_ESTIMATE`, `REPLAY`, `SIMULATED`).

---

## 🏛️ System Architecture

```text
               [EXTERNAL DATA CASCADE]
   IMD API / CAP Alert Feed  +  ISRO MOSDAC  +  OSM / Bhuvan
                              │
                              ▼
        ┌───────────────────────────────────────────┐
        │       4-Tier Fallback Cascade             │
        │  Tier 1: Live IMD API                     │
        │  Tier 2: IMD CAP RSS Feed                 │
        │  Tier 3: Timestamped Local Cache          │
        │  Tier 4: Offline Cyclone Fani Replay Pack │
        └─────────────────────┬─────────────────────┘
                              │
                              ▼
        ┌───────────────────────────────────────────┐
        │       Geospatial Core (PostGIS)           │
        │  • Odisha Administrative Blocks (Census)  │
        │  • Strategic Infrastructure & Depots      │
        │  • Supply Route Road/Rail Network         │
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
        │  • Org-Scoped RBAC (Authority/Analyst)    │
        │  • Cyclone State Machine & Audit Trail    │
        │  • Simulated Dispatch Queue               │
        │  • Natural-Language Situation Briefing    │
        └─────────────────────┬─────────────────────┘
                              │
                              ▼
        ┌───────────────────────────────────────────┐
        │       Command Dashboard (MapLibre GL)     │
        │  • Dynamic Risk Chloropleth & Track View  │
        │  • Live "What-If" Track Re-ranking (<2s)  │
        │  • Auditable Reasons Drawer & Provenance  │
        └───────────────────────────────────────────┘
```

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
Commanders can adjust projected storm tracks or intensity (±20%) in real time. The engine re-ranks all blocks, recalculates route severances, and repositions staging recommendations across the entire operational picture in under **2 seconds**.

---

## 🔒 Multi-Tenant Role-Based Access Control (RBAC)

| Role | Target Persona | Key Capabilities |
|---|---|---|
| **Admin** | System / Agency IT Lead | Manage organization users, audit logs, and configurations |
| **Authority** | Disaster Commander (NDRF / SDMA) | Approve relief tasks, change cyclone lifecycle, execute what-if simulations |
| **Analyst** | Geospatial / Intelligence Analyst | Inspect risk factors, evaluate spatial layers, propose relief tasks |
| **Responder** | Field Team Lead | Access assigned operational tasks, update task progression |
| **Public** | Citizen Portal | Read-only access to `/public/alerts` public safety advisories |

---

## 🚀 Quickstart & Local Setup

SURAKSHA runs fully containerized via Docker Compose. No local Node toolchains or GPUs are needed.

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
- **Database:** PostgreSQL 16 with PostGIS at `localhost:5432`
- **Backend API:** FastAPI with automated OpenAPI docs at `http://localhost:8000/docs`
- **Dashboard:** Interactive Command Interface served at `http://localhost:8000`

### 3. Run Test Suite
```bash
pytest -v
```

---

## 🎯 Offline-First Reliability

Network connectivity at disaster response sites and hackathon venues can be unreliable. SURAKSHA guarantees **100% offline demonstration capability** through a pre-packaged, timestamped **Cyclone Fani (May 2019) Replay Pack**. The entire spatial engine, route analysis, and what-if simulation run completely locally without requiring external network connectivity.

---

## 📜 The Honesty Contract

1. **Priority Score $\neq$ Probability:** The 0–100 score is an operational urgency indicator, never a probability of occurrence.
2. **Simulated Response Tasks:** All dispatches and operational tasks are explicitly tagged with `is_simulated: true`.
3. **Transparent Provenance:** Every metric displays an explicit badge: `OFFICIAL_FORECAST`, `MODEL_ESTIMATE`, `REPLAY`, or `SIMULATED`.
4. **Official System Integration:** SURAKSHA is designed to supplement and convert official warnings (IMD/ISRO/NDMA) into actionable logistics—never to override or replace official warning mandates.
