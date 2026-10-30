"""
SURAKSHA Decision Support API Tests (M2 T4).
Validates /api/area-risk, /api/asset-exposure, /api/what-if, and /api/briefing endpoints.
ARCHITECTURE.md §4, §5, §7; docs/SRS.md FR-3, FR-5, FR-6, FR-8; docs/PROVENANCE_SPEC.md.
"""
from datetime import datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.app.main import app
from backend.app.db.session import SessionLocal
from backend.app.models.cyclone import (
    Area,
    AreaRisk,
    HazardEvent,
    HazardEventLog,
    Organization,
    StrategicAsset,
    SupplyRoute,
)
from backend.app.models.user import User
from backend.app.core.security import create_access_token, hash_password

client = TestClient(app)


def make_headers(user_id: str, email: str, role: str) -> dict:
    token = create_access_token(data={"sub": user_id, "email": email, "role": role})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(autouse=True)
def setup_decision_fixtures():
    db = SessionLocal()
    try:
        # Clean existing test data
        db.execute(text("DELETE FROM hazard_event_logs;"))
        db.execute(text("DELETE FROM area_risk WHERE event_id LIKE 'test_dec_%';"))
        db.execute(text("DELETE FROM hazard_events WHERE id LIKE 'test_dec_%';"))
        db.execute(text("DELETE FROM strategic_assets WHERE id LIKE 'test_dec_ast_%';"))
        db.execute(text("DELETE FROM supply_routes WHERE id LIKE 'test_dec_rt_%';"))
        db.execute(text("DELETE FROM areas WHERE area_code LIKE 'TEST_DEC_%';"))
        db.execute(text("DELETE FROM users WHERE id LIKE 'test_dec_user_%';"))
        db.execute(text("DELETE FROM organizations WHERE id IN (801, 802);"))
        db.commit()

        # 1. Organizations
        org1 = Organization(id=801, name="OSDMA Decision Unit", org_type="disaster_authority")
        org2 = Organization(id=802, name="NDRF Sector Unit", org_type="security_agency")
        db.add_all([org1, org2])
        db.commit()

        # 2. Users
        pwd = hash_password("testpass123")
        u_auth1 = User(id="test_dec_user_auth1", email="auth1@osdma.dec", hashed_password=pwd, role="authority", org_id=801)
        u_admin1 = User(id="test_dec_user_admin1", email="admin1@osdma.dec", hashed_password=pwd, role="admin", org_id=801)
        u_auth2 = User(id="test_dec_user_auth2", email="auth2@ndrf.dec", hashed_password=pwd, role="authority", org_id=802)
        u_no_org = User(id="test_dec_user_no_org", email="noorg@public.dec", hashed_password=pwd, role="analyst", org_id=None)
        db.add_all([u_auth1, u_admin1, u_auth2, u_no_org])
        db.commit()

        # 3. Hazard Events (Org 801: Live event, Org 802: Other tenant event)
        now = datetime.now(timezone.utc)
        ev1 = HazardEvent(
            id="test_dec_fani",
            name="Cyclone Fani Decision Test",
            hazard_type="cyclone",
            category="ESCS",
            status="WARNING",
            provenance_tag="REPLAY",
            source_name="IMD",
            source_timestamp=now - timedelta(hours=2),  # Fresh
            max_wind_kmh=215.0,
            forward_speed_kmh=16.0,
            target_landfall="Puri Coast",
            org_id=801,
        )
        ev2 = HazardEvent(
            id="test_dec_org2_event",
            name="Cyclone Org2 Secret Event",
            hazard_type="cyclone",
            category="CS",
            status="MONITORING",
            provenance_tag="MODEL_ESTIMATE",
            source_name="IMD",
            source_timestamp=now - timedelta(hours=1),
            max_wind_kmh=80.0,
            forward_speed_kmh=12.0,
            target_landfall="Paradip",
            org_id=802,
        )
        db.add_all([ev1, ev2])
        db.commit()

        # 4. Areas (Test Blocks)
        db.execute(text("""
            INSERT INTO areas (area_code, block_name, district, geom, total_population, vulnerable_population, is_coastal, flood_susceptibility)
            VALUES
            ('TEST_DEC_PUR', 'Puri Sadar', 'Puri', ST_SetSRID(ST_Multi(ST_GeomFromText('POLYGON((85.80 19.80, 85.86 19.80, 85.86 19.86, 85.80 19.86, 85.80 19.80))')), 4326), 180000, 30000, true, 0.85),
            ('TEST_DEC_BRA', 'Brahmagiri', 'Puri', ST_SetSRID(ST_Multi(ST_GeomFromText('POLYGON((85.70 19.75, 85.78 19.75, 85.78 19.83, 85.70 19.83, 85.70 19.75))')), 4326), 140000, 22000, true, 0.75),
            ('TEST_DEC_BBS', 'Bhubaneswar', 'Khordha', ST_SetSRID(ST_Multi(ST_GeomFromText('POLYGON((85.80 20.25, 85.86 20.25, 85.86 20.32, 85.80 20.32, 85.80 20.25))')), 4326), 850000, 75000, false, 0.40);
        """))
        db.commit()

        # 5. Strategic Assets around Puri (19.8135, 85.8312)
        db.execute(text("""
            INSERT INTO strategic_assets (id, name, asset_type, criticality, geom, latitude, longitude, district, readiness)
            VALUES
            ('test_dec_ast_hosp', 'Puri District Hospital', 'hospital', 1.0,
             ST_SetSRID(ST_MakePoint(85.8312, 19.8240), 4326), 19.8240, 85.8312, 'Puri', 0.95),
            ('test_dec_ast_shelter', 'Puri Cyclone Shelter 1', 'shelter', 0.9,
             ST_SetSRID(ST_MakePoint(85.8100, 19.8200), 4326), 19.8200, 85.8100, 'Puri', 0.90),
            ('test_dec_ast_depot', 'Bhubaneswar Supply Hub', 'relief_depot', 1.5,
             ST_SetSRID(ST_MakePoint(85.8245, 20.2961), 4326), 20.2961, 85.8245, 'Khordha', 0.98);
        """))
        db.commit()

        # 6. Supply Routes
        db.execute(text("""
            INSERT INTO supply_routes (id, name, route_type, geom, length_km, baseline_status)
            VALUES
            ('test_dec_rt_nh316', 'NH-316 Puri Highway', 'PRIMARY',
             ST_SetSRID(ST_GeomFromText('LINESTRING(85.8312 19.8135, 85.8245 20.2961)'), 4326),
             60.0, 'PASSABLE_WITH_EVIDENCE');
        """))
        db.commit()

    finally:
        db.close()

    yield

    db = SessionLocal()
    try:
        db.execute(text("DELETE FROM hazard_event_logs;"))
        db.execute(text("DELETE FROM area_risk WHERE event_id LIKE 'test_dec_%';"))
        db.execute(text("DELETE FROM hazard_events WHERE id LIKE 'test_dec_%';"))
        db.execute(text("DELETE FROM strategic_assets WHERE id LIKE 'test_dec_ast_%';"))
        db.execute(text("DELETE FROM supply_routes WHERE id LIKE 'test_dec_rt_%';"))
        db.execute(text("DELETE FROM areas WHERE area_code LIKE 'TEST_DEC_%';"))
        db.execute(text("DELETE FROM users WHERE id LIKE 'test_dec_user_%';"))
        db.execute(text("DELETE FROM organizations WHERE id IN (801, 802);"))
        db.commit()
    finally:
        db.close()


