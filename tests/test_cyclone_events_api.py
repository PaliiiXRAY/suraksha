"""
SURAKSHA — M2 T2 Hazard-Event API, Org-Scoped RBAC & Audit Test Suite
Validates:
1. Hazard-event creation (POST /api/hazard-events -> 201)
2. List and retrieve scoped to user's organization
3. Update permitted fields (PATCH /api/hazard-events/{id})
4. Invalid request validation (missing required fields, negative wind -> 422)
5. Valid state machine transition sequence (MONITORING -> WARNING -> EVAC_ORDERED -> DEPLOYED -> RESOLVED)
6. Invalid/skipped transitions rejected (MONITORING -> DEPLOYED -> 409)
7. Cross-organization GET returns 403
8. Cross-organization PATCH returns 403
9. Organization-less user denied (org_id is None -> 403)
10. Role restrictions (responder cannot transition status -> 403)
11. Stale source timestamp (>6h old) blocks EVAC_ORDERED (409)
12. Fresh source timestamp permits EVAC_ORDERED (200)
13. Future / missing source timestamp blocks EVAC_ORDERED (409)
14. Every successful transition creates exactly one audit log row
15. Failed transition creates no audit log row
16. Atomic rollback on transition failure
"""
import os
import pytest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

import backend.app.core.config as app_config

DATABASE_URL = os.environ.get("DATABASE_URL", getattr(app_config, "DATABASE_URL", None))

from backend.app.main import app
from backend.app.core.security import create_access_token, hash_password
from backend.app.models.cyclone import HazardEvent, HazardEventLog, Organization
from backend.app.models.user import User

