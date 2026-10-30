"""
SURAKSHA — Cyclone & Hazard Event Pydantic Schemas
Defines request and response schemas for Hazard Event CRUD, status transitions, and audit logs.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class HazardEventBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    hazard_type: str = Field(default="cyclone", max_length=32)
    category: str = Field(..., min_length=1, max_length=32)
    status: str = Field(default="MONITORING", max_length=32)
    provenance_tag: str = Field(default="HISTORICAL_REPLAY", max_length=32)
    source_name: str = Field(default="IMD", max_length=64)
    source_published_at: Optional[datetime] = None
    source_timestamp: datetime
    data_freshness: str = Field(default="VERIFIED_FRESH", max_length=32)
    max_wind_kmh: float = Field(..., ge=0.0)
    forward_speed_kmh: float = Field(..., ge=0.0)
    target_landfall: Optional[str] = Field(default=None, max_length=120)


class HazardEventCreate(HazardEventBase):
    id: Optional[str] = Field(default=None, max_length=64)


class HazardEventUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    category: Optional[str] = Field(default=None, min_length=1, max_length=32)
    max_wind_kmh: Optional[float] = Field(default=None, ge=0.0)
    forward_speed_kmh: Optional[float] = Field(default=None, ge=0.0)
    target_landfall: Optional[str] = Field(default=None, max_length=120)
    source_timestamp: Optional[datetime] = None
    source_published_at: Optional[datetime] = None
    note: Optional[str] = Field(default=None, max_length=255)


class HazardEventStatusUpdate(BaseModel):
    status: str = Field(..., min_length=1, max_length=32)
    note: Optional[str] = Field(default=None, max_length=255)
    reference_time: Optional[datetime] = None


class HazardEventLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    hazard_event_id: str
    old_status: Optional[str] = None
    new_status: str
    action: str
    changed_by: Optional[str] = None
    note: Optional[str] = None
    changed_at: datetime
    interlock_flags: Optional[List[str]] = None


class HazardEventResponse(HazardEventBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    org_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Decision API Schemas (M2 T4)
# ---------------------------------------------------------------------------

class FactorReasonSchema(BaseModel):
    factor: str
    weight: float
    contribution: float
    detail: str


class AreaRiskItemSchema(BaseModel):
    area_code: str
    area_name: str
    score: float
    rank: int
    reasons: List[FactorReasonSchema]
    interlock_flags: List[str] = Field(default_factory=list)
    provenance_tag: str = "MODEL_ESTIMATE"


class AreaRiskListResponse(BaseModel):
    event_id: str
    total: int
    items: List[AreaRiskItemSchema]


class AssetExposureItemSchema(BaseModel):
    asset_id: str
    name: str
    asset_type: str
    criticality: float
    latitude: float
    longitude: float
    distance_to_track_km: float
    inside_hazard_footprint: bool
    exposure_score: float
    status: str
    provenance_tag: str = "OBSERVED"


class AssetExposureListResponse(BaseModel):
    event_id: str
    total: int
    items: List[AssetExposureItemSchema]


class TrackPerturbationSchema(BaseModel):
    lat_offset: float = Field(default=0.0, ge=-5.0, le=5.0, description="Latitude shift in degrees [-5, 5]")
    lon_offset: float = Field(default=0.0, ge=-5.0, le=5.0, description="Longitude shift in degrees [-5, 5]")


class WhatIfRequest(BaseModel):
    event_id: str = Field(..., min_length=1, description="Source hazard event ID")
    track_perturbation: TrackPerturbationSchema = Field(
        default_factory=TrackPerturbationSchema,
        description="Spatial perturbation to cyclone eye",
    )
    intensity_delta_pct: float = Field(
        default=0.0,
        ge=-50.0,
        le=50.0,
        description="Percentage intensity adjustment [-50%, +50%]",
    )


class WhatIfResponse(BaseModel):
    simulation_id: str
    is_simulated: bool = True
    provenance_tag: str = "SIMULATED"
    execution_time_ms: float
    hazard_summary: Dict[str, Any]
    top_areas: List[AreaRiskItemSchema]
    threatened_assets: List[AssetExposureItemSchema]
    route_statuses: List[Dict[str, Any]]
    staging_recommendation: Optional[Dict[str, Any]] = None
    interlock_flags: List[str] = Field(default_factory=list)


class BriefingResponse(BaseModel):
    lines: List[str]
    text: str
    line_count: int = 6
    provenance_tag: str = "MODEL_ESTIMATE"
    external_calls_made: int = 0
    is_simulated: bool = False

