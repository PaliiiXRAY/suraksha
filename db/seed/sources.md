# SURAKSHA — Offline Seed Data Pack Sources & Licensing
**Pack Directory:** `db/seed/data/`  
**Target Environment:** 100% Offline (Zero Required External Network Calls)  
**Total Pack Size:** ~110 KB (Strict limit: < 50 MB)  
**Verification Date:** 2026-10-30  
**Data Integrity:** All coordinates validated within Odisha Bounding Box [17.78°N - 22.73°N, 81.37°E - 87.53°E].  
**Honesty Contract:** Nothing in this pack is labelled `LIVE`. All records carry explicit provenance tags (`REPLAY`, `HISTORICAL`, or `OBSERVED`).

---

## 1. File Catalog & Provenance Breakdown

| File Name | Primary Source & Agency | Retrieval / Baseline Timestamp | License | Format | Size | Provenance Tag | Offline Ready |
|---|---|---|---|---|---|---|---|
| `fani_2019_track.geojson` | India Meteorological Department (IMD) Cyclone Warning Division, New Delhi | May 2019 Best Track Archive (verified 2026-10-30) | Government Open Data License - India (GODL) | GeoJSON FeatureCollection (Points & LineString) | ~17 KB | `REPLAY` | YES (Self-contained) |
| `fani_2019_warnings.json` | IMD National Weather Forecasting Centre (NWFC) Special Tropical Weather Outlines | May 1–3, 2019 Archive Bulletins | Government Open Data License - India (GODL) | JSON Bulletins Archive | ~4.0 KB | `REPLAY` | YES (Self-contained) |
| `odisha_blocks.geojson` | Ministry of Panchayati Raj — Local Government Directory (LGD) / Survey of India | 2019 Odisha Administrative Delimitation | Government Open Data License - India (GODL) / NDSAP | GeoJSON Polygon Collection (39 coastal/flood blocks) | ~61 KB | `HISTORICAL` | YES (Self-contained) |
| `block_population.csv` | Office of the Registrar General & Census Commissioner, India (Census 2011 + LGD 2019) | Census 2011 baseline with rural block extrapolations | Government Open Data License - India (GODL) | CSV (39 rows) | ~4.6 KB | `HISTORICAL` | YES (Self-contained) |
| `osm_roads_coastal_odisha.geojson` | OpenStreetMap contributors & National Highways Authority of India (NHAI) | 2026 OSM Vector Snapshot (Kendrapara, Balasore, Puri corridors) | Open Database License (ODbL) 1.0 | GeoJSON LineString Collection (13 major corridors) | ~11 KB | `OBSERVED` | YES (Self-contained) |
| `strategic_assets.csv` | Odisha State Disaster Management Authority (OSDMA) / National Health Mission / Port Authorities | 2019–2026 Multi-Agency Directory Curated Dataset | Public Domain / Open Government Data | CSV (42 rows) | ~9.3 KB | `OBSERVED` | YES (Self-contained) |

---

## 2. Detailed Source Documentation

### 2.1 `fani_2019_track.geojson`
- **Originating Body:** India Meteorological Department (IMD), Ministry of Earth Sciences, Govt. of India.
- **Reference Publication:** *Report on Cyclonic Disturbances Over North Indian Ocean During 2019*, RSMC-Tropical Cyclones New Delhi.
- **Content:** 20 chronological fix points capturing the full life cycle of Extremely Severe Cyclonic Storm (ESCS) Fani from Bay of Bengal cyclogenesis (26 April 2019) through landfall near Puri (3 May 2019, 08:30 IST; 19.8°N, 85.8°E, 115 knots / 215 km/h) to inland decay over West Bengal/Bangladesh.
- **Attributes:** `timestamp_utc`, `timestamp_ist`, `latitude`, `longitude`, `wind_speed_knots`, `wind_speed_kmh`, `central_pressure_hpa`, `cyclone_category`, `operational_stage`, `eye_radius_km`, `hazard_radius_90kmh_km`.
- **License Terms:** Released under the National Data Sharing and Accessibility Policy (NDSAP) / GODL-India. Free for public use with attribution.
- **Provenance Label:** `REPLAY`. Explicitly not live.

### 2.2 `fani_2019_warnings.json`
- **Originating Body:** IMD Cyclone Warning Division / National Disaster Management Authority (NDMA) dissemination bulletins.
- **Content:** Four official warning bulletins issued during the critical 48 hours preceding and during landfall:
  1. `CW/FANI/BULLETIN-12` (2019-05-01 11:30 IST) — Yellow Alert / Cyclone Alert.
  2. `CW/FANI/BULLETIN-18` (2019-05-02 08:30 IST) — Orange Alert / Landfall Warning & coastal evacuation advisory.
  3. `CW/FANI/BULLETIN-24` (2019-05-03 02:30 IST) — Red Alert / Post-Landfall Outlook & 2–3m storm surge alert.
  4. `CW/FANI/BULLETIN-28` (2019-05-03 11:30 IST) — Red Alert / Eye landfall occurrence & post-landfall road clearance directive.
