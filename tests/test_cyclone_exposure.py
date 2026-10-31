"""
SURAKSHA Strategic Asset Exposure & Route Assessment Tests (M1 T4).
Validates ARCHITECTURE §5, docs/SRS.md FR-4.3, FR-5.1 - FR-5.3, docs/KICKOFF.md.
"""
from datetime import datetime, timedelta, timezone
import pytest
from sqlalchemy import text

from backend.app.db.session import SessionLocal
from backend.app.models.cyclone import StrategicAsset, SupplyRoute
from backend.app.services.risk.exposure import (
    compute_asset_decay_score,
    classify_route_exposure,
    assess_asset_exposure_spatial,
    assess_route_status_spatial,
    recommend_staging_hub,
    STATUS_IMPACTED,
    STATUS_HIGH_EXPOSURE,
    STATUS_MONITORED,
    STATUS_UNEXPOSED,
    ROUTE_STATUS_CUT,
    ROUTE_STATUS_AT_RISK,
    ROUTE_STATUS_PASSABLE,
    ROUTE_STATUS_UNKNOWN,
)


# ---------------------------------------------------------------------------
# Unit Tests for Decay & Route Classification Logic
# ---------------------------------------------------------------------------

def test_asset_decay_inside_2km():
    status, decay = compute_asset_decay_score(criticality=1.0, distance_km=1.5)
    assert status == STATUS_IMPACTED
    # decay = 1.0 * (1.0 - 1.5 / 10.0) = 0.85
    assert abs(decay - 0.85) < 1e-4


def test_asset_decay_between_2_and_5km():
    status, decay = compute_asset_decay_score(criticality=0.8, distance_km=3.5)
    assert status == STATUS_HIGH_EXPOSURE
    # decay = 0.8 * (1.0 - 3.5 / 10.0) = 0.8 * 0.65 = 0.52
    assert abs(decay - 0.52) < 1e-4


def test_asset_decay_between_5_and_10km():
    status, decay = compute_asset_decay_score(criticality=1.2, distance_km=7.5)
    assert status == STATUS_MONITORED
    # decay = 1.2 * (1.0 - 7.5 / 10.0) = 1.2 * 0.25 = 0.30
    assert abs(decay - 0.30) < 1e-4


def test_asset_decay_outside_10km():
    status, decay = compute_asset_decay_score(criticality=1.5, distance_km=12.0)
    assert status == STATUS_UNEXPOSED
    assert decay == 0.0


def test_route_above_50_percent_is_cut():
    status, evidence, flags, prov = classify_route_exposure(affected_ratio=0.65)
    assert status == ROUTE_STATUS_CUT
    assert ">50%" in evidence


def test_route_between_10_and_50_percent_is_at_risk():
    status, evidence, flags, prov = classify_route_exposure(affected_ratio=0.35)
    assert status == ROUTE_STATUS_AT_RISK
    assert "10%-50%" in evidence


def test_route_below_10_percent_with_fresh_evidence_is_passable():
    now = datetime.now(timezone.utc)
    fresh_ts = now - timedelta(hours=2)

    status, evidence, flags, prov = classify_route_exposure(
        affected_ratio=0.05,
        has_verified_evidence=True,
        source_timestamp=fresh_ts,
        reference_time=now,
    )
    assert status == ROUTE_STATUS_PASSABLE
    assert prov == "OBSERVED"
    assert len(flags) == 0


def test_route_below_10_percent_without_evidence_returns_unknown():
    """
    CRITICAL ACCEPTANCE (FR-4.3): No route may return PASSABLE without evidence.
    """
    status, evidence, flags, prov = classify_route_exposure(
        affected_ratio=0.04,
        has_verified_evidence=False,  # Unverified
        source_timestamp=datetime.now(timezone.utc),
    )
    assert status == ROUTE_STATUS_UNKNOWN
    assert prov == "INSUFFICIENT_DATA"
    assert "Never-Assume-Safe" in evidence


def test_stale_source_cannot_produce_passable_route():
    """
    M2 Freshness Interlock: Stale telemetry (>6h) prevents PASSABLE status even if clearance is claimed.
    """
    now = datetime.now(timezone.utc)
    stale_ts = now - timedelta(hours=9)

    status, evidence, flags, prov = classify_route_exposure(
        affected_ratio=0.02,
        has_verified_evidence=True,
        source_timestamp=stale_ts,
        reference_time=now,
    )
    assert status == ROUTE_STATUS_UNKNOWN
    assert "STALE_DATA" in flags
    assert prov == "INSUFFICIENT_DATA"


def test_future_source_cannot_produce_passable_route():
    """
    Future-dated source timestamp fails safe and prevents PASSABLE.
    """
    now = datetime.now(timezone.utc)
    future_ts = now + timedelta(hours=2)

    status, evidence, flags, prov = classify_route_exposure(
        affected_ratio=0.03,
        has_verified_evidence=True,
        source_timestamp=future_ts,
        reference_time=now,
    )
    assert status == ROUTE_STATUS_UNKNOWN
    assert "FUTURE_SOURCE_TIMESTAMP" in flags


def test_missing_timestamp_cannot_produce_passable_route():
    status, evidence, flags, prov = classify_route_exposure(
        affected_ratio=0.01,
        has_verified_evidence=True,
        source_timestamp=None,
    )
    assert status == ROUTE_STATUS_UNKNOWN
    assert "MISSING_EVIDENCE_TIMESTAMP" in flags


# ---------------------------------------------------------------------------
# PostGIS Live Spatial Tests
# ---------------------------------------------------------------------------

