import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_get_area_risk_endpoint():
    response = client.get("/api/area-risk")
    assert response.status_code == 200
    data = response.json()
    assert data["event_id"] == "fani_2019"
    assert len(data["ranked_blocks"]) == 39
    assert len(data["ranked_blocks"][0]["reasons"]) == 6


def test_post_what_if_endpoint():
    payload = {
        "track_shift_km": 20.0,
        "wind_delta_percent": 10.0
    }
    response = client.post("/api/what-if", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["is_simulated"] is True
    assert data["provenance_tag"] == "SIMULATED"
    assert data["perturbed_landfall"]["track_shift_km"] == 20.0
    assert len(data["ranked_blocks"]) == 39


def test_get_briefing_endpoint():
    response = client.get("/api/briefing")
    assert response.status_code == 200
    data = response.json()
    assert len(data["lines"]) == 6
    assert data["lines"][0].startswith("1. [EVENT STATUS]:")
    assert data["external_calls_made"] == 0
