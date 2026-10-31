"""
SURAKSHA — Authoritative Cyclone Decision Support & Simulation Router (Consolidated M1/M2/M3).
ARCHITECTURE.md §4, §5, §7; docs/SRS.md FR-3, FR-5, FR-6, FR-8; docs/PROVENANCE_SPEC.md.

Authoritative endpoints:
- GET /area-risk: Explainable 6-factor risk prioritization ranking per administrative block.
- GET /asset-exposure: Strategic civil/defense infrastructure exposure within hazard radius.
- POST /what-if: Non-persistent real-time track and intensity re-ranking (sub-2s target, zero DB mutations).
- GET /briefing: 6-line deterministic command situation briefing using M4 briefing_template.py.

Dual-Mode Operation:
1. Authenticated / Database-Backed Mode: Enforces strict tenant isolation, PostgreSQL spatial queries,
   and deterministic M1 area risk scoring.
2. Replay / Demo Fixture Fallback: Serves offline cached Cyclone Fani replay pack for unauthenticated
   dashboard exploration when event_id is omitted.
"""
from datetime import datetime, timezone
import json
import math
import os
import time
from typing import Any, Dict, List, Optional
import uuid

from fastapi import APIRouter, Body, Depends, Query, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.app.core.auth import security_scheme
from backend.app.core.errors import (
    bad_request_error,
    forbidden_error,
    not_found_error,
    unauthenticated_error,
    validation_error,
)
from backend.app.core.security import decode_access_token
from backend.app.db.session import get_db
from backend.app.models.cyclone import Area, AreaRisk, HazardEvent, StrategicAsset, SupplyRoute
from backend.app.models.user import User
from backend.app.schemas.cyclone import (
    AreaRiskItemSchema,
    AreaRiskListResponse,
    AssetExposureItemSchema,
    AssetExposureListResponse,
    BriefingResponse,
    FactorReasonSchema,
    WhatIfRequest,
    WhatIfResponse,
)
from backend.app.services.cyclone.interlocks import evaluate_source_freshness
from backend.app.services.risk.area_engine import calculate_area_risk
from backend.app.services.risk.briefing_template import generate_situation_briefing
from backend.app.services.risk.exposure import (
    assess_asset_exposure_spatial,
    assess_route_status_spatial,
    recommend_staging_hub,
    STATUS_HIGH_EXPOSURE,
    STATUS_IMPACTED,
    STATUS_MONITORED,
)

router = APIRouter(tags=["cyclone"])

FIXTURE_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))),
    "static", "fixtures", "cyclone_contract_fixture.json"
)


