"""
SURAKSHA — Cyclone & Multi-Hazard Domain SQLAlchemy ORM Models
Defines: Organization, HazardEvent, Area, AreaRisk, StrategicAsset, SupplyRoute, HazardEventLog
Additive models for the cyclone impact and decision-support workflow.
"""
from typing import Optional, List
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, ForeignKey, UniqueConstraint, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from geoalchemy2 import Geometry

from backend.app.db.base import Base


class Organization(Base):
    """
    Multi-tenant organization boundary.
    org_type: 'disaster_authority', 'security_agency', 'infrastructure_operator'
    """
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    name = Column(String(120), nullable=False, unique=True)
    org_type = Column(String(64), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    users = relationship("User", back_populates="organization")
    hazard_events = relationship("HazardEvent", back_populates="organization")


class HazardEvent(Base):
    """
    Hazard Event parent record (e.g. Cyclone Fani 2019).
    State machine: MONITORING -> WARNING -> EVAC_ORDERED -> DEPLOYED -> RESOLVED (+ STAND_DOWN)
    """
    __tablename__ = "hazard_events"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    hazard_type = Column(String(32), nullable=False, default="cyclone", server_default="cyclone", index=True)
    category = Column(String(32), nullable=False)  # e.g. ESCS, VSCS, CS
    status = Column(String(32), nullable=False, default="MONITORING", server_default="MONITORING", index=True)
    provenance_tag = Column(String(32), nullable=False, default="HISTORICAL_REPLAY", server_default="HISTORICAL_REPLAY")
    source_name = Column(String(64), nullable=False, default="IMD", server_default="IMD")
    source_published_at = Column(DateTime(timezone=True), nullable=True)
    source_timestamp = Column(DateTime(timezone=True), nullable=False)
    data_freshness = Column(String(32), nullable=False, default="VERIFIED_FRESH", server_default="VERIFIED_FRESH")
    max_wind_kmh = Column(Float, nullable=False)
    forward_speed_kmh = Column(Float, nullable=False)
    target_landfall = Column(String(120), nullable=True)
    track_geometry = Column(Geometry("LINESTRING", srid=4326, spatial_index=True), nullable=True)
    org_id = Column(Integer, ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    organization = relationship("Organization", back_populates="hazard_events")
    area_risks = relationship("AreaRisk", back_populates="hazard_event", cascade="all, delete-orphan")
    logs = relationship("HazardEventLog", back_populates="hazard_event", cascade="all, delete-orphan", order_by="HazardEventLog.changed_at.desc()")


class HazardEventLog(Base):
    """
    Append-only audit trail for hazard event lifecycle and state transitions.
    """
    __tablename__ = "hazard_event_logs"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    hazard_event_id = Column(String(64), ForeignKey("hazard_events.id", ondelete="CASCADE"), nullable=False, index=True)
    old_status = Column(String(32), nullable=True)
    new_status = Column(String(32), nullable=False)
    action = Column(String(64), nullable=False)
    changed_by = Column(String(120), nullable=True)
    note = Column(String(255), nullable=True)
    changed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    interlock_flags = Column(JSONB, nullable=True, default=list, server_default="[]")
    metadata_ = Column("metadata", JSONB, nullable=True)

    hazard_event = relationship("HazardEvent", back_populates="logs")


class Area(Base):
    """
    Odisha Administrative Block geometry and demographic baseline.
    """
    __tablename__ = "areas"

    area_code = Column(String(32), primary_key=True, index=True)  # e.g. OD_PUR_01
    block_name = Column(String(120), nullable=False, index=True)
    district = Column(String(64), nullable=False, index=True)
    lgd_code = Column(String(32), nullable=True)
    geom = Column(Geometry("MULTIPOLYGON", srid=4326, spatial_index=True), nullable=False)
    total_population = Column(Integer, nullable=False, default=0, server_default="0")
    vulnerable_population = Column(Integer, nullable=False, default=0, server_default="0")
    elevation_m = Column(Float, nullable=False, default=10.0, server_default="10.0")
    is_coastal = Column(Boolean, nullable=False, default=False, server_default="false")
    flood_susceptibility = Column(Float, nullable=False, default=0.0, server_default="0.0")

    area_risks = relationship("AreaRisk", back_populates="area", cascade="all, delete-orphan")


class AreaRisk(Base):
    """
    Calculated 6-factor risk prioritization score per area per event.
    Score is a transparent priority score (0-100), not a probability.
    """
    __tablename__ = "area_risk"

    id = Column(String(64), primary_key=True, index=True)
    event_id = Column(String(64), ForeignKey("hazard_events.id", ondelete="CASCADE"), nullable=False, index=True)
    area_code = Column(String(32), ForeignKey("areas.area_code", ondelete="CASCADE"), nullable=False, index=True)
    score = Column(Float, nullable=False)
    rank = Column(Integer, nullable=False)
    reasons = Column(JSONB, nullable=False, default=list, server_default="[]")
    interlock_flags = Column(JSONB, nullable=False, default=list, server_default="[]")
    provenance_tag = Column(String(32), nullable=False, default="MODEL_ESTIMATE", server_default="MODEL_ESTIMATE")
    calculated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    hazard_event = relationship("HazardEvent", back_populates="area_risks")
    area = relationship("Area", back_populates="area_risks")

    __table_args__ = (
        UniqueConstraint("event_id", "area_code", name="uq_area_risk_event_area"),
        Index("ix_area_risk_event_score", "event_id", "score"),
    )


class StrategicAsset(Base):
    """
    Critical civil and defense infrastructure (hospitals, shelters, relief depots, ports, helipads).
    """
    __tablename__ = "strategic_assets"

    id = Column(String(64), primary_key=True, index=True)  # e.g. ast_pur_dhh_01
    name = Column(String(120), nullable=False)
    asset_type = Column(String(64), nullable=False, index=True)  # hospital, shelter, relief_depot, port
    category = Column(String(64), nullable=True, default="CIVIL", server_default="CIVIL")
    criticality = Column(Float, nullable=False, default=1.0, server_default="1.0")
    geom = Column(Geometry("POINT", srid=4326, spatial_index=True), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    district = Column(String(64), nullable=False, index=True)
    block_name = Column(String(120), nullable=True)
    capacity = Column(String(120), nullable=True)
    contact_channel = Column(String(120), nullable=True)
    readiness = Column(Float, nullable=True, default=1.0, server_default="1.0")
    provenance_tag = Column(String(32), nullable=False, default="OBSERVED", server_default="OBSERVED")


class SupplyRoute(Base):
    """
    Arterial supply and evacuation road network (NH-16, NH-316, state highways).
    """
    __tablename__ = "supply_routes"

    id = Column(String(64), primary_key=True, index=True)  # e.g. osm_rt_nh316_puri_bbsr
    osm_id = Column(String(64), nullable=True)
    name = Column(String(120), nullable=False)
    route_type = Column(String(64), nullable=False, default="PRIMARY", server_default="PRIMARY", index=True)
    geom = Column(Geometry("LINESTRING", srid=4326, spatial_index=True), nullable=False)
    surface = Column(String(32), nullable=True, default="paved", server_default="paved")
    bridge_count = Column(Integer, nullable=True, default=0, server_default="0")
    districts = Column(String(120), nullable=True)
    lanes = Column(Integer, nullable=True, default=2, server_default="2")
    length_km = Column(Float, nullable=True)
    baseline_status = Column(String(32), nullable=False, default="PASSABLE_WITH_EVIDENCE", server_default="PASSABLE_WITH_EVIDENCE")