@pytest.fixture
def spatial_test_fixtures():
    db = SessionLocal()
    try:
        # Clean up existing test assets/routes
        db.execute(text("DELETE FROM strategic_assets WHERE id LIKE 'test_exp_%';"))
        db.execute(text("DELETE FROM supply_routes WHERE id LIKE 'test_rt_%';"))
        db.commit()

        # Insert test strategic assets around Puri coast (19.8135, 85.8312)
        # 1. Close hospital: ~1.2 km away
        # 2. Mid shelter: ~4.0 km away
        # 3. Outer depot: ~8.0 km away
        # 4. Safe distant depot: ~25.0 km away (readiness 0.95)
        # 5. Low-readiness distant depot: ~28.0 km away (readiness 0.20 -> excluded by clamp)
        db.execute(text("""
            INSERT INTO strategic_assets (id, name, asset_type, criticality, geom, latitude, longitude, district, readiness)
            VALUES
            ('test_exp_ast_01', 'Puri DHH Hospital', 'hospital', 1.0,
             ST_SetSRID(ST_MakePoint(85.8312, 19.8240), 4326), 19.8240, 85.8312, 'Puri', 0.90),
            ('test_exp_ast_02', 'Brahmagiri Shelter', 'shelter', 0.8,
             ST_SetSRID(ST_MakePoint(85.8000, 19.8350), 4326), 19.8350, 85.8000, 'Puri', 0.85),
            ('test_exp_ast_03', 'Satyabadi Depot', 'relief_depot', 1.2,
             ST_SetSRID(ST_MakePoint(85.7800, 19.8700), 4326), 19.8700, 85.7800, 'Puri', 0.80),
            ('test_exp_ast_safe', 'Bhubaneswar Central Depot', 'relief_depot', 1.5,
             ST_SetSRID(ST_MakePoint(85.8245, 20.2961), 4326), 20.2961, 85.8245, 'Khordha', 0.95),
            ('test_exp_ast_unready', 'Distant Unready Depot', 'relief_depot', 1.0,
             ST_SetSRID(ST_MakePoint(85.8500, 20.3500), 4326), 20.3500, 85.8500, 'Khordha', 0.20);
        """))

        # Insert test supply routes:
        # Route 1: NH-316 running south to north through Puri
        db.execute(text("""
            INSERT INTO supply_routes (id, name, route_type, geom, length_km, baseline_status)
            VALUES
            ('test_rt_nh316', 'NH-316 Puri-Bhubaneswar', 'PRIMARY',
             ST_SetSRID(ST_GeomFromText('LINESTRING(85.8312 19.8135, 85.8200 19.8800, 85.8245 20.2961)'), 4326),
             60.0, 'PASSABLE_WITH_EVIDENCE');
        """))
        db.commit()
    finally:
        db.close()

    yield

    db = SessionLocal()
    try:
        db.execute(text("DELETE FROM strategic_assets WHERE id LIKE 'test_exp_%';"))
        db.execute(text("DELETE FROM supply_routes WHERE id LIKE 'test_rt_%';"))
        db.commit()
    finally:
        db.close()


def test_postgis_asset_exposure(spatial_test_fixtures):
    db = SessionLocal()
    try:
        # Query exposure around Puri coast center (19.8135, 85.8312)
        assets = assess_asset_exposure_spatial(db, hazard_lat=19.8135, hazard_lon=85.8312, max_distance_km=10.0)
        assert len(assets) >= 3

        # Close asset inside 2km
        a1 = next((a for a in assets if a.asset_id == "test_exp_ast_01"), None)
        assert a1 is not None
        assert a1.distance_km < 2.0
        assert a1.exposure_status == STATUS_IMPACTED
        assert a1.decay_score > 0.8

        # Distant safe depot (~50km) should NOT be in the <=10km exposure query
        safe_a = next((a for a in assets if a.asset_id == "test_exp_ast_safe"), None)
        assert safe_a is None
    finally:
        db.close()


def test_postgis_route_intersection_and_evidence(spatial_test_fixtures):
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        # Construct a polygon hazard footprint covering the southern portion of NH-316
        hazard_wkt = "POLYGON((85.80 19.80, 85.85 19.80, 85.85 19.85, 85.80 19.85, 85.80 19.80))"

        # 1. With fresh verified clearance evidence
        routes_passable = assess_route_status_spatial(
            db,
            hazard_wkt=hazard_wkt,
            source_timestamp=now - timedelta(hours=1),
            reference_time=now,
            has_verified_clearance=True,
        )
        assert len(routes_passable) >= 1
        rt = routes_passable[0]
        assert rt.route_id == "test_rt_nh316"
        assert rt.total_length_km > 0
        assert rt.affected_length_km > 0
        assert rt.status in (ROUTE_STATUS_AT_RISK, ROUTE_STATUS_CUT, ROUTE_STATUS_PASSABLE)

        # 2. With stale evidence -> Never PASSABLE
        routes_stale = assess_route_status_spatial(
            db,
            hazard_wkt=hazard_wkt,
            source_timestamp=now - timedelta(hours=12),
            reference_time=now,
            has_verified_clearance=True,
        )
        rt_stale = routes_stale[0]
        if rt_stale.affected_ratio <= 0.10:
            assert rt_stale.status == ROUTE_STATUS_UNKNOWN
            assert "STALE_DATA" in rt_stale.interlock_flags
    finally:
        db.close()


def test_postgis_staging_hub_recommendation(spatial_test_fixtures):
    db = SessionLocal()
    try:
        rec = recommend_staging_hub(db, hazard_lat=19.8135, hazard_lon=85.8312, hazard_radius_km=15.0)
        assert rec is not None
        assert rec.hub_id == "test_exp_ast_safe"
        assert rec.name == "Bhubaneswar Central Depot"
        assert rec.readiness >= 0.40
        assert rec.distance_km > 15.0
        assert rec.is_safe is True
    finally:
        db.close()
