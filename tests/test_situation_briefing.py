import time
import socket
import pytest
from backend.app.services.risk.briefing_template import generate_situation_briefing

def test_briefing_renders_six_lines_with_zero_external_calls(monkeypatch):
    # Intercept socket to guarantee no network call can be made
    def fail_socket(*args, **kwargs):
        raise RuntimeError("External network call detected! Briefing must be 100% offline.")
    
    monkeypatch.setattr(socket, "socket", fail_socket)

    hazard_event = {
        "name": "Fani",
        "category": "Extremely Severe Cyclonic Storm",
        "forward_speed_kmh": 16,
        "max_wind_kmh": 215,
        "target_landfall": "Puri, Odisha"
    }

    top_areas = [
        {
            "name": "Puri Sadar",
            "score": 94,
            "reasons": [
                {"factor": "wind", "detail": "wind speeds exceeding 200 km/h with 2.5m storm surge within 2 km"}
            ]
        },
        {"name": "Brahmagiri", "score": 88, "reasons": []}
    ]

    threatened_assets = [
        {"name": "District Headquarters Hospital Puri", "type": "hospital"},
        {"name": "OPTCL Samagara Substation", "type": "electrical_substation"},
        {"name": "Pentakota Cyclone Shelter", "type": "shelter"},
        {"name": "Astaranga Harbor", "type": "port"}
    ]

    route_statuses = [
        {"name": "Puri-Konark Marine Drive (SH-60)", "status": "CUT"},
        {"name": "NH-316 (Bhubaneswar-Puri)", "status": "AT_RISK"},
        {"name": "NH-16 Main Spine", "status": "PASSABLE"}
    ]

    staging_rec = {
        "name": "OSDMA Central Logistics Depot",
        "district": "Cuttack / Bhubaneswar",
        "rationale": "buffered 65 km inland with open NH-16 resupply spine"
    }

    t0 = time.perf_counter()
    res = generate_situation_briefing(
        hazard_event=hazard_event,
        top_areas=top_areas,
        threatened_assets=threatened_assets,
        route_statuses=route_statuses,
        staging_recommendation=staging_rec,
        interlock_flags=[]
    )
    t1 = time.perf_counter()

    duration_ms = (t1 - t0) * 1000
    assert duration_ms < 20.0, f"Took too long: {duration_ms} ms"

    assert res["line_count"] == 6
    assert len(res["lines"]) == 6
    assert res["external_calls_made"] == 0
    assert res["provenance_tag"] == "MODEL_ESTIMATE"

    # Verify content of lines
    assert "FANI" in res["lines"][0]
    assert "Puri Sadar" in res["lines"][1]
    assert "District Headquarters Hospital Puri" in res["lines"][2]
    assert "CUT (Puri-Konark Marine Drive (SH-60))" in res["lines"][3]
    assert "OSDMA Central Logistics Depot" in res["lines"][4]
    assert "ARMED (0 open flags)" in res["lines"][5]

def test_briefing_renders_with_interlock_warning(monkeypatch):
    res = generate_situation_briefing(
        hazard_event={"name": "Fani"},
        top_areas=[],
        threatened_assets=[],
        route_statuses=[],
        staging_recommendation=None,
        interlock_flags=["DATA_STALE_OVER_6H", "IMD_FORECAST_DISCREPANCY"]
    )
    assert res["line_count"] == 6
    assert "REVIEW REQUIRED" in res["lines"][5]
    assert "DATA_STALE_OVER_6H" in res["lines"][5]
    assert "IMD_FORECAST_DISCREPANCY" in res["lines"][5]
    assert res["external_calls_made"] == 0
