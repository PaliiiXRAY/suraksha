"""
SURAKSHA — Universal Multi-Hazard Intelligence & Response Engine Tests
Verifies:
1. Multi-hazard scenario listing across 4 satellite data sources (Cyclone, Wildfire, Flood, Earthquake).
2. Canonical HazardFootprintEvent schemas and offline fallback telemetry packs.
3. Spatial Intersection Engine (block prioritization with reasons[], asset exposure, route cuts).
4. Government Portal -> Response Portal operational handoff and mission status lifecycle.
"""
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def test_list_hazard_scenarios():
    """Verify that all 4 pre-packaged satellite scenarios are returned."""
    resp = client.get("/api/hazards/scenarios")
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert len(data) >= 4

    types = {item["hazard_type"] for item in data}
    assert "CYCLONE" in types
    assert "WILDFIRE" in types
    assert "FLOOD" in types
    assert "EARTHQUAKE" in types

    for item in data:
        assert "event_id" in item
        assert "provenance" in item
        assert "source" in item
        assert "name" in item
        assert "attributes" in item


def test_get_raw_footprint_events():
    """Verify canonical HazardFootprintEvent contract for each hazard."""
    # 1. Cyclone (INSAT-3DR / IMD)
    resp_cyc = client.get("/api/hazards/scenarios/CYCLONE")
    assert resp_cyc.status_code == 200
    cyc_data = resp_cyc.json()
    assert cyc_data["hazard_type"] == "CYCLONE"
    assert cyc_data["severity"] in ["CRITICAL", "HIGH"]
    assert "max_wind_kmh" in cyc_data["attributes"]
    assert cyc_data["geometry"]["type"] in ["Polygon", "MultiPolygon"]

    # 2. Wildfire (NASA / Suomi-NPP VIIRS)
    resp_fire = client.get("/api/hazards/scenarios/WILDFIRE")
    assert resp_fire.status_code == 200
    fire_data = resp_fire.json()
    assert fire_data["hazard_type"] == "WILDFIRE"
    assert "total_frp_mw" in fire_data["attributes"]

    # 3. Flood (Sentinel-1 SAR C-band)
    resp_flood = client.get("/api/hazards/scenarios/FLOOD")
    assert resp_flood.status_code == 200
    flood_data = resp_flood.json()
    assert flood_data["hazard_type"] == "FLOOD"
    assert "satellite_sensor" in flood_data["attributes"]

    # 4. Earthquake (USGS / NDMA ShakeMap)
    resp_quake = client.get("/api/hazards/scenarios/EARTHQUAKE")
    assert resp_quake.status_code == 200
    quake_data = resp_quake.json()
    assert quake_data["hazard_type"] == "EARTHQUAKE"
    assert "modified_mercalli_intensity" in quake_data["attributes"]

    # 5. Invalid hazard returns 400
    resp_invalid = client.get("/api/hazards/scenarios/METEOR_STRIKE")
    assert resp_invalid.status_code == 400


def test_spatial_exposure_cyclone_evaluation():
    """Verify spatial intersection and block prioritization for Cyclone Fani."""
    resp = client.post("/api/hazards/evaluate?hazard_type=CYCLONE")
    assert resp.status_code == 200, resp.text
    report = resp.json()

    assert report["hazard_type"] == "CYCLONE"
    assert len(report["ranked_blocks"]) > 0

    # Ensure ranking is strictly sorted descending by priority_score
    scores = [b["priority_score"] for b in report["ranked_blocks"]]
    assert scores == sorted(scores, reverse=True)

    # Verify explainability: each ranked block has deterministic reasons[]
    top_block = report["ranked_blocks"][0]
    assert 0 <= top_block["priority_score"] <= 100
    assert len(top_block["reasons"]) > 0
    assert any("km/h" in r or "wind" in r.lower() or "exposure" in r.lower() for r in top_block["reasons"])

    # Verify asset exposure
    assert len(report["exposed_assets"]) > 0
    for asset in report["exposed_assets"]:
        assert "name" in asset
        assert "exposure_level" in asset
        assert "distance_km" in asset

    # Verify route cutoffs
    assert len(report["evaluated_routes"]) > 0
    statuses = {r["status"] for r in report["evaluated_routes"]}
    assert "CUT" in statuses or "AT_RISK" in statuses or "PASSABLE" in statuses