def _load_fixture() -> Dict[str, Any]:
    """Load cached Cyclone Fani replay fixture for offline demo fallback."""
    if os.path.exists(FIXTURE_PATH):
        with open(FIXTURE_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def _get_optional_user(request: Request, db: Session) -> Optional[User]:
    """Extract authenticated User from Bearer token if present, else None."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None

    token = auth_header.split(" ", 1)[1].strip()
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub") or payload.get("user_id")
        email = payload.get("email")
        if user_id:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                return user
        if email:
            return db.query(User).filter(User.email == email).first()
    except Exception:
        pass
    return None


def _check_org_access(user: Optional[User], event: Optional[HazardEvent] = None) -> Optional[int]:
    """
    Enforce tenant isolation when an authenticated context or event is provided.
    Raises HTTP 403 on tenant violation or missing org assignment.
    """
    if user is not None:
        if user.org_id is None:
            raise forbidden_error(
                "Access forbidden: User is not assigned to any organization",
                code="FORBIDDEN_NO_ORG",
            )
        if event is not None and event.org_id != user.org_id:
            raise forbidden_error(
                f"Access forbidden: Hazard event '{event.id}' belongs to another organization",
                code="FORBIDDEN_CROSS_ORG",
            )
        return user.org_id
    return None


def _extract_hazard_coords(db: Session, event: HazardEvent) -> tuple[float, float]:
    """Extract hazard coordinates from track_geometry or default to Puri (19.8135, 85.8312)."""
    if event.track_geometry is not None:
        row = db.execute(
            text("SELECT ST_Y(ST_StartPoint(track_geometry)) AS lat, ST_X(ST_StartPoint(track_geometry)) AS lon FROM hazard_events WHERE id = :id"),
            {"id": event.id},
        ).fetchone()
        if row and row.lat is not None and row.lon is not None:
            return float(row.lat), float(row.lon)
    return 19.8135, 85.8312


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Spherical distance in km for pure in-memory fixture calculations."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2.0) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2.0) ** 2)
    return R * 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))


# ---------------------------------------------------------------------------
# 1. GET /area-risk
# ---------------------------------------------------------------------------

@router.get("/area-risk")
def get_area_risk(
    request: Request,
    event_id: Optional[str] = Query(None, description="Hazard Event ID"),
    limit: int = Query(50, ge=1, le=500, description="Page limit"),
    offset: int = Query(0, ge=0, description="Page offset"),
    min_score: Optional[float] = Query(None, ge=0.0, le=100.0, description="Filter minimum risk score"),
    district: Optional[str] = Query(None, description="Filter by district name"),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Returns ranked area risk priority scores with 6-factor reasons.
    Supports both database-backed multi-tenant queries (with event_id) and offline demo fixture fallback.
    """
    user = _get_optional_user(request, db)

    # Mode A: Specific Database-Backed Hazard Event
    if event_id:
        event = db.query(HazardEvent).filter(HazardEvent.id == event_id.strip()).first()
        if not event:
            raise not_found_error(f"Hazard event '{event_id}' not found", code="NOT_FOUND")

        _check_org_access(user, event)

        query = (
            db.query(AreaRisk, Area.block_name, Area.district)
            .join(Area, AreaRisk.area_code == Area.area_code)
            .filter(AreaRisk.event_id == event.id)
        )
        if district:
            query = query.filter(Area.district.ilike(f"%{district.strip()}%"))
        if min_score is not None:
            query = query.filter(AreaRisk.score >= min_score)

        total = query.count()
        rows = query.order_by(AreaRisk.score.desc()).offset(offset).limit(limit).all()

        items: List[Dict[str, Any]] = []
        ranked_blocks: List[Dict[str, Any]] = []

        if rows:
            for ar, block_name, dist_name in rows:
                reasons_data = [
                    {
                        "factor": r.get("factor", "unknown"),
                        "weight": r.get("weight", 0.0),
                        "contribution": r.get("contribution", 0.0),
                        "detail": r.get("detail", ""),
                    }
                    for r in (ar.reasons or [])
                ]
                item_dict = {
                    "area_code": ar.area_code,
                    "area_name": block_name,
                    "district": dist_name,
                    "score": ar.score,
                    "rank": ar.rank,
                    "reasons": reasons_data,
                    "interlock_flags": ar.interlock_flags or [],
                    "provenance_tag": ar.provenance_tag or "MODEL_ESTIMATE",
                }
                items.append(item_dict)
                ranked_blocks.append({
                    "block_name": block_name,
                    "area_code": ar.area_code,
                    "district": dist_name,
                    "score": ar.score,
                    "rank": ar.rank,
                    "reasons": reasons_data,
                    "provenance_tag": ar.provenance_tag or "MODEL_ESTIMATE",
                })
        else:
            # Dynamic calculation from Area baseline
            areas_q = db.query(Area)
            if district:
                areas_q = areas_q.filter(Area.district.ilike(f"%{district.strip()}%"))
            areas = areas_q.all()

            computed = []
            for a in areas:
                res = calculate_area_risk(
                    area_code=a.area_code,
                    wind_kmh=event.max_wind_kmh,
                    rainfall_mm=120.0 if a.is_coastal else 60.0,
                    flood_susceptibility=a.flood_susceptibility,
                    total_population=a.total_population,
                    vulnerable_population=a.vulnerable_population,
                    is_coastal=a.is_coastal,
                    distance_to_landfall_km=15.0 if a.is_coastal else None,
                    asset_count_10km=2 if a.is_coastal else 1,
                    hours_to_landfall=18.0,
                    source_timestamp=event.source_timestamp,
                )
                computed.append((a, res))

            computed.sort(key=lambda x: x[1].score, reverse=True)
            if min_score is not None:
                computed = [c for c in computed if c[1].score >= min_score]

            total = len(computed)
            paged = computed[offset : offset + limit]

            for rank_idx, (a, res) in enumerate(paged, start=offset + 1):
                reasons_data = [
                    {
                        "factor": r.factor,
                        "weight": r.weight,
                        "contribution": r.contribution,
                        "detail": r.detail,
                    }
                    for r in res.reasons
                ]
                item_dict = {
                    "area_code": a.area_code,
                    "area_name": a.block_name,
                    "district": a.district,
                    "score": res.score,
                    "rank": rank_idx,
                    "reasons": reasons_data,
                    "interlock_flags": list(res.interlock_flags),
                    "provenance_tag": res.provenance_tag,
                }
                items.append(item_dict)
                ranked_blocks.append({
                    "block_name": a.block_name,
                    "area_code": a.area_code,
                    "district": a.district,
                    "score": res.score,
                    "rank": rank_idx,
                    "reasons": reasons_data,
                    "provenance_tag": res.provenance_tag,
                })

        return {
            "event_id": event.id,
            "event_name": event.name,
            "lifecycle_state": event.status,
            "total": total,
            "items": items,
            "ranked_blocks": ranked_blocks,
            "provenance_tag": event.provenance_tag,
        }

    # Mode B: Cached Replay / Demo Fixture Fallback
    data = _load_fixture()
    blocks = data.get("ranked_blocks", [])

    items = []
    for idx, b in enumerate(blocks, start=1):
        items.append({
            "area_code": b.get("area_code", f"BLK_{idx}"),
            "area_name": b.get("block_name", "Unknown Block"),
            "district": b.get("district", "Odisha"),
            "score": b.get("score", 0.0),
            "rank": b.get("rank", idx),
            "reasons": b.get("reasons", []),
            "interlock_flags": [],
            "provenance_tag": "MODEL_ESTIMATE",
        })

    return {
        "event_id": data.get("event_id", "fani_2019"),
        "event_name": data.get("event_name", "Cyclone Fani (May 2019)"),
        "lifecycle_state": data.get("lifecycle_state", "WARNING"),
        "landfall": data.get("landfall", {}),
        "total": len(blocks),
        "items": items,
        "ranked_blocks": blocks,
        "provenance_tag": "MODEL_ESTIMATE",
    }


# ---------------------------------------------------------------------------
# 2. GET /asset-exposure
# ---------------------------------------------------------------------------

@router.get("/asset-exposure")
def get_asset_exposure(
    request: Request,
    event_id: Optional[str] = Query(None, description="Hazard Event ID"),
    asset_type: Optional[str] = Query(None, description="Filter by asset type (hospital, shelter, etc.)"),
    max_distance_km: float = Query(10.0, ge=0.1, le=100.0, description="Max exposure distance buffer in km"),
    min_criticality: Optional[float] = Query(None, ge=0.0, description="Minimum asset criticality threshold"),
    limit: int = Query(50, ge=1, le=200, description="Page limit"),
    offset: int = Query(0, ge=0, description="Page offset"),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Returns strategic civil/defense infrastructure asset exposure within hazard radius.
    Computes distance decay: criticality * (1 - distance_km / 10).
    """
    user = _get_optional_user(request, db)

    hazard_lat = 19.8135
    hazard_lon = 85.8312
    resolved_event_id = "fani_2019"

    if event_id:
        event = db.query(HazardEvent).filter(HazardEvent.id == event_id.strip()).first()
        if not event:
            raise not_found_error(f"Hazard event '{event_id}' not found", code="NOT_FOUND")

        _check_org_access(user, event)
        resolved_event_id = event.id
        hazard_lat, hazard_lon = _extract_hazard_coords(db, event)

    raw_assets = assess_asset_exposure_spatial(
        db,
        hazard_lat=hazard_lat,
        hazard_lon=hazard_lon,
        max_distance_km=max_distance_km,
    )

    filtered = raw_assets
    if asset_type:
        filtered = [a for a in filtered if a.asset_type.lower() == asset_type.strip().lower()]
    if min_criticality is not None:
        filtered = [a for a in filtered if a.criticality >= min_criticality]

    total = len(filtered)
    paged = filtered[offset : offset + limit]

    items = [
        {
            "asset_id": a.asset_id,
            "name": a.name,
            "asset_type": a.asset_type,
            "criticality": a.criticality,
            "latitude": a.latitude,
            "longitude": a.longitude,
            "distance_to_track_km": round(a.distance_km, 3),
            "inside_hazard_footprint": (a.distance_km <= 5.0),
            "exposure_score": round(a.decay_score, 3),
            "status": a.exposure_status,
            "provenance_tag": a.provenance_tag,
        }
        for a in paged
    ]

    return {
        "event_id": resolved_event_id,
        "total": total,
        "items": items,
        "assets": items,
    }


# ---------------------------------------------------------------------------
# 3. POST /what-if
# ---------------------------------------------------------------------------

@router.post("/what-if")
def post_what_if(
    request: Request,
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Non-persistent What-If spatial recompute.
    Perturbs landfall and intensity, returning re-ranked blocks and route cuts in sub-2s.
    Leaves persistent database state 100% unchanged.
    """
    start_time = time.perf_counter()
    user = _get_optional_user(request, db)

    # 1. Parameter Validation
    intensity_delta_pct = 0.0
    lat_offset = 0.0
    lon_offset = 0.0
    track_shift_km = 0.0

    if "intensity_delta_pct" in payload:
        intensity_delta_pct = float(payload.get("intensity_delta_pct", 0.0))
    elif "wind_delta_percent" in payload:
        intensity_delta_pct = float(payload.get("wind_delta_percent", 0.0))

    if abs(intensity_delta_pct) > 50.0:
        raise validation_error(
            f"intensity_delta_pct ({intensity_delta_pct}) exceeds safe simulation bounds [-50, +50]%",
            code="INVALID_INTENSITY_BOUNDS",
        )

    if "track_perturbation" in payload:
        t_pert = payload.get("track_perturbation") or {}
        lat_offset = float(t_pert.get("lat_offset", 0.0))
        lon_offset = float(t_pert.get("lon_offset", 0.0))
        if abs(lat_offset) > 5.0 or abs(lon_offset) > 5.0:
            raise validation_error(
                "track_perturbation lat/lon offset exceeds safe simulation bounds [-5.0, +5.0] degrees",
                code="INVALID_TRACK_BOUNDS",
            )
        track_shift_km = math.sqrt((lat_offset * 111.0) ** 2 + (lon_offset * 104.0) ** 2)
    elif "track_shift_km" in payload:
        track_shift_km = float(payload.get("track_shift_km", 0.0))
        lat_offset = (track_shift_km * 0.707) / 111.0
        lon_offset = (track_shift_km * 0.707) / 104.0

    event_id = payload.get("event_id")

    # Mode A: Database-backed Event Simulation
    if event_id:
        event = db.query(HazardEvent).filter(HazardEvent.id == str(event_id).strip()).first()
        if not event:
            raise not_found_error(f"Hazard event '{event_id}' not found", code="NOT_FOUND")

        _check_org_access(user, event)

        base_wind = event.max_wind_kmh or 150.0
        sim_wind = max(0.0, base_wind * (1.0 + intensity_delta_pct / 100.0))
        base_lat, base_lon = _extract_hazard_coords(db, event)
        sim_lat = base_lat + lat_offset
        sim_lon = base_lon + lon_offset

        # Recalculate area risk in memory (Zero DB write!)
        areas = db.query(Area).limit(39).all()
        recalculated = []
        top_areas = []
        interlock_flags: List[str] = []

        for a in areas:
            res = calculate_area_risk(
                area_code=a.area_code,
                wind_kmh=sim_wind,
                rainfall_mm=160.0 if a.is_coastal else 80.0,
                flood_susceptibility=a.flood_susceptibility,
                total_population=a.total_population,
                vulnerable_population=a.vulnerable_population,
                is_coastal=a.is_coastal,
                distance_to_landfall_km=max(0.0, abs(sim_lat - 19.80) * 111.0) if a.is_coastal else None,
                asset_count_10km=3 if a.is_coastal else 1,
                hours_to_landfall=14.0,
                source_timestamp=event.source_timestamp,
            )
            if res.interlock_flags:
                interlock_flags.extend(res.interlock_flags)

            reasons_dict = [
                {
                    "factor": r.factor,
                    "weight": r.weight,
                    "contribution": r.contribution,
                    "detail": r.detail,
                }
                for r in res.reasons
            ]
            item = {
                "area_code": a.area_code,
                "area_name": a.block_name,
                "block_name": a.block_name,
                "district": a.district,
                "score": res.score,
                "rank": 1,
                "reasons": reasons_dict,
                "interlock_flags": list(res.interlock_flags),
                "provenance_tag": "SIMULATED",
            }
            top_areas.append(item)
            recalculated.append(item)

        top_areas.sort(key=lambda x: x["score"], reverse=True)
        for idx, item in enumerate(top_areas, start=1):
            item["rank"] = idx

        # Recalculate asset exposure via read-only PostGIS query
        raw_assets = assess_asset_exposure_spatial(db, hazard_lat=sim_lat, hazard_lon=sim_lon, max_distance_km=15.0)
        threatened_assets = [
            {
                "asset_id": a.asset_id,
                "name": a.name,
                "asset_type": a.asset_type,
                "criticality": a.criticality,
                "latitude": a.latitude,
                "longitude": a.longitude,
                "distance_to_track_km": round(a.distance_km, 3),
                "inside_hazard_footprint": (a.distance_km <= 5.0),
                "exposure_score": round(a.decay_score, 3),
                "status": a.exposure_status,
                "provenance_tag": "SIMULATED",
            }
            for a in raw_assets[:10]
        ]

        # Recalculate route status
        sim_wkt = f"POLYGON(({sim_lon - 0.15} {sim_lat - 0.15}, {sim_lon + 0.15} {sim_lat - 0.15}, {sim_lon + 0.15} {sim_lat + 0.15}, {sim_lon - 0.15} {sim_lat + 0.15}, {sim_lon - 0.15} {sim_lat - 0.15}))"
        raw_routes = assess_route_status_spatial(
            db,
            hazard_wkt=sim_wkt,
            source_timestamp=event.source_timestamp,
            has_verified_clearance=False,
        )
        route_statuses = [
            {
                "route_id": r.route_id,
                "name": r.name,
                "route_type": r.route_type,
                "status": r.status,
                "affected_ratio": r.affected_ratio,
                "evidence": r.evidence,
                "provenance_tag": "SIMULATED",
            }
            for r in raw_routes[:5]
        ]

        staging_rec = recommend_staging_hub(db, hazard_lat=sim_lat, hazard_lon=sim_lon, hazard_radius_km=15.0)
        staging_dict = staging_rec.to_dict() if staging_rec else None
        if staging_dict:
            staging_dict["provenance_tag"] = "SIMULATED"

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        return {
            "simulation_id": f"sim_{uuid.uuid4().hex[:8]}",
            "event_id": event.id,
            "is_simulated": True,
            "provenance_tag": "SIMULATED",
            "execution_time_ms": round(elapsed_ms, 2),
            "hazard_summary": {
                "event_id": event.id,
                "original_max_wind_kmh": base_wind,
                "simulated_max_wind_kmh": round(sim_wind, 1),
                "original_center": [base_lat, base_lon],
                "simulated_center": [round(sim_lat, 4), round(sim_lon, 4)],
                "intensity_delta_pct": intensity_delta_pct,
                "lat_offset": lat_offset,
                "lon_offset": lon_offset,
            },
            "perturbed_landfall": {
                "lat": round(sim_lat, 4),
                "lon": round(sim_lon, 4),
                "peak_wind_kmh": round(sim_wind, 1),
                "track_shift_km": round(track_shift_km, 1),
                "wind_delta_percent": intensity_delta_pct,
            },
            "top_areas": top_areas[:5],
            "ranked_blocks": top_areas,
            "top_block": top_areas[0]["block_name"] if top_areas else None,
            "threatened_assets": threatened_assets,
            "route_statuses": route_statuses,
            "staging_recommendation": staging_dict,
            "interlock_flags": list(dict.fromkeys(interlock_flags)),
        }

    # Mode B: Fixture-based In-Memory Recompute (M3 contract)
    data = _load_fixture()
    base_lat = data.get("landfall", {}).get("lat", 19.78)
    base_lon = data.get("landfall", {}).get("lon", 85.82)
    base_wind = data.get("landfall", {}).get("peak_wind_kmh", 215.0)

    eye_lat = base_lat + lat_offset
    eye_lon = base_lon + lon_offset
    effective_wind = base_wind * (1.0 + (intensity_delta_pct / 100.0))

    blocks = data.get("ranked_blocks", [])
    recalculated = []
    for b in blocks:
        b_copy = dict(b)
        c_lat = b.get("center_lat", 19.8)
        c_lon = b.get("center_lon", 85.8)
        dist = _haversine_km(eye_lat, eye_lon, c_lat, c_lon)
        local_wind = effective_wind * math.exp(-dist / 65.0)

        wind_score = min(30.0, (local_wind / effective_wind) * 30.0)
        flood_idx = b.get("flood_susceptibility_index", 0.75)
        rain_score = min(20.0, (flood_idx * 0.6 + math.exp(-dist / 120.0) * 0.4) * 20.0)
        surge_score = 15.0 * max(0.0, 1.0 - (dist / 70.0)) if b.get("is_coastal") else 0.0
        pop_score = 16.5
        infra_score = 8.5
        urgency_score = 5.0 if dist < 30 else (3.0 if dist < 80 else 1.5)

        total_score = min(100.0, round(wind_score + rain_score + surge_score + pop_score + infra_score + urgency_score, 1))

        b_copy["score"] = total_score
        b_copy["distance_km"] = round(dist, 1)
        b_copy["provenance_tag"] = "SIMULATED"
        b_copy["reasons"] = [
            {"factor": "wind_exposure", "weight": 30, "contribution": round(wind_score, 1), "detail": f"Forecast peak wind {int(local_wind)} km/h (proximity {round(dist, 1)} km)"},
            {"factor": "rainfall_flood", "weight": 20, "contribution": round(rain_score, 1), "detail": f"Terrain deluge susceptibility {flood_idx}"},
            {"factor": "storm_surge", "weight": 15, "contribution": round(surge_score, 1), "detail": f"Direct coastal littoral surge {round(surge_score, 1)} pts"},
            {"factor": "population_exposure", "weight": 20, "contribution": round(pop_score, 1), "detail": "Exposed census population"},
            {"factor": "critical_infrastructure", "weight": 10, "contribution": round(infra_score, 1), "detail": "Hospitals & shelters inside block"},
            {"factor": "urgency_window", "weight": 5, "contribution": round(urgency_score, 1), "detail": "Immediate impact window"}
        ]
        recalculated.append(b_copy)

    recalculated.sort(key=lambda x: x["score"], reverse=True)
    elapsed_ms = (time.perf_counter() - start_time) * 1000.0

    return {
        "simulation_id": f"sim_{uuid.uuid4().hex[:8]}",
        "event_id": data.get("event_id", "fani_2019"),
        "is_simulated": True,
        "provenance_tag": "SIMULATED",
        "execution_time_ms": round(elapsed_ms, 2),
        "perturbed_landfall": {
            "lat": eye_lat,
            "lon": eye_lon,
            "peak_wind_kmh": round(effective_wind, 1),
            "track_shift_km": track_shift_km,
            "wind_delta_percent": intensity_delta_pct,
        },
        "top_areas": recalculated[:5],
        "ranked_blocks": recalculated,
        "top_block": recalculated[0]["block_name"] if recalculated else None,
    }


# ---------------------------------------------------------------------------
# 4. GET /briefing
# ---------------------------------------------------------------------------

@router.get("/briefing")
def get_briefing(
    request: Request,
    event_id: Optional[str] = Query(None, description="Hazard Event ID"),
    use_llm: bool = Query(False, description="Generate natural language briefing via LLM API (default false)"),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Generates deterministic 6-line situation briefing with zero external calls.
    Uses M4's briefing_template.py engine.
    """
    user = _get_optional_user(request, db)

    # Mode A: Specific Database-Backed Hazard Event
    if event_id:
        event = db.query(HazardEvent).filter(HazardEvent.id == event_id.strip()).first()
        if not event:
            raise not_found_error(f"Hazard event '{event_id}' not found", code="NOT_FOUND")

        _check_org_access(user, event)

        # Freshness & Interlocks
        freshness = evaluate_source_freshness(
            source_timestamp=event.source_timestamp,
            reference_time=datetime.now(timezone.utc),
        )
        interlock_flags = list(freshness.interlock_flags)

        # Query top areas
        top_risk = (
            db.query(AreaRisk, Area.block_name)
            .join(Area, AreaRisk.area_code == Area.area_code)
            .filter(AreaRisk.event_id == event.id)
            .order_by(AreaRisk.score.desc())
            .limit(2)
            .all()
        )
        top_areas = [
            {"name": bname, "block_name": bname, "score": ar.score, "reasons": ar.reasons or []}
            for ar, bname in top_risk
        ]

        # Query assets
        hazard_lat, hazard_lon = _extract_hazard_coords(db, event)
        raw_assets = assess_asset_exposure_spatial(db, hazard_lat=hazard_lat, hazard_lon=hazard_lon, max_distance_km=10.0)
        threatened_assets = [
            {"name": a.name, "type": a.asset_type, "status": a.exposure_status}
            for a in raw_assets[:5]
        ]

        # Query routes
        raw_routes = assess_route_status_spatial(
            db,
            hazard_wkt=f"POLYGON(({hazard_lon-0.1} {hazard_lat-0.1}, {hazard_lon+0.1} {hazard_lat-0.1}, {hazard_lon+0.1} {hazard_lat+0.1}, {hazard_lon-0.1} {hazard_lat+0.1}, {hazard_lon-0.1} {hazard_lat-0.1}))",
            source_timestamp=event.source_timestamp,
        )
        route_statuses = [
            {"name": r.name, "status": r.status}
            for r in raw_routes
        ]

        # Staging
        staging = recommend_staging_hub(db, hazard_lat=hazard_lat, hazard_lon=hazard_lon, hazard_radius_km=15.0)
        staging_rec = staging.to_dict() if staging else None

        hazard_meta = {
            "name": event.name,
            "category": event.category,
            "forward_speed_kmh": event.forward_speed_kmh,
            "max_wind_kmh": event.max_wind_kmh,
            "target_landfall": event.target_landfall or "Puri Coast, Odisha",
        }

        briefing = generate_situation_briefing(
            hazard_event=hazard_meta,
            top_areas=top_areas,
            threatened_assets=threatened_assets,
            route_statuses=route_statuses,
            staging_recommendation=staging_rec,
            interlock_flags=interlock_flags,
        )
        is_sim = (event.provenance_tag == "SIMULATED")
        briefing["provenance_tag"] = "SIMULATED" if is_sim else "MODEL_ESTIMATE"
        briefing["is_simulated"] = is_sim
        return briefing

    # Mode B: Cached Replay / Demo Fixture Fallback
    data = _load_fixture()
    hazard_event = {
        "name": data.get("event_name", "Cyclone Fani"),
        "category": "Extremely Severe Cyclonic Storm",
        "forward_speed_kmh": 18,
        "max_wind_kmh": data.get("landfall", {}).get("peak_wind_kmh", 215),
        "target_landfall": data.get("landfall", {}).get("location", "Puri Coast, Odisha"),
    }
    return generate_situation_briefing(
        hazard_event=hazard_event,
        top_areas=data.get("ranked_blocks", []),
        threatened_assets=data.get("assets", [])[:5],
        route_statuses=data.get("routes", []),
        staging_recommendation={"name": "Cuttack Central Warehouse", "district": "Cuttack", "rationale": "Outside 90 km/h wind"},
    )
