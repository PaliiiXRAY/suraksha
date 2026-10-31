"""
SURAKSHA — Earthquake Hazard Adapter
Ingests USGS / NDMA ShakeMap Seismic Ground Motion Telemetry
and normalizes into a canonical HazardFootprintEvent.
"""
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any

from backend.app.schemas.hazard_footprint import (
    HazardFootprintEvent,
    HazardType,
    SeverityLevel,
    ProvenanceTag,
)


class EarthquakeAdapter:
    """Adapter for USGS / NDMA ShakeMap Ground Acceleration Telemetry."""

    @staticmethod
    def get_footprint(data_dir: Path = None) -> HazardFootprintEvent:
        if data_dir is None:
            data_dir = Path(__file__).resolve().parents[4] / "db" / "seed" / "data"

        eq_file = data_dir / "seismic_shakemap_contour.geojson"

        # Default fallback polygon
        geometry = {
            "type": "Polygon",
            "coordinates": [
                [
                    [85.5000, 19.6000],
                    [86.0000, 19.6500],
                    [86.2500, 20.0000],
                    [86.1000, 20.3500],
                    [85.6500, 20.2500],
                    [85.4000, 19.9000],
                    [85.5000, 19.6000]
                ]
            ]
        }
        mmi = 7.5
        pga = 0.42

        if eq_file.exists():
            try:
                with open(eq_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    features = data.get("features", [])
                    if features:
                        geometry = features[0].get("geometry", geometry)
                        props = features[0].get("properties", {})
                        mmi = props.get("mmi", 7.5)
                        pga = props.get("pga_g", 0.42)
            except Exception:
                pass

        return HazardFootprintEvent(
            event_id="HZ-2026-SEISMIC-M68",
            hazard_type=HazardType.EARTHQUAKE,
            name="Bay of Bengal Deep Seismic Event M6.8",
            geometry=geometry,
            severity=SeverityLevel.HIGH,
            confidence=0.85,
            source="USGS_NDMA_SHAKEMAP",
            provenance=ProvenanceTag.SIMULATED,
            observed_at=datetime(2026, 10, 31, 1, 15, tzinfo=timezone.utc),
            valid_from=datetime(2026, 10, 31, 1, 0, tzinfo=timezone.utc),
            valid_to=datetime(2026, 11, 2, 23, 59, tzinfo=timezone.utc),
            attributes={
                "magnitude": 6.8,
                "depth_km": 28.5,
                "peak_ground_acceleration_g": pga,
                "modified_mercalli_intensity": mmi,
                "structural_collapse_risk": "HIGH",
            }
        )
