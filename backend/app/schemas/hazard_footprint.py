"""
SURAKSHA — Canonical HazardFootprintEvent Schema & Spatial Exposure Types
Unifies all hazard footprints (Cyclone, Wildfire, Flood, Earthquake, Tsunami)
into a common input schema for the Spatial Intersection & Exposure Engine.
"""
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class HazardType(str, Enum):
    CYCLONE = "CYCLONE"
    WILDFIRE = "WILDFIRE"
    FLOOD = "FLOOD"
    EARTHQUAKE = "EARTHQUAKE"
    TSUNAMI = "TSUNAMI"


class SeverityLevel(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MODERATE = "MODERATE"
    LOW = "LOW"


class ProvenanceTag(str, Enum):
    OFFICIAL_FORECAST = "OFFICIAL_FORECAST"
    OBSERVED = "OBSERVED"
    MODEL_ESTIMATE = "MODEL_ESTIMATE"
    REPLAY = "REPLAY"
    SIMULATED = "SIMULATED"
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA"


class OperationStatus(str, Enum):
    ASSIGNED = "ASSIGNED"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    MOBILIZED = "MOBILIZED"
    ON_SCENE = "ON_SCENE"
    COMPLETED = "COMPLETED"


class HazardFootprintEvent(BaseModel):
    """
    The canonical data contract that every hazard adapter must produce
    before passing into the Spatial Intersection & Exposure Engine.
    """
    event_id: str = Field(..., description="Unique event identifier, e.g. HZ-2019-FANI-01")
    hazard_type: HazardType = Field(..., description="Type of hazard")
    name: str = Field(..., description="Human-readable event name")
    geometry: Dict[str, Any] = Field(..., description="GeoJSON Geometry (Polygon, MultiPolygon, or Point)")
    severity: SeverityLevel = Field(default=SeverityLevel.HIGH, description="Normalized severity level")
    confidence: float = Field(default=0.85, ge=0.0, le=1.0, description="Confidence score between 0.0 and 1.0")
    source: str = Field(default="OFFICIAL", description="Data authority source (e.g. IMD, FIRMS, CWC)")
    provenance: ProvenanceTag = Field(default=ProvenanceTag.REPLAY, description="Audit-ready provenance category")
    observed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    valid_from: Optional[datetime] = None
    valid_to: Optional[datetime] = None
    attributes: Dict[str, Any] = Field(default_factory=dict, description="Hazard-specific domain attributes")


class BlockExposureResult(BaseModel):
    """Prioritized operational impact for an administrative block."""
    area_code: str
    block_name: str
    district: str
    priority_score: float = Field(..., ge=0.0, le=100.0)
    risk_tier: str = Field(..., description="CRITICAL, HIGH, MODERATE, LOW")
    reasons: List[str] = Field(default_factory=list)
    population_exposed: int = 0
    is_intersecting: bool = False
    distance_km: float = 0.0


class AssetExposureResult(BaseModel):
    """Critical civil & defense installation exposure assessment."""
    asset_id: str
    name: str
    asset_type: str
    district: str
    criticality: str
    status: str
    exposure_level: str = Field(..., description="DIRECT_IMPACT, PERIPHERAL, SECURE")
    distance_km: float = 0.0


class RouteExposureResult(BaseModel):
    """Transportation link and arterial evacuation route status."""
    route_id: str
    name: str
    route_type: str
    status: str = Field(..., description="PASSABLE, AT_RISK, CUT, UNKNOWN")
    cutoff_percentage: float = 0.0


class HazardExposureReport(BaseModel):
    """
    Unified multi-hazard output report produced by the Spatial Exposure Engine.
    Serves as the single authoritative payload for Government and Response Portals.
    """
    event_id: str
    hazard_type: HazardType
    name: str
    severity: SeverityLevel
    provenance: ProvenanceTag
    ranked_blocks: List[BlockExposureResult]
    exposed_assets: List[AssetExposureResult]
    evaluated_routes: List[RouteExposureResult]
    safe_staging_hubs: List[str]
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class OperationTaskCreate(BaseModel):
    """Task creation request authorized by Government Portal."""
    hazard_event_id: str
    title: str
    priority: str = "CRITICAL"
    location: str
    assigned_unit: str = "NDRF Unit 03"
    instructions: Optional[str] = "Verify shelter accessibility and assist evacuation coordination."


class OperationTaskUpdate(BaseModel):
    """Field update submitted by Response Portal."""
    status: OperationStatus
    field_note: Optional[str] = None
    reported_road_blocked: Optional[bool] = None
    flood_depth_meters: Optional[float] = None