- **License Terms:** Open Government Data License — India.
- **Provenance Label:** `REPLAY`.

### 2.3 `odisha_blocks.geojson`
- **Originating Body:** Local Government Directory (LGD), Ministry of Panchayati Raj, Government of India, cross-referenced with Bhuvan (ISRO National Remote Sensing Centre).
- **Content:** Geometric polygons representing 39 administrative blocks across 8 coastal and flood-prone districts: Puri, Jagatsinghpur, Kendrapara, Bhadrak, Balasore, Khordha, Cuttack, and Ganjam.
- **Attributes:** `area_code` (LGD identifier), `block_name`, `district`, `lgd_code`, `elevation_meters`, `flood_susceptibility_index` (derived from Bhuvan flood inundation hazard layers 2000–2018), `is_coastal` (boolean).
- **License Terms:** Government Open Data License - India (GODL).
- **Provenance Label:** `HISTORICAL`.

### 2.4 `block_population.csv`
- **Originating Body:** Office of the Registrar General & Census Commissioner, India (2011 Census of India, Primary Census Abstract for Odisha).
- **Content:** Population demographics mapped 1:1 to the 39 block polygons in `odisha_blocks.geojson`.
- **Attributes:** `area_code`, `block_name`, `district`, `total_population`, `vulnerable_population_u5_o65` (infants <5 and seniors >65 prioritised for evacuation), `household_count`, `pucca_house_ratio` (structural vulnerability factor).
- **License Terms:** Government Open Data License - India (GODL).
- **Provenance Label:** `HISTORICAL`.

### 2.5 `osm_roads_coastal_odisha.geojson`
- **Originating Body:** OpenStreetMap (OSM) contributors; National Highways Authority of India (NHAI); Odisha Works Department.
- **Content:** 13 critical arterial roads, National Highways (NH-16, NH-316, NH-53), State Highways (SH-60 Marine Drive, SH-9, SH-9A, SH-57), and designated cyclone evacuation corridors in Kendrapara, Balasore, and Puri.
- **Attributes:** `route_id`, `name`, `ref`, `highway_type`, `districts`, `surface`, `lanes`, `bridge_count`, `length_km`, `baseline_status` (`PASSABLE_WITH_EVIDENCE`).
- **License Terms:** Open Database License (ODbL) 1.0 (Attribution: © OpenStreetMap contributors).
- **Provenance Label:** `OBSERVED`.

### 2.6 `strategic_assets.csv`
- **Originating Body:** Curated compilation from public registries of Odisha State Disaster Management Authority (OSDMA), National Health Mission (NHM) Odisha, Paradip Port Trust (PPT), BPCL/IOCL/HPCL terminals, and OPTCL Grid Corporation of Odisha.
- **Content:** Exactly 42 strategic installations across 6 critical infrastructure tiers:
  - 10 Tertiary & District Hospitals / Trauma Centres
  - 10 Multi-Purpose Cyclone Shelters (MPCS)
  - 6 NDRF, ODRAF, Indian Coast Guard, Naval, and DRDO defense installations
  - 7 Central Logistics Stockpiles & FCI Grain Depots
  - 4 Major Commercial & Defense Ports / Harbors
  - 5 Strategic Bulk Fuel Terminals & Extra-High-Voltage (EHV) Power Grid Substations
- **Attributes:** `id`, `name`, `type`, `category`, `criticality` (1.0–5.0), `risk_weight` (1.0–5.0), `latitude`, `longitude`, `district`, `block_name`, `capacity`, `contact_channel`, `readiness` (0.0–1.0), `provenance_tag`.
- **Bounding Box Verification:** All 42 assets fall strictly inside Odisha geographic bounds:
  - Latitude: 19.2600°N to 21.6250°N (Bounds: 17.78°N – 22.73°N)
  - Longitude: 84.8600°E to 87.5050°E (Bounds: 81.37°E – 87.53°E)
- **License Terms:** Compiled from public government listings; factual data not subject to copyright.
- **Provenance Label:** `OBSERVED`.

---

## 3. Storage & Packaging Compliance

1. **Size Budget:** The total uncompressed size of `db/seed/data/` is **~107 KB**, which is less than 0.25% of the 50 MB budget ceiling.
2. **Offline Assurance:** The seed pack is pre-bundled in the git repository. When deployed on the demo machine or spun up in Docker, it requires **zero network requests** to initialize PostGIS tables and populate the command dashboard.
3. **No Phantom Live Labels:** Every record contains verifiable provenance metadata. The UI renders badges derived directly from these records, preventing accidental misrepresentation of historical data as live feeds.
