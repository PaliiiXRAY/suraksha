"""
SURAKSHA — Citizen MeshMap Contract Schemas (Pydantic v2)
Implements data contracts for:
- Peer-to-peer Event records (kind=SOS, HAZARD, RESOURCE, OFFICIAL, SOS_ACK)
- SOS Bundle uploads from direct citizen devices or gateway relay phones
- Official emergency directives & responder acknowledgments
"""
from typing import List, Optional, Literal
from pydantic import BaseModel, Field, field_validator


class MeshEvent(BaseModel):
    """
    Standard immutable signed mesh event.
    Must match docs/gov-contract.md §2.2.
    """
    id: str = Field(..., min_length=10, max_length=64, description="ULID or unique event ID")
    v: int = Field(1, description="Schema version")
    kind: str = Field(..., description="SOS, HAZARD, RESOURCE, RESOLVE, CONFIRM, DISPUTE, CLOSE, OFFICIAL, SOS_ACK")
    type: str = Field(..., max_length=64, description="Specific hazard, resource or emergency type")
    feature_id: str = Field(..., max_length=64, description="Geohash or target feature ID")
    ref: Optional[str] = Field(None, max_length=64, description="Referenced Event ID if resolving/confirming")
    lat: float = Field(..., ge=-90.0, le=90.0, description="WGS84 Latitude")
    lon: float = Field(..., ge=-180.0, le=180.0, description="WGS84 Longitude")
    severity: int = Field(..., ge=1, le=3, description="1 (Low), 2 (Medium), 3 (Critical/Life-Threat)")
    text: str = Field(..., max_length=280, description="Description note")
    qty: Optional[int] = Field(None, ge=0, le=100000, description="Optional headcount or capacity")
    hlc: str = Field(..., max_length=64, description="Hybrid Logical Clock timestamp string")
    device_time: str = Field(..., max_length=64, description="ISO 8601 UTC creation time")
    author: str = Field(..., min_length=16, max_length=128, description="Author Ed25519 public key")
    ttl_hours: int = Field(72, ge=1, le=720, description="Cache Time-To-Live in hours")
    sig: str = Field(..., min_length=16, max_length=256, description="Ed25519 signature over canonical payload")

    @field_validator("kind")
    @classmethod
    def validate_kind(cls, v: str) -> str:
        valid_kinds = {
            "SOS", "SOS_ACK", "HAZARD", "RESOURCE",
            "RESOLVE", "CONFIRM", "DISPUTE", "CLOSE", "OFFICIAL"
        }
        upper_v = v.strip().upper()
        if upper_v not in valid_kinds:
            raise ValueError(f"Invalid event kind '{v}'. Must be one of {valid_kinds}")
        return upper_v


class MeshClientInfo(BaseModel):
    """Metadata regarding client device and relay transport."""
    app_version: str = Field("1.0.0", max_length=32)
    sent_via: Literal["direct", "gateway", "sms", "mesh_relay"] = "direct"
    gateway_key: Optional[str] = Field(None, max_length=128)


class MeshSosPayload(BaseModel):
    """
    POST /v1/sos request bundle.
    Contains the distress SOS event, a snapshot of local peer events, and optional encrypted private data.
    """
    sos_event: MeshEvent
    events: List[MeshEvent] = Field(default_factory=list, description="Recent peer events snapshot")
    private: Optional[str] = Field("", max_length=4096, description="Encrypted private health/contact data")
    client: Optional[MeshClientInfo] = Field(default_factory=MeshClientInfo)


class MeshSosResponse(BaseModel):
    """202 Accepted response upon receiving an SOS bundle."""
    status: str = "ACCEPTED"
    sos_id: str
    received_at: str
    is_duplicate: bool = False
    events_ingested: int = 0
    ack_signature: str
    notice: str = "SIMULATED DISPATCH: In demo/prototype mode, real emergency services are NOT contacted."


class MeshSosAckRequest(BaseModel):
    """Official responder acknowledgment request."""
    responder_name: str = Field(..., min_length=2, max_length=120)
    estimated_arrival_minutes: Optional[int] = Field(None, ge=1, le=1440)
    instructions: Optional[str] = Field("Stay in shelter. Responders alerted.", max_length=280)


class MeshSosRecord(BaseModel):
    """Structured record of citizen SOS stored on server."""
    sos_id: str
    status: Literal["PENDING", "DISPATCHED", "ACKNOWLEDGED", "RESOLVED"] = "PENDING"
    type: str
    severity: int
    headcount: Optional[int] = None
    text: str
    location: dict
    sent_via: str = "direct"
    author: str
    created_at: str
    received_at: str
    assigned_responder: Optional[str] = None
    provenance_tag: str = "SIMULATED"
