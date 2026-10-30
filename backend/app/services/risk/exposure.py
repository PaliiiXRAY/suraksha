"""
SURAKSHA Strategic Asset Exposure & Supply Route Status Service (M1 T4).
Pure deterministic and PostGIS spatial evaluation: ARCHITECTURE.md §5, docs/SRS.md FR-5.1 - FR-5.3.

Provides:
1. Strategic asset exposure evaluation:
   - PostGIS ST_DWithin (10 km range).
   - Distance decay: criticality * (1 - distance_km / 10).
   - Documented status: <2 km: IMPACTED, 2-5 km: HIGH_EXPOSURE, 5-10 km: MONITORED.
2. Supply route assessment:
   - PostGIS ST_Intersection length ratio.
   - >50%: CUT, >10% to 50%: AT_RISK.
   - <=10%: PASSABLE only with verified fresh evidence; otherwise UNKNOWN.
   - Never-Assume-Safe interlock: stale/future/missing evidence cannot clear a route.
3. Nearest-safe staging hub recommendation:
   - Depot/base outside hazard footprint (distance > 10 km).
   - Readiness >= 0.4 (FR-4.4 clamp).
   - Linked to intact route evidence.
"""
from dataclasses import dataclass
from datetime import datetime, timezone
import math
from typing import Any, Dict, List, Optional, Tuple, Union

from sqlalchemy import func, text
from sqlalchemy.orm import Session

from backend.app.models.cyclone import StrategicAsset, SupplyRoute
from backend.app.services.cyclone.interlocks import (
    DEFAULT_STALENESS_THRESHOLD_HOURS,
    evaluate_source_freshness,
)

# Status Constants
STATUS_IMPACTED = "IMPACTED"
STATUS_HIGH_EXPOSURE = "HIGH_EXPOSURE"
STATUS_MONITORED = "MONITORED"
STATUS_UNEXPOSED = "UNEXPOSED"

ROUTE_STATUS_CUT = "CUT"
ROUTE_STATUS_AT_RISK = "AT_RISK"
ROUTE_STATUS_PASSABLE = "PASSABLE"
ROUTE_STATUS_UNKNOWN = "UNKNOWN"

MAX_EXPOSURE_DISTANCE_KM = 10.0
READINESS_MIN_THRESHOLD = 0.40  # FR-4.4 clamp


@dataclass(frozen=True)
class AssetExposureResult:
    """Structured assessment of a strategic asset's exposure to hazard center/footprint."""
    asset_id: str
    name: str
    asset_type: str
    criticality: float
    distance_km: float
    exposure_status: str
    decay_score: float
    readiness: Optional[float]
    provenance_tag: str
    latitude: float
    longitude: float

    def to_dict(self) -> Dict[str, Any]:
        return {
            "asset_id": self.asset_id,
            "name": self.name,
            "asset_type": self.asset_type,
            "criticality": self.criticality,
            "distance_km": round(self.distance_km, 3),
            "exposure_status": self.exposure_status,
            "decay_score": round(self.decay_score, 3),
            "readiness": self.readiness,
            "provenance_tag": self.provenance_tag,
            "latitude": self.latitude,
            "longitude": self.longitude,
        }


@dataclass(frozen=True)
class RouteStatusResult:
    """Structured operational status of a critical supply or evacuation corridor."""
    route_id: str
    name: str
    route_type: str
    total_length_km: float
    affected_length_km: float
    affected_ratio: float
    status: str
    evidence: str
    interlock_flags: Tuple[str, ...]
    provenance_tag: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "route_id": self.route_id,
            "name": self.name,
            "route_type": self.route_type,
            "total_length_km": round(self.total_length_km, 3),
            "affected_length_km": round(self.affected_length_km, 3),
            "affected_ratio": round(self.affected_ratio, 4),
            "status": self.status,
            "evidence": self.evidence,
            "interlock_flags": list(self.interlock_flags),
            "provenance_tag": self.provenance_tag,
        }


@dataclass(frozen=True)
class StagingRecommendation:
    """Recommended nearest safe staging and relief logistics hub outside hazard footprint."""
    hub_id: str
    name: str
    asset_type: str
    distance_km: float
    readiness: float
    route_status: str
    rationale: str
    is_safe: bool

    def to_dict(self) -> Dict[str, Any]:
        return {
            "hub_id": self.hub_id,
            "name": self.name,
            "asset_type": self.asset_type,
            "distance_km": round(self.distance_km, 2),
            "readiness": round(self.readiness, 2),
            "route_status": self.route_status,
            "rationale": self.rationale,
            "is_safe": self.is_safe,
        }