def test_spatial_exposure_flood_evaluation():
    """Verify spatial exposure evaluation on Sentinel-1 SAR flood scenario."""
    resp = client.post("/api/hazards/evaluate?hazard_type=FLOOD")
    assert resp.status_code == 200
    report = resp.json()

    assert report["hazard_type"] == "FLOOD"
    assert len(report["ranked_blocks"]) > 0
    # Kujang or Ersama in the Mahanadi delta should have high exposure
    top_block_names = [b["block_name"] for b in report["ranked_blocks"][:10]]
    assert any(name in ["Kujang", "Ersama", "Paradip", "Mahakalapada", "Puri", "Brahmagiri"] for name in top_block_names)


def test_spatial_exposure_wildfire_evaluation():
    """Verify spatial exposure evaluation on VIIRS wildfire scenario."""
    resp = client.post("/api/hazards/evaluate?hazard_type=WILDFIRE")
    assert resp.status_code == 200
    report = resp.json()

    assert report["hazard_type"] == "WILDFIRE"
    assert len(report["ranked_blocks"]) > 0


def test_government_to_response_operational_loop():
    """
    Verify full Command & Decision loop:
    1. List existing operational tasks.
    2. Government Portal authorizes a new tactical task.
    3. Response Portal views task as ASSIGNED.
    4. Response Portal mobilizes and completes mission with field ground report.
    """
    # 1. Check initial task list
    resp_init = client.get("/api/hazards/operations")
    assert resp_init.status_code == 200
    init_tasks = resp_init.json()
    initial_count = len(init_tasks)

    # 2. Government authorizes tactical task
    payload = {
        "hazard_event_id": "HZ-2019-FANI-CYCLONE",
        "title": "Airdrop Emergency Rations to Cutoff Coastal Villages",
        "priority": "CRITICAL",
        "location": "Astaranga Coastal Sector, Puri",
        "assigned_unit": "ODRAF Team 04",
        "instructions": "Coordinate with district magistrate and drop dry food packets and halogen water tablets.",
    }
    resp_auth = client.post("/api/hazards/operations/authorize", json=payload)
    assert resp_auth.status_code == 201, resp_auth.text
    created = resp_auth.json()

    assert "id" in created
    task_id = created["id"]
    assert created["status"] == "ASSIGNED"
    assert created["priority"] == "CRITICAL"
    assert created["assigned_unit"] == "ODRAF Team 04"

    # 3. Response portal retrieves updated task list
    resp_list = client.get("/api/hazards/operations")
    assert resp_list.status_code == 200
    updated_tasks = resp_list.json()
    assert len(updated_tasks) == initial_count + 1
    assert updated_tasks[0]["id"] == task_id

    # 4. Responder transitions status to MOBILIZED with field note
    patch_mob = {
        "status": "MOBILIZED",
        "field_note": "Team in transit via NH-316 with rescue convoys.",
    }
    resp_mob = client.patch(f"/api/hazards/operations/{task_id}/status", json=patch_mob)
    assert resp_mob.status_code == 200
    assert resp_mob.json()["status"] == "MOBILIZED"

    # 5. Responder reports ON_SCENE with ground road block telemetry
    patch_scene = {
        "status": "ON_SCENE",
        "field_note": "Fallen banyan trees blocking NH-316 feeder link at km 42.",
        "reported_road_blocked": True,
        "flood_depth_meters": 1.2,
    }
    resp_scene = client.patch(f"/api/hazards/operations/{task_id}/status", json=patch_scene)
    assert resp_scene.status_code == 200
    scene_data = resp_scene.json()
    assert scene_data["status"] == "ON_SCENE"
    assert len(scene_data["field_reports"]) >= 3
    last_report = scene_data["field_reports"][-1]
    assert last_report["road_blocked"] is True
    assert last_report["flood_depth_m"] == 1.2
