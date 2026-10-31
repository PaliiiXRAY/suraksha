"""
SURAKSHA — Universal Hazard Adapter Registry
Coordinates the specialized satellite adapters and normalizes into
standardized HazardFootprintEvent envelopes.
"""
from pathlib import Path
from typing import Dict, List, Type, Any

from backend.app.schemas.hazard_footprint import (
    HazardFootprintEvent,
    HazardType,
)
from backend.app.services.adapters.cyclone_adapter import CycloneAdapter
from backend.app.services.adapters.wildfire_adapter import WildfireAdapter
from backend.app.services.adapters.flood_adapter import FloodAdapter
from backend.app.services.adapters.earthquake_adapter import EarthquakeAdapter

ADAPTER_MAP: Dict[HazardType, Any] = {
    HazardType.CYCLONE: CycloneAdapter,
    HazardType.WILDFIRE: WildfireAdapter,
    HazardType.FLOOD: FloodAdapter,
    HazardType.EARTHQUAKE: EarthquakeAdapter,
}


def get_hazard_footprint(hazard_type: HazardType, data_dir: Path = None) -> HazardFootprintEvent:
    """Fetch the canonical HazardFootprintEvent for a specific hazard type."""
    adapter = ADAPTER_MAP.get(hazard_type)
    if not adapter:
        # Fallback to cyclone
        return CycloneAdapter.get_footprint(data_dir=data_dir)
    return adapter.get_footprint(data_dir=data_dir)


def list_available_scenarios(data_dir: Path = None) -> List[Dict[str, Any]]:
    """List metadata for all 4 pre-packaged satellite scenarios."""
    scenarios = []
    for h_type, adapter in ADAPTER_MAP.items():
        event = adapter.get_footprint(data_dir=data_dir)
        scenarios.append({
            "hazard_type": h_type.value,
            "event_id": event.event_id,
            "name": event.name,
            "severity": event.severity.value,
            "provenance": event.provenance.value,
            "source": event.source,
            "observed_at": event.observed_at.isoformat(),
            "attributes": event.attributes,
        })
    return scenarios