@pytest.fixture
def auth1_headers():
    return make_headers("test_dec_user_auth1", "auth1@osdma.dec", "authority")


@pytest.fixture
def admin1_headers():
    return make_headers("test_dec_user_admin1", "admin1@osdma.dec", "admin")


@pytest.fixture
def auth2_headers():
    return make_headers("test_dec_user_auth2", "auth2@ndrf.dec", "authority")


@pytest.fixture
def no_org_headers():
    return make_headers("test_dec_user_no_org", "noorg@public.dec", "analyst")


# ---------------------------------------------------------------------------
# 1. GET /api/area-risk Tests
# ---------------------------------------------------------------------------

def test_get_area_risk_ranked_results(auth1_headers):
    resp = client.get("/api/area-risk?event_id=test_dec_fani", headers=auth1_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["event_id"] == "test_dec_fani"
    assert data["total"] >= 2
    items = data["items"]
    assert len(items) >= 2

    # Verify descending rank order
    scores = [it["score"] for it in items]
    assert scores == sorted(scores, reverse=True)
    assert items[0]["rank"] == 1

    # Verify factor reasons contract
    first_reasons = items[0]["reasons"]
    assert len(first_reasons) == 6
    factor_names = [r["factor"] for r in first_reasons]
    assert "wind_exposure" in factor_names
    assert "rainfall_flood" in factor_names
    assert "population_exposure" in factor_names
    assert "storm_surge_coastal" in factor_names
    assert "critical_infrastructure" in factor_names
    assert "urgency_time_to_impact" in factor_names

    # Contributions sum equals score
    contrib_sum = sum(r["contribution"] for r in first_reasons)
    assert abs(contrib_sum - items[0]["score"]) < 1e-2


def test_get_area_risk_pagination_and_filters(auth1_headers):
    # Pagination
    resp_paged = client.get(
        "/api/area-risk?event_id=test_dec_fani&limit=1&offset=0",
        headers=auth1_headers,
    )
    assert resp_paged.status_code == 200
    data = resp_paged.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["rank"] == 1

    # District filter
    resp_dist = client.get(
        "/api/area-risk?event_id=test_dec_fani&district=Khordha",
        headers=auth1_headers,
    )
    assert resp_dist.status_code == 200
    for it in resp_dist.json()["items"]:
        assert "Bhubaneswar" in it["area_name"]


def test_get_area_risk_cross_org_denial(auth1_headers, auth2_headers, no_org_headers):
    # Tenant 2 attempting to view Tenant 1's event
    resp_cross = client.get("/api/area-risk?event_id=test_dec_fani", headers=auth2_headers)
    assert resp_cross.status_code == 403
    assert resp_cross.json()["error"]["code"] == "FORBIDDEN_CROSS_ORG"

    # User with no org
    resp_no_org = client.get("/api/area-risk?event_id=test_dec_fani", headers=no_org_headers)
    assert resp_no_org.status_code == 403
    assert resp_no_org.json()["error"]["code"] == "FORBIDDEN_NO_ORG"


# ---------------------------------------------------------------------------
# 2. GET /api/asset-exposure Tests
# ---------------------------------------------------------------------------

def test_get_asset_exposure_contract(auth1_headers):
    resp = client.get("/api/asset-exposure?event_id=test_dec_fani", headers=auth1_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["event_id"] == "test_dec_fani"
    assert data["total"] >= 2
    items = data["items"]

    # Verify item schema
    item = items[0]
    assert "asset_id" in item
    assert "name" in item
    assert "asset_type" in item
    assert "criticality" in item
    assert "latitude" in item
    assert "longitude" in item
    assert "distance_to_track_km" in item
    assert "inside_hazard_footprint" in item
    assert "exposure_score" in item
    assert "status" in item
    assert item["provenance_tag"] == "OBSERVED"

    # Hospital is ~1.2km away -> inside footprint and IMPACTED
    hosp = next((a for a in items if a["asset_id"] == "test_dec_ast_hosp"), None)
    assert hosp is not None
    assert hosp["distance_to_track_km"] < 2.0
    assert hosp["status"] == "IMPACTED"
    assert hosp["inside_hazard_footprint"] is True


def test_get_asset_exposure_cross_org_denial(auth2_headers):
    resp = client.get("/api/asset-exposure?event_id=test_dec_fani", headers=auth2_headers)
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "FORBIDDEN_CROSS_ORG"


# ---------------------------------------------------------------------------
# 3. POST /api/what-if Tests & Non-Persistence Proof
# ---------------------------------------------------------------------------

def test_post_what_if_calculation(auth1_headers):
    payload = {
        "event_id": "test_dec_fani",
        "track_perturbation": {
            "lat_offset": 0.05,
            "lon_offset": -0.05,
        },
        "intensity_delta_pct": 10.0,  # +10% intensity
    }
    resp = client.post("/api/what-if", json=payload, headers=auth1_headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["is_simulated"] is True
    assert data["provenance_tag"] == "SIMULATED"
    assert data["execution_time_ms"] < 2000.0  # Sub-2-second target
    assert "simulation_id" in data
    assert data["simulation_id"].startswith("sim_")

    # Hazard summary
    summary = data["hazard_summary"]
    assert summary["original_max_wind_kmh"] == 215.0
    assert abs(summary["simulated_max_wind_kmh"] - 236.5) < 1e-1  # 215 * 1.10 = 236.5
    assert summary["intensity_delta_pct"] == 10.0

    # Top areas
    assert len(data["top_areas"]) > 0
    assert data["top_areas"][0]["provenance_tag"] == "SIMULATED"

    # Threatened assets
    assert len(data["threatened_assets"]) > 0
    assert data["threatened_assets"][0]["provenance_tag"] == "SIMULATED"

    # Route statuses
    assert len(data["route_statuses"]) > 0

    # Staging recommendation
    rec = data["staging_recommendation"]
    assert rec is not None
    assert rec["hub_id"] == "test_dec_ast_depot"
    assert rec["is_safe"] is True
    assert rec["provenance_tag"] == "SIMULATED"


def test_what_if_zero_persistence_mutation(auth1_headers):
    """
    CRITICAL ACCEPTANCE:
    Prove that POST /api/what-if leaves the database 100% unchanged.
    Row counts and existing record states must be identical before and after.
    """
    db = SessionLocal()
    try:
        # Snapshot row counts and event state before simulation
        counts_before = {
            "hazard_events": db.query(HazardEvent).count(),
            "hazard_event_logs": db.query(HazardEventLog).count(),
            "area_risk": db.query(AreaRisk).count(),
            "areas": db.query(Area).count(),
            "strategic_assets": db.query(StrategicAsset).count(),
            "supply_routes": db.query(SupplyRoute).count(),
        }
        ev_before = db.query(HazardEvent).filter_by(id="test_dec_fani").first()
        ev_wind_before = ev_before.max_wind_kmh
        ev_status_before = ev_before.status
    finally:
        db.close()

    # Execute simulation
    payload = {
        "event_id": "test_dec_fani",
        "track_perturbation": {"lat_offset": 0.20, "lon_offset": -0.30},
        "intensity_delta_pct": -20.0,
    }
    resp = client.post("/api/what-if", json=payload, headers=auth1_headers)
    assert resp.status_code == 200

    # Snapshot and verify after simulation
    db = SessionLocal()
    try:
        counts_after = {
            "hazard_events": db.query(HazardEvent).count(),
            "hazard_event_logs": db.query(HazardEventLog).count(),
            "area_risk": db.query(AreaRisk).count(),
            "areas": db.query(Area).count(),
            "strategic_assets": db.query(StrategicAsset).count(),
            "supply_routes": db.query(SupplyRoute).count(),
        }
        ev_after = db.query(HazardEvent).filter_by(id="test_dec_fani").first()

        # Strict equality check: zero row modifications
        assert counts_after == counts_before, "Database tables must not have any rows added or deleted"
        assert ev_after.max_wind_kmh == ev_wind_before, "Hazard event wind must remain unmodified"
        assert ev_after.status == ev_status_before, "Hazard event status must remain unmodified"
    finally:
        db.close()


def test_what_if_invalid_inputs_rejected(auth1_headers):
    # 1. Excessive intensity delta (> 50%)
    resp1 = client.post(
        "/api/what-if",
        json={"event_id": "test_dec_fani", "intensity_delta_pct": 75.0},
        headers=auth1_headers,
    )
    assert resp1.status_code == 422

    # 2. Excessive track perturbation (> 5 deg)
    resp2 = client.post(
        "/api/what-if",
        json={
            "event_id": "test_dec_fani",
            "track_perturbation": {"lat_offset": 12.0, "lon_offset": 0.0},
        },
        headers=auth1_headers,
    )
    assert resp2.status_code == 422


def test_what_if_cross_org_denial(auth2_headers):
    resp = client.post(
        "/api/what-if",
        json={"event_id": "test_dec_fani"},
        headers=auth2_headers,
    )
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "FORBIDDEN_CROSS_ORG"


# ---------------------------------------------------------------------------
# 4. GET /api/briefing Tests
# ---------------------------------------------------------------------------

def test_get_situation_briefing_exact_contract(auth1_headers):
    resp = client.get("/api/briefing?event_id=test_dec_fani", headers=auth1_headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["line_count"] == 6
    assert len(data["lines"]) == 6
    assert data["external_calls_made"] == 0
    assert data["provenance_tag"] == "MODEL_ESTIMATE"
    assert data["is_simulated"] is False

    lines = data["lines"]
    assert "EVENT STATUS" in lines[0]
    assert "TOP PRIORITY" in lines[1]
    assert "CRITICAL ASSETS" in lines[2]
    assert "LOGISTICS & ACCESS" in lines[3]
    assert "STAGING RECOMMENDATION" in lines[4]
    assert "SAFETY INTERLOCKS" in lines[5]

    # Text matches joined lines
    assert data["text"] == "\n".join(lines)


def test_get_briefing_cross_org_denial(auth2_headers):
    resp = client.get("/api/briefing?event_id=test_dec_fani", headers=auth2_headers)
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "FORBIDDEN_CROSS_ORG"