client = TestClient(app)
engine = create_engine(DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def setup_test_orgs_and_users():
    """Seed test organizations and users across two distinct tenants, cleaned up afterward."""
    db = TestingSessionLocal()
    try:
        # Clean existing test data
        db.execute(text("DELETE FROM hazard_event_logs;"))
        db.execute(text("DELETE FROM hazard_events;"))
        db.execute(text("DELETE FROM users WHERE id LIKE 'test_user_%';"))
        db.execute(text("DELETE FROM organizations WHERE id IN (901, 902);"))
        db.commit()

        # 1. Create two test organizations
        org1 = Organization(id=901, name="Test OSDMA Authority", org_type="disaster_authority")
        org2 = Organization(id=902, name="Test NDRF Battalion", org_type="security_agency")
        db.add_all([org1, org2])
        db.commit()

        # 2. Create users
        hashed = hash_password("test-password-123")
        u_auth1 = User(id="test_user_auth1", email="auth1@osdma.test", hashed_password=hashed, role="authority", org_id=901)
        u_analyst1 = User(id="test_user_analyst1", email="analyst1@osdma.test", hashed_password=hashed, role="analyst", org_id=901)
        u_resp1 = User(id="test_user_resp1", email="resp1@osdma.test", hashed_password=hashed, role="responder", org_id=901)
        u_admin1 = User(id="test_user_admin1", email="admin1@osdma.test", hashed_password=hashed, role="admin", org_id=901)
        u_auth2 = User(id="test_user_auth2", email="auth2@ndrf.test", hashed_password=hashed, role="authority", org_id=902)
        u_admin2 = User(id="test_user_admin2", email="admin2@ndrf.test", hashed_password=hashed, role="admin", org_id=902)
        u_no_org = User(id="test_user_no_org", email="noorg@public.test", hashed_password=hashed, role="analyst", org_id=None)
        u_admin_no_org = User(id="test_user_admin_no_org", email="adminnoorg@test.test", hashed_password=hashed, role="admin", org_id=None)

        db.add_all([u_auth1, u_analyst1, u_resp1, u_admin1, u_auth2, u_admin2, u_no_org, u_admin_no_org])
        db.commit()
    finally:
        db.close()

    yield

    db = TestingSessionLocal()
    try:
        db.execute(text("DELETE FROM hazard_event_logs;"))
        db.execute(text("DELETE FROM hazard_events;"))
        db.execute(text("DELETE FROM users WHERE id LIKE 'test_user_%';"))
        db.execute(text("DELETE FROM organizations WHERE id IN (901, 902);"))
        db.commit()
    finally:
        db.close()


def make_headers(user_id: str, email: str, role: str) -> dict:
    """Generate JWT authorization header."""
    token = create_access_token(data={"sub": user_id, "email": email, "role": role})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth1_headers():
    return make_headers("test_user_auth1", "auth1@osdma.test", "authority")


@pytest.fixture
def analyst1_headers():
    return make_headers("test_user_analyst1", "analyst1@osdma.test", "analyst")


@pytest.fixture
def resp1_headers():
    return make_headers("test_user_resp1", "resp1@osdma.test", "responder")


@pytest.fixture
def auth2_headers():
    return make_headers("test_user_auth2", "auth2@ndrf.test", "authority")


@pytest.fixture
def no_org_headers():
    return make_headers("test_user_no_org", "noorg@public.test", "analyst")


@pytest.fixture
def admin1_headers():
    return make_headers("test_user_admin1", "admin1@osdma.test", "admin")


@pytest.fixture
def admin2_headers():
    return make_headers("test_user_admin2", "admin2@ndrf.test", "admin")


@pytest.fixture
def admin_no_org_headers():
    return make_headers("test_user_admin_no_org", "adminnoorg@test.test", "admin")


# 1. Hazard-event creation
def test_create_hazard_event(auth1_headers):
    payload = {
        "id": "event_fani_test_01",
        "name": "Cyclone Fani Test",
        "hazard_type": "cyclone",
        "category": "ESCS",
        "status": "MONITORING",
        "provenance_tag": "HISTORICAL_REPLAY",
        "source_name": "IMD",
        "source_timestamp": datetime.now(timezone.utc).isoformat(),
        "max_wind_kmh": 215.0,
        "forward_speed_kmh": 17.0,
        "target_landfall": "Puri Coast",
    }
    resp = client.post("/api/hazard-events", json=payload, headers=auth1_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["id"] == "event_fani_test_01"
    assert data["name"] == "Cyclone Fani Test"
    assert data["status"] == "MONITORING"
    assert data["org_id"] == 901

    # Verify initial creation audit log was recorded
    db = TestingSessionLocal()
    logs = db.query(HazardEventLog).filter_by(hazard_event_id="event_fani_test_01").all()
    assert len(logs) == 1
    assert logs[0].action == "EVENT_CREATED"
    assert logs[0].new_status == "MONITORING"
    db.close()


# 2. List and retrieve
def test_list_and_retrieve_hazard_events(auth1_headers, auth2_headers):
    # Create event in org 901
    payload1 = {
        "id": "event_org1_01",
        "name": "Event Org 1",
        "category": "VSCS",
        "source_timestamp": datetime.now(timezone.utc).isoformat(),
        "max_wind_kmh": 140.0,
        "forward_speed_kmh": 15.0,
    }
    client.post("/api/hazard-events", json=payload1, headers=auth1_headers)

    # List as org 901 -> contains event_org1_01
    resp1 = client.get("/api/hazard-events", headers=auth1_headers)
    assert resp1.status_code == 200
    events1 = resp1.json()
    assert any(e["id"] == "event_org1_01" for e in events1)

    # Retrieve single
    resp_get = client.get("/api/hazard-events/event_org1_01", headers=auth1_headers)
    assert resp_get.status_code == 200
    assert resp_get.json()["id"] == "event_org1_01"

    # List as org 902 -> does NOT contain event_org1_01
    resp2 = client.get("/api/hazard-events", headers=auth2_headers)
    assert resp2.status_code == 200
    events2 = resp2.json()
    assert not any(e["id"] == "event_org1_01" for e in events2)


# 3. Update permitted fields
def test_update_permitted_fields(auth1_headers):
    payload = {
        "id": "event_update_test",
        "name": "Initial Name",
        "category": "CS",
        "source_timestamp": datetime.now(timezone.utc).isoformat(),
        "max_wind_kmh": 85.0,
        "forward_speed_kmh": 12.0,
    }
    client.post("/api/hazard-events", json=payload, headers=auth1_headers)

    update_payload = {
        "name": "Updated Cyclone Name",
        "max_wind_kmh": 95.0,
        "target_landfall": "Gopalpur",
    }
    resp = client.patch("/api/hazard-events/event_update_test", json=update_payload, headers=auth1_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Updated Cyclone Name"
    assert data["max_wind_kmh"] == 95.0
    assert data["target_landfall"] == "Gopalpur"


# 4. Invalid request validation
def test_invalid_request_validation(auth1_headers):
    # Missing required category
    bad_payload = {
        "name": "Missing Category",
        "source_timestamp": datetime.now(timezone.utc).isoformat(),
        "max_wind_kmh": 100.0,
        "forward_speed_kmh": 10.0,
    }
    resp = client.post("/api/hazard-events", json=bad_payload, headers=auth1_headers)
    assert resp.status_code == 422

    # Negative wind speed
    bad_wind = {
        "name": "Negative Wind",
        "category": "CS",
        "source_timestamp": datetime.now(timezone.utc).isoformat(),
        "max_wind_kmh": -50.0,
        "forward_speed_kmh": 10.0,
    }
    resp2 = client.post("/api/hazard-events", json=bad_wind, headers=auth1_headers)
    assert resp2.status_code == 422


# 5. Valid state transitions sequence
def test_valid_state_transitions(auth1_headers):
    now = datetime.now(timezone.utc)
    payload = {
        "id": "event_transition_test",
        "name": "Cyclone Transitions",
        "category": "ESCS",
        "status": "MONITORING",
        "source_timestamp": now.isoformat(),
        "max_wind_kmh": 215.0,
        "forward_speed_kmh": 18.0,
    }
    client.post("/api/hazard-events", json=payload, headers=auth1_headers)

    # 1. MONITORING -> WARNING
    r1 = client.patch(
        "/api/hazard-events/event_transition_test/status",
        json={"status": "WARNING", "note": "Approaching coastline within 36h"},
        headers=auth1_headers,
    )
    assert r1.status_code == 200
    assert r1.json()["status"] == "WARNING"

    # 2. WARNING -> EVAC_ORDERED (source_timestamp is fresh: now <= 6h)
    r2 = client.patch(
        "/api/hazard-events/event_transition_test/status",
        json={"status": "EVAC_ORDERED", "note": "Mandatory evacuation ordered for coastal blocks", "reference_time": now.isoformat()},
        headers=auth1_headers,
    )
    assert r2.status_code == 200
    assert r2.json()["status"] == "EVAC_ORDERED"

    # 3. EVAC_ORDERED -> DEPLOYED
    r3 = client.patch(
        "/api/hazard-events/event_transition_test/status",
        json={"status": "DEPLOYED", "note": "Emergency units deployed"},
        headers=auth1_headers,
    )
    assert r3.status_code == 200
    assert r3.json()["status"] == "DEPLOYED"

    # 4. DEPLOYED -> RESOLVED
    r4 = client.patch(
        "/api/hazard-events/event_transition_test/status",
        json={"status": "RESOLVED", "note": "Cyclone dissipated, response resolved"},
        headers=auth1_headers,
    )
    assert r4.status_code == 200
    assert r4.json()["status"] == "RESOLVED"


# 6. Invalid / skipped transitions rejected
def test_invalid_skipped_transitions_rejected(auth1_headers):
    payload = {
        "id": "event_skip_test",
        "name": "Skip Test",
        "category": "CS",
        "status": "MONITORING",
        "source_timestamp": datetime.now(timezone.utc).isoformat(),
        "max_wind_kmh": 80.0,
        "forward_speed_kmh": 10.0,
    }
    client.post("/api/hazard-events", json=payload, headers=auth1_headers)

    # Cannot skip MONITORING -> DEPLOYED directly
    resp = client.patch(
        "/api/hazard-events/event_skip_test/status",
        json={"status": "DEPLOYED"},
        headers=auth1_headers,
    )
    assert resp.status_code == 409
    assert "Cannot transition cyclone status" in resp.json()["error"]["message"]


# 7. Cross-organisation GET returns 403
def test_cross_org_get_returns_403(auth1_headers, auth2_headers):
    payload = {
        "id": "event_org1_secret",
        "name": "Org 1 Internal Event",
        "category": "VSCS",
        "source_timestamp": datetime.now(timezone.utc).isoformat(),
        "max_wind_kmh": 130.0,
        "forward_speed_kmh": 14.0,
    }
    client.post("/api/hazard-events", json=payload, headers=auth1_headers)

    # Auth 2 (Org 902) attempts to read Org 901 event
    resp = client.get("/api/hazard-events/event_org1_secret", headers=auth2_headers)
    assert resp.status_code == 403
    assert "belongs to another organization" in resp.json()["error"]["message"]


# 8. Cross-organisation PATCH returns 403
def test_cross_org_patch_returns_403(auth1_headers, auth2_headers):
    payload = {
        "id": "event_org1_lock",
        "name": "Org 1 Locked",
        "category": "CS",
        "source_timestamp": datetime.now(timezone.utc).isoformat(),
        "max_wind_kmh": 75.0,
        "forward_speed_kmh": 10.0,
    }
    client.post("/api/hazard-events", json=payload, headers=auth1_headers)

    # Auth 2 attempts to change status of Org 901 event
    resp = client.patch(
        "/api/hazard-events/event_org1_lock/status",
        json={"status": "WARNING"},
        headers=auth2_headers,
    )
    assert resp.status_code == 403
    assert "belongs to another organization" in resp.json()["error"]["message"]


# 9. Organisation-less user denied
def test_org_less_user_denied(no_org_headers):
    # Cannot create
    payload = {
        "name": "No Org Event",
        "category": "CS",
        "source_timestamp": datetime.now(timezone.utc).isoformat(),
        "max_wind_kmh": 70.0,
        "forward_speed_kmh": 10.0,
    }
    resp1 = client.post("/api/hazard-events", json=payload, headers=no_org_headers)
    assert resp1.status_code == 403
    assert "not assigned to any organization" in resp1.json()["error"]["message"]

    # Cannot list
    resp2 = client.get("/api/hazard-events", headers=no_org_headers)
    assert resp2.status_code == 403


# 10. Role restrictions: responder cannot transition status
def test_role_restrictions_responder_forbidden(auth1_headers, resp1_headers):
    payload = {
        "id": "event_role_check",
        "name": "Role Check Event",
        "category": "CS",
        "source_timestamp": datetime.now(timezone.utc).isoformat(),
        "max_wind_kmh": 85.0,
        "forward_speed_kmh": 12.0,
    }
    client.post("/api/hazard-events", json=payload, headers=auth1_headers)

    # Responder attempts status transition
    resp = client.patch(
        "/api/hazard-events/event_role_check/status",
        json={"status": "WARNING"},
        headers=resp1_headers,
    )
    assert resp.status_code == 403
    assert "not authorized to change hazard event status" in resp.json()["error"]["message"]


# 11. Stale source timestamp blocks EVAC_ORDERED
def test_stale_source_blocks_evac_ordered(auth1_headers):
    # Source timestamp is 12 hours old
    now = datetime.now(timezone.utc)
    old_ts = now - timedelta(hours=12)

    payload = {
        "id": "event_stale_test",
        "name": "Stale Cyclone Event",
        "category": "ESCS",
        "status": "WARNING",
        "source_timestamp": old_ts.isoformat(),
        "max_wind_kmh": 210.0,
        "forward_speed_kmh": 15.0,
    }
    client.post("/api/hazard-events", json=payload, headers=auth1_headers)

    # Transition to EVAC_ORDERED evaluated at reference_time = now
    resp = client.patch(
        "/api/hazard-events/event_stale_test/status",
        json={"status": "EVAC_ORDERED", "reference_time": now.isoformat()},
        headers=auth1_headers,
    )
    assert resp.status_code == 409
    err = resp.json()["error"]
    assert err["code"] == "INVALID_STATUS_TRANSITION"
    assert "STALE_DATA" in err["details"]["interlock_flags"]


# 12. Fresh source timestamp permits EVAC_ORDERED
def test_fresh_source_permits_evac_ordered(auth1_headers):
    now = datetime.now(timezone.utc)
    fresh_ts = now - timedelta(hours=2)

    payload = {
        "id": "event_fresh_test",
        "name": "Fresh Cyclone Event",
        "category": "ESCS",
        "status": "WARNING",
        "source_timestamp": fresh_ts.isoformat(),
        "max_wind_kmh": 210.0,
        "forward_speed_kmh": 15.0,
    }
    client.post("/api/hazard-events", json=payload, headers=auth1_headers)

    resp = client.patch(
        "/api/hazard-events/event_fresh_test/status",
        json={"status": "EVAC_ORDERED", "reference_time": now.isoformat()},
        headers=auth1_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "EVAC_ORDERED"


# 13. Future source timestamp blocks EVAC_ORDERED
def test_future_source_blocks_evac_ordered(auth1_headers):
    now = datetime.now(timezone.utc)
    future_ts = now + timedelta(hours=3)

    payload = {
        "id": "event_future_test",
        "name": "Future Cyclone Event",
        "category": "ESCS",
        "status": "WARNING",
        "source_timestamp": future_ts.isoformat(),
        "max_wind_kmh": 210.0,
        "forward_speed_kmh": 15.0,
    }
    client.post("/api/hazard-events", json=payload, headers=auth1_headers)

    resp = client.patch(
        "/api/hazard-events/event_future_test/status",
        json={"status": "EVAC_ORDERED", "reference_time": now.isoformat()},
        headers=auth1_headers,
    )
    assert resp.status_code == 409
    err = resp.json()["error"]
    assert err["code"] == "INVALID_STATUS_TRANSITION"
    assert "FUTURE_SOURCE_TIMESTAMP" in err["details"]["interlock_flags"]


# 14. Every successful transition creates exactly one audit row
def test_successful_transition_creates_exact_audit_log(auth1_headers):
    now = datetime.now(timezone.utc)
    payload = {
        "id": "event_audit_test",
        "name": "Audit Test Event",
        "category": "CS",
        "status": "MONITORING",
        "source_timestamp": now.isoformat(),
        "max_wind_kmh": 80.0,
        "forward_speed_kmh": 10.0,
    }
    client.post("/api/hazard-events", json=payload, headers=auth1_headers)

    # Initial log count: 1 (EVENT_CREATED)
    db = TestingSessionLocal()
    init_logs = db.query(HazardEventLog).filter_by(hazard_event_id="event_audit_test").count()
    assert init_logs == 1
    db.close()

    # Perform transition to WARNING
    client.patch(
        "/api/hazard-events/event_audit_test/status",
        json={"status": "WARNING", "note": "Advisory upgraded to warning"},
        headers=auth1_headers,
    )

    db = TestingSessionLocal()
    logs = (
        db.query(HazardEventLog)
        .filter_by(hazard_event_id="event_audit_test")
        .order_by(HazardEventLog.changed_at.asc())
        .all()
    )
    assert len(logs) == 2
    assert logs[1].old_status == "MONITORING"
    assert logs[1].new_status == "WARNING"
    assert logs[1].action == "STATUS_CHANGE_WARNING"
    assert logs[1].changed_by == "auth1@osdma.test"
    assert logs[1].note == "Advisory upgraded to warning"
    db.close()


# 15. Failed transition creates no audit row
def test_failed_transition_creates_no_audit_row(auth1_headers):
    now = datetime.now(timezone.utc)
    payload = {
        "id": "event_audit_fail",
        "name": "Audit Fail Event",
        "category": "CS",
        "status": "MONITORING",
        "source_timestamp": now.isoformat(),
        "max_wind_kmh": 80.0,
        "forward_speed_kmh": 10.0,
    }
    client.post("/api/hazard-events", json=payload, headers=auth1_headers)

    db = TestingSessionLocal()
    before_count = db.query(HazardEventLog).filter_by(hazard_event_id="event_audit_fail").count()
    assert before_count == 1
    db.close()

    # Attempt invalid transition (MONITORING -> RESOLVED is forbidden)
    resp = client.patch(
        "/api/hazard-events/event_audit_fail/status",
        json={"status": "RESOLVED"},
        headers=auth1_headers,
    )
    assert resp.status_code == 409

    db = TestingSessionLocal()
    after_count = db.query(HazardEventLog).filter_by(hazard_event_id="event_audit_fail").count()
    assert after_count == 1, "Failed transition must NOT create any new audit record"
    db.close()


# 16. Audit and event update rollback atomically on failure
def test_atomic_rollback_on_failure(auth1_headers):
    # Stale timestamp: evacuation is refused
    stale_ts = datetime.now(timezone.utc) - timedelta(hours=10)
    payload = {
        "id": "event_rollback_test",
        "name": "Rollback Test",
        "category": "ESCS",
        "status": "WARNING",
        "source_timestamp": stale_ts.isoformat(),
        "max_wind_kmh": 220.0,
        "forward_speed_kmh": 16.0,
    }
    client.post("/api/hazard-events", json=payload, headers=auth1_headers)

    resp = client.patch(
        "/api/hazard-events/event_rollback_test/status",
        json={"status": "EVAC_ORDERED"},
        headers=auth1_headers,
    )
    assert resp.status_code == 409

    # Verify event status remained strictly WARNING and no EVAC_ORDERED log exists
    db = TestingSessionLocal()
    ev = db.query(HazardEvent).filter_by(id="event_rollback_test").first()
    assert ev.status == "WARNING"

    evac_logs = (
        db.query(HazardEventLog)
        .filter_by(hazard_event_id="event_rollback_test", new_status="EVAC_ORDERED")
        .count()
    )
    assert evac_logs == 0
    db.close()


# 17. Security Review: Admin from Org A cannot read Org B's event (403)
def test_admin_from_org_a_cannot_read_org_b_event(admin1_headers, auth2_headers):
    # Create event in Org 902
    payload = {
        "id": "event_org2_admin_check",
        "name": "Org 2 Event",
        "category": "VSCS",
        "status": "MONITORING",
        "source_timestamp": datetime.now(timezone.utc).isoformat(),
        "max_wind_kmh": 140.0,
        "forward_speed_kmh": 12.0,
    }
    client.post("/api/hazard-events", json=payload, headers=auth2_headers)

    # Admin from Org 901 attempts to read event belonging to Org 902
    resp = client.get("/api/hazard-events/event_org2_admin_check", headers=admin1_headers)
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "FORBIDDEN_CROSS_ORG"


# 18. Security Review: Admin from Org A cannot modify Org B's event (403)
def test_admin_from_org_a_cannot_modify_org_b_event(admin1_headers, auth2_headers):
    payload = {
        "id": "event_org2_admin_mod",
        "name": "Org 2 Event for Mod",
        "category": "VSCS",
        "status": "MONITORING",
        "source_timestamp": datetime.now(timezone.utc).isoformat(),
        "max_wind_kmh": 140.0,
        "forward_speed_kmh": 12.0,
    }
    client.post("/api/hazard-events", json=payload, headers=auth2_headers)

    # Admin from Org 901 attempts PATCH metadata on Org 902 event
    resp_patch = client.patch(
        "/api/hazard-events/event_org2_admin_mod",
        json={"name": "Hijacked Name"},
        headers=admin1_headers,
    )
    assert resp_patch.status_code == 403
    assert resp_patch.json()["error"]["code"] == "FORBIDDEN_CROSS_ORG"

    # Admin from Org 901 attempts PATCH status on Org 902 event
    resp_status = client.patch(
        "/api/hazard-events/event_org2_admin_mod/status",
        json={"status": "WARNING"},
        headers=admin1_headers,
    )
    assert resp_status.status_code == 403
    assert resp_status.json()["error"]["code"] == "FORBIDDEN_CROSS_ORG"


# 19. Security Review: Admin event listing restricted to own organization
def test_admin_event_listing_restricted_to_own_org(admin1_headers, auth1_headers, auth2_headers):
    # Event in Org 901
    client.post(
        "/api/hazard-events",
        json={
            "id": "event_org1_listed",
            "name": "Org 1 Event",
            "category": "CS",
            "status": "MONITORING",
            "source_timestamp": datetime.now(timezone.utc).isoformat(),
            "max_wind_kmh": 70.0,
            "forward_speed_kmh": 10.0,
        },
        headers=auth1_headers,
    )
    # Event in Org 902
    client.post(
        "/api/hazard-events",
        json={
            "id": "event_org2_hidden",
            "name": "Org 2 Event",
            "category": "CS",
            "status": "MONITORING",
            "source_timestamp": datetime.now(timezone.utc).isoformat(),
            "max_wind_kmh": 70.0,
            "forward_speed_kmh": 10.0,
        },
        headers=auth2_headers,
    )

    # Admin from Org 901 lists events
    resp = client.get("/api/hazard-events", headers=admin1_headers)
    assert resp.status_code == 200
    listed_ids = [e["id"] for e in resp.json()]
    assert "event_org1_listed" in listed_ids
    assert "event_org2_hidden" not in listed_ids, "Admin must not see cross-tenant events in listing"


# 20. Security Review: Org-less admin is denied tenant access (403)
def test_org_less_admin_denied(admin_no_org_headers):
    resp_list = client.get("/api/hazard-events", headers=admin_no_org_headers)
    assert resp_list.status_code == 403
    assert resp_list.json()["error"]["code"] == "FORBIDDEN_NO_ORG"

    resp_create = client.post(
        "/api/hazard-events",
        json={
            "id": "event_unassigned_admin",
            "name": "Unassigned Admin Event",
            "category": "CS",
            "status": "MONITORING",
            "source_timestamp": datetime.now(timezone.utc).isoformat(),
            "max_wind_kmh": 70.0,
            "forward_speed_kmh": 10.0,
        },
        headers=admin_no_org_headers,
    )
    assert resp_create.status_code == 403
    assert resp_create.json()["error"]["code"] == "FORBIDDEN_NO_ORG"


# 21. Trust Boundary: Client cannot bypass stale data interlock with forged reference_time
def test_client_cannot_bypass_stale_data_with_forged_reference_time(auth1_headers):
    # Real source telemetry is 12 hours old
    now = datetime.now(timezone.utc)
    old_ts = now - timedelta(hours=12)

    client.post(
        "/api/hazard-events",
        json={
            "id": "event_forged_ref_test",
            "name": "Forged Ref Test",
            "category": "ESCS",
            "status": "WARNING",
            "source_timestamp": old_ts.isoformat(),
            "max_wind_kmh": 220.0,
            "forward_speed_kmh": 15.0,
        },
        headers=auth1_headers,
    )

    # Attacker tries to bypass freshness check by passing reference_time = old_ts + 1 hour (age=1h)
    forged_ref = old_ts + timedelta(hours=1)
    resp = client.patch(
        "/api/hazard-events/event_forged_ref_test/status",
        json={"status": "EVAC_ORDERED", "reference_time": forged_ref.isoformat()},
        headers=auth1_headers,
    )
    # Server enforces server-side clock; true age is 12h > 6h -> must be rejected with 409
    assert resp.status_code == 409
    err = resp.json()["error"]
    assert err["code"] == "INVALID_STATUS_TRANSITION"
    assert "STALE_DATA" in err["details"]["interlock_flags"]


# 22. Source Integrity: Analyst cannot modify source_timestamp (403)
def test_analyst_cannot_modify_source_timestamp(auth1_headers, analyst1_headers):
    client.post(
        "/api/hazard-events",
        json={
            "id": "event_analyst_tamper",
            "name": "Tamper Test",
            "category": "CS",
            "status": "MONITORING",
            "source_timestamp": (datetime.now(timezone.utc) - timedelta(hours=8)).isoformat(),
            "max_wind_kmh": 80.0,
            "forward_speed_kmh": 10.0,
        },
        headers=auth1_headers,
    )

    # Analyst attempts to update source_timestamp to bump freshness
    resp = client.patch(
        "/api/hazard-events/event_analyst_tamper",
        json={"source_timestamp": datetime.now(timezone.utc).isoformat()},
        headers=analyst1_headers,
    )
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "FORBIDDEN_TELEMETRY_UPDATE"


# 23. Source Integrity: Cannot update source_timestamp to future or past
def test_cannot_update_source_timestamp_to_future_or_past(auth1_headers):
    now = datetime.now(timezone.utc)
    client.post(
        "/api/hazard-events",
        json={
            "id": "event_ts_bounds",
            "name": "Bounds Test",
            "category": "CS",
            "status": "MONITORING",
            "source_timestamp": (now - timedelta(hours=4)).isoformat(),
            "max_wind_kmh": 80.0,
            "forward_speed_kmh": 10.0,
        },
        headers=auth1_headers,
    )

    # 1. Future timestamp -> 422
    future_ts = now + timedelta(hours=3)
    resp_fut = client.patch(
        "/api/hazard-events/event_ts_bounds",
        json={"source_timestamp": future_ts.isoformat()},
        headers=auth1_headers,
    )
    assert resp_fut.status_code == 422
    assert resp_fut.json()["error"]["code"] == "FUTURE_SOURCE_TIMESTAMP"

    # 2. Regressive timestamp (older than current 4h old) -> 422
    past_ts = now - timedelta(hours=8)
    resp_past = client.patch(
        "/api/hazard-events/event_ts_bounds",
        json={"source_timestamp": past_ts.isoformat()},
        headers=auth1_headers,
    )
    assert resp_past.status_code == 422
    assert resp_past.json()["error"]["code"] == "REGRESSIVE_SOURCE_TIMESTAMP"


# 24. Source Integrity: Valid source_timestamp update creates audit log
def test_valid_source_timestamp_update_creates_audit_log(auth1_headers):
    now = datetime.now(timezone.utc)
    client.post(
        "/api/hazard-events",
        json={
            "id": "event_ts_audit",
            "name": "Audit Ts Test",
            "category": "CS",
            "status": "MONITORING",
            "source_timestamp": (now - timedelta(hours=5)).isoformat(),
            "max_wind_kmh": 80.0,
            "forward_speed_kmh": 10.0,
        },
        headers=auth1_headers,
    )

    # Valid newer telemetry update
    newer_ts = now - timedelta(hours=1)
    resp = client.patch(
        "/api/hazard-events/event_ts_audit",
        json={"source_timestamp": newer_ts.isoformat(), "note": "IMD Bulletin #05 update"},
        headers=auth1_headers,
    )
    assert resp.status_code == 200

    # Retrieve audit logs
    logs_resp = client.get("/api/hazard-events/event_ts_audit/logs", headers=auth1_headers)
    assert logs_resp.status_code == 200
    logs = logs_resp.json()
    assert len(logs) == 2
    assert logs[1]["action"] == "SOURCE_TELEMETRY_UPDATED"
    assert "IMD Bulletin #05 update" in logs[1]["note"]


# 25. Database Schema Consistency: Verify types and foreign keys in PostgreSQL
def test_audit_schema_and_foreign_keys():
    from sqlalchemy import inspect
    insp = inspect(TestingSessionLocal().bind)

    # 1. hazard_events.id vs hazard_event_logs.hazard_event_id
    cols_events = {c["name"]: str(c["type"]) for c in insp.get_columns("hazard_events")}
    cols_logs = {c["name"]: str(c["type"]) for c in insp.get_columns("hazard_event_logs")}
    cols_users = {c["name"]: str(c["type"]) for c in insp.get_columns("users")}

    assert "VARCHAR(64)" in cols_events["id"].upper()
    assert "VARCHAR(64)" in cols_logs["hazard_event_id"].upper()
    assert "VARCHAR(120)" in cols_logs["changed_by"].upper()
    assert "VARCHAR" in cols_users["id"].upper()

    # 2. Check foreign key constraint physically exists in PostgreSQL
    fks = insp.get_foreign_keys("hazard_event_logs")
    fk_event = next((f for f in fks if f["constrained_columns"] == ["hazard_event_id"]), None)
    assert fk_event is not None, "Foreign key fk_hazard_event_logs_event_id must exist in PostgreSQL"
    assert fk_event["referred_table"] == "hazard_events"
    assert fk_event["referred_columns"] == ["id"]
    assert fk_event["options"].get("ondelete") == "CASCADE"