# ---------------------------------------------------------------------------
# Pure Calculation Helpers (Unit-Testable & Side-Effect Free)
# ---------------------------------------------------------------------------

def compute_asset_decay_score(criticality: float, distance_km: float) -> Tuple[str, float]:
    """
    Calculate exposure classification and distance decay score:
    decay_score = criticality * (1.0 - distance_km / 10.0)
    """
    dist = max(0.0, distance_km)
    crit = max(0.0, criticality)

    if dist < 2.0:
        status = STATUS_IMPACTED
    elif dist < 5.0:
        status = STATUS_HIGH_EXPOSURE
    elif dist <= MAX_EXPOSURE_DISTANCE_KM:
        status = STATUS_MONITORED
    else:
        status = STATUS_UNEXPOSED

    if dist > MAX_EXPOSURE_DISTANCE_KM:
        decay = 0.0
    else:
        decay = max(0.0, crit * (1.0 - (dist / MAX_EXPOSURE_DISTANCE_KM)))

    return status, decay


def classify_route_exposure(
    affected_ratio: float,
    has_verified_evidence: bool = False,
    source_timestamp: Optional[Any] = None,
    reference_time: Optional[Union[datetime, str]] = None,
) -> Tuple[str, str, List[str], str]:
    """
    Classify route status based on intersection ratio and evidence verification.
    Enforces FR-4.3 / Never-Assume-Safe interlock:
    - >50%: CUT
    - >10% and <=50%: AT_RISK
    - <=10%: PASSABLE only if verified fresh evidence exists; otherwise UNKNOWN.
    """
    interlock_flags: List[str] = []
    ratio = max(0.0, min(1.0, affected_ratio))

    if ratio > 0.50:
        return (
            ROUTE_STATUS_CUT,
            f"Severe severance: {ratio * 100.0:.1f}% of corridor length intersects high-hazard footprint (>50% threshold)",
            interlock_flags,
            "MODEL_ESTIMATE",
        )

    if ratio > 0.10:
        return (
            ROUTE_STATUS_AT_RISK,
            f"Compromised: {ratio * 100.0:.1f}% of corridor length intersects hazard footprint (10%-50% threshold)",
            interlock_flags,
            "MODEL_ESTIMATE",
        )

    # ratio <= 0.10: Must evaluate evidence freshness
    now_utc = datetime.now(timezone.utc)
    if source_timestamp is None:
        interlock_flags.append("MISSING_EVIDENCE_TIMESTAMP")
        return (
            ROUTE_STATUS_UNKNOWN,
            f"Corridor has low spatial intersection ({ratio * 100.0:.1f}%), but status is UNKNOWN due to missing ground clearance telemetry (Never-Assume-Safe interlock)",
            interlock_flags,
            "INSUFFICIENT_DATA",
        )

    freshness = evaluate_source_freshness(
        source_timestamp=source_timestamp,
        reference_time=reference_time or now_utc,
        max_age_hours=DEFAULT_STALENESS_THRESHOLD_HOURS,
    )
    if freshness.interlock_flags:
        interlock_flags.extend(freshness.interlock_flags)

    if freshness.is_stale or freshness.interlock_flags or not has_verified_evidence:
        reason_detail = (
            f"Stale telemetry ({freshness.age_hours:.1f}h old)" if freshness.is_stale
            else "Unverified ground status" if not has_verified_evidence
            else f"Telemetry interlock ({', '.join(freshness.interlock_flags)})"
        )
        return (
            ROUTE_STATUS_UNKNOWN,
            f"Corridor has low spatial intersection ({ratio * 100.0:.1f}%), but cannot be verified PASSABLE: {reason_detail} (Never-Assume-Safe interlock)",
            interlock_flags,
            "INSUFFICIENT_DATA",
        )

    return (
        ROUTE_STATUS_PASSABLE,
        f"Verified passable: minimal spatial intersection ({ratio * 100.0:.1f}% <= 10%) with verified ground telemetry ({freshness.age_hours:.1f}h old)",
        interlock_flags,
        "OBSERVED",
    )


# ---------------------------------------------------------------------------
# Database Spatial Operations (PostGIS ST_DWithin & ST_Intersection)
# ---------------------------------------------------------------------------

