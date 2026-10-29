"""
Focused tests for backend/osm_correlator.py (SURAKSHA pre-hackathon triage).

Reproduces the operator-precedence defect in fetch_live_context: elements whose
tags contain man_made but whose geometry is missing (no lat/lon and no center)
must be skipped, not passed to haversine_distance with None coordinates
(charter section 10: reproduce first, then fix).
"""
import json

import pytest

from backend import osm_correlator
from backend.osm_correlator import OSMCorrelator, SEARCH_RADIUS_M


class _FakeResponse:
    """Minimal stand-in for urllib's response object used by fetch_live_context."""

    def __init__(self, payload):
        self._payload = payload

    def read(self):
        return json.dumps(self._payload).encode("utf-8")

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


@pytest.fixture
def offline_overpass(monkeypatch):
    """Force the pure-HTTP Overpass path and capture its query."""
    monkeypatch.setattr(osm_correlator, "HAS_PSYCOPG2", False)
    monkeypatch.setattr(osm_correlator, "SPATIAL_DB_DSN", "")
    captured = {}

    def _install(payload):
        def fake_urlopen(req, timeout=None):
            captured["data"] = req.data.decode("utf-8")
            return _FakeResponse(payload)

        monkeypatch.setattr(osm_correlator.urllib.request, "urlopen", fake_urlopen)
        return captured

    return _install


def test_element_without_coords_is_skipped_not_crashing(offline_overpass):
    """man_made tag with missing geometry must not reach haversine (None coords)."""
    offline_overpass({
        "elements": [
            {"type": "way", "tags": {"man_made": "flare", "name": "No-Geom Flare"}},
        ]
    })

    result = OSMCorrelator.fetch_live_context(20.5, 85.0)

    assert result["live"] is True
    assert result["facility_name"] is None
    assert result["distance_to_facility_m"] == SEARCH_RADIUS_M * 2


def test_element_with_center_coords_still_correlates(offline_overpass):
    """Regression guard: ways carrying center geometry keep matching."""
    offline_overpass({
        "elements": [
            {
                "type": "way",
                "center": {"lat": 20.5001, "lon": 85.0001},
                "tags": {"industrial": "refinery", "name": "Nearby Refinery"},
            },
        ]
    })

    result = OSMCorrelator.fetch_live_context(20.5, 85.0)

    assert result["live"] is True
    assert result["facility_name"] == "Nearby Refinery"
    assert result["facility_type"] == "refinery"
    assert result["distance_to_facility_m"] < 100
