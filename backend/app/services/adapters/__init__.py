"""SURAKSHA Specialized Hazard Adapters Package."""
from backend.app.services.adapters.registry import (
    get_hazard_footprint,
    list_available_scenarios,
)

__all__ = ["get_hazard_footprint", "list_available_scenarios"]