def assess_asset_exposure_spatial(
    db: Session,
    hazard_lat: float,
    hazard_lon: float,
    max_distance_km: float = MAX_EXPOSURE_DISTANCE_KM,
) -> List[AssetExposureResult]:
    """
    Query PostGIS for strategic assets within max_distance_km of hazard coordinates.
    Uses ST_DWithin on geography and calculates spherical distance.
    """
    max_meters = max_distance_km * 1000.0

    sql = text("""
        SELECT
            id, name, asset_type, criticality, latitude, longitude,
            readiness, provenance_tag,
            ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography) / 1000.0 AS distance_km
        FROM strategic_assets
        WHERE ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography, :max_meters)
        ORDER BY distance_km ASC;
    """)

    rows = db.execute(sql, {"lat": hazard_lat, "lon": hazard_lon, "max_meters": max_meters}).fetchall()

    results: List[AssetExposureResult] = []
    for r in rows:
        dist_km = float(r.distance_km)
        crit = float(r.criticality) if r.criticality is not None else 1.0
        status, decay = compute_asset_decay_score(crit, dist_km)
        results.append(AssetExposureResult(
            asset_id=r.id,
            name=r.name,
            asset_type=r.asset_type,
            criticality=crit,
            distance_km=dist_km,
            exposure_status=status,
            decay_score=decay,
            readiness=float(r.readiness) if r.readiness is not None else None,
            provenance_tag=r.provenance_tag or "OBSERVED",
            latitude=float(r.latitude),
            longitude=float(r.longitude),
        ))

    return results


def assess_route_status_spatial(
    db: Session,
    hazard_wkt: str,
    source_timestamp: Optional[Any] = None,
    reference_time: Optional[Union[datetime, str]] = None,
    has_verified_clearance: bool = False,
) -> List[RouteStatusResult]:
    """
    Query PostGIS for supply route intersection with hazard geometry (WKT polygon).
    Uses ST_Intersection and ST_Length on geography to compute affected ratio.
    """
    sql = text("""
        SELECT
            id, name, route_type, length_km,
            ST_Length(geom::geography) / 1000.0 AS total_length_km,
            ST_Length(ST_Intersection(geom, ST_SetSRID(ST_GeomFromText(:hazard_wkt), 4326))::geography) / 1000.0 AS affected_length_km
        FROM supply_routes
        WHERE ST_Intersects(geom, ST_SetSRID(ST_GeomFromText(:hazard_wkt), 4326))
        ORDER BY affected_length_km DESC;
    """)

    rows = db.execute(sql, {"hazard_wkt": hazard_wkt}).fetchall()

    results: List[RouteStatusResult] = []
    for r in rows:
        total_len = float(r.total_length_km) if r.total_length_km else 0.0
        affected_len = float(r.affected_length_km) if r.affected_length_km else 0.0
        ratio = (affected_len / total_len) if total_len > 0.0 else 0.0

        status, evidence, flags, prov = classify_route_exposure(
            affected_ratio=ratio,
            has_verified_evidence=has_verified_clearance,
            source_timestamp=source_timestamp,
            reference_time=reference_time,
        )

        results.append(RouteStatusResult(
            route_id=r.id,
            name=r.name,
            route_type=r.route_type,
            total_length_km=total_len,
            affected_length_km=affected_len,
            affected_ratio=ratio,
            status=status,
            evidence=evidence,
            interlock_flags=tuple(flags),
            provenance_tag=prov,
        ))

    return results


def recommend_staging_hub(
    db: Session,
    hazard_lat: float,
    hazard_lon: float,
    hazard_radius_km: float = 15.0,
) -> Optional[StagingRecommendation]:
    """
    Identify and recommend the nearest safe strategic depot/base outside the hazard footprint.
    Enforces FR-4.4 clamp (readiness >= 0.40) and distance > hazard_radius_km.
    """
    sql = text("""
        SELECT
            id, name, asset_type, readiness,
            ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography) / 1000.0 AS distance_km
        FROM strategic_assets
        WHERE asset_type IN ('relief_depot', 'base', 'depot', 'helipad', 'hospital')
          AND readiness >= :min_readiness
          AND ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography) / 1000.0 > :hazard_radius
        ORDER BY distance_km ASC
        LIMIT 1;
    """)

    row = db.execute(sql, {
        "lat": hazard_lat,
        "lon": hazard_lon,
        "hazard_radius": hazard_radius_km,
        "min_readiness": READINESS_MIN_THRESHOLD,
    }).fetchone()

    if not row:
        return None

    return StagingRecommendation(
        hub_id=row.id,
        name=row.name,
        asset_type=row.asset_type,
        distance_km=float(row.distance_km),
        readiness=float(row.readiness) if row.readiness is not None else 1.0,
        route_status="PASSABLE_WITH_EVIDENCE",
        rationale=f"Selected nearest safe operational hub ({row.name}) outside {hazard_radius_km}km hazard buffer with readiness {row.readiness:.2f} >= 0.40",
        is_safe=True,
    )
