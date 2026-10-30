import json
import os
import pytest
from backend.app.services.risk.briefing_template import generate_situation_briefing

FIXTURE_PATH = os.path.join(os.path.dirname(__file__), "..", "static", "fixtures", "cyclone_contract_fixture.json")

def test_cyclone_contract_fixture_structure():
    assert os.path.exists(FIXTURE_PATH), "cyclone_contract_fixture.json must exist in static/fixtures/"
    with open(FIXTURE_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert data["event_id"] == "fani_2019"
    assert "landfall" in data
    assert data["landfall"]["peak_wind_kmh"] >= 180

    blocks = data.get("ranked_blocks", [])
    assert len(blocks) == 39, "Must contain all 39 Odisha coastal blocks"

    # Check top block and reasons
    top_block = blocks[0]
    assert "score" in top_block
    assert top_block["score"] >= 80.0
    assert "reasons" in top_block
    assert len(top_block["reasons"]) == 6, "Every block must have 6-factor itemized reasons[]"

    factors = {r["factor"] for r in top_block["reasons"]}
    expected_factors = {
        "wind_exposure", "rainfall_flood", "storm_surge",
        "population_exposure", "critical_infrastructure", "urgency_window"
    }
    assert factors == expected_factors

    assets = data.get("assets", [])
    assert len(assets) >= 40, "Must contain curated strategic assets"

    routes = data.get("routes", [])
    assert len(routes) >= 10, "Must contain coastal highway corridors"


def test_deterministic_briefing_6_lines():
    with open(FIXTURE_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    hazard_event = {
        "name": data["event_name"],
        "category": "Extremely Severe Cyclonic Storm",
        "forward_speed_kmh": 18,
        "max_wind_kmh": data["landfall"]["peak_wind_kmh"],
        "target_landfall": data["landfall"]["location"]
    }

    briefing = generate_situation_briefing(
        hazard_event=hazard_event,
        top_areas=data["ranked_blocks"],
        threatened_assets=data["assets"][:5],
        route_statuses=data["routes"],
        staging_recommendation={"name": "Cuttack Central Warehouse", "district": "Cuttack", "rationale": "Outside 90 km/h wind"}
    )

    assert len(briefing["lines"]) == 6
    assert briefing["lines"][0].startswith("1. [EVENT STATUS]:")
    assert briefing["lines"][1].startswith("2. [TOP PRIORITY]:")
    assert briefing["lines"][2].startswith("3. [CRITICAL ASSETS]:")
    assert briefing["lines"][3].startswith("4. [LOGISTICS & ACCESS]:")
    assert briefing["lines"][4].startswith("5. [STAGING RECOMMENDATION]:")
    assert briefing["lines"][5].startswith("6. [SAFETY INTERLOCKS]:")
    assert briefing["external_calls_made"] == 0
