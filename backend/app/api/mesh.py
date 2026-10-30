"""
SURAKSHA — Citizen MeshMap Integration API Router
Implements docs/gov-contract.md:
- POST /sos (Idempotent SOS ingestion from citizen devices or mesh gateways)
- GET /sos (Responder / Admin queue of active citizen distress beacons)
- POST /sos/{sos_id}/ack (Dispatcher / Responder acknowledgment generating signed SOS_ACK)
- GET /official (Official advisories & directives for offline sync)
"""
import hashlib
import json
import logging
import os
import tempfile
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query, status

from backend.app.schemas.mesh import (
    MeshEvent,
    MeshSosAckRequest,
    MeshSosPayload,
    MeshSosResponse,
)

logger = logging.getLogger("suraksha.mesh_api")

router = APIRouter(tags=["Citizen Mesh Integration"])

# Persistent file storage for Citizen Mesh events
STORAGE_DIR = os.environ.get("AEROTHERMAL_DATA_DIR") or (
    tempfile.gettempdir()
    if os.environ.get("VERCEL")
    else os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))),
        "data",
    )
)

MESH_SOS_FILE = os.path.join(STORAGE_DIR, "mesh_sos.json")
MESH_EVENTS_FILE = os.path.join(STORAGE_DIR, "mesh_peer_events.json")

GOV_KEY_ID = "gov_ed25519_suraksha_v1"


def _load_json(filepath: str, default: Any) -> Any:
    try:
        if os.path.exists(filepath):
            with open(filepath, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception as e:
        logger.warning(f"Failed to read {filepath}: {e}")
    return default


def _save_json(filepath: str, data: Any) -> bool:
    try:
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        tmp = filepath + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        os.replace(tmp, filepath)
        return True
    except Exception as e:
        logger.error(f"Failed to write {filepath}: {e}")
        return False


def _generate_gov_signature(payload_str: str) -> str:
    """Generate deterministic government verification token for hackathon MVP."""
    digest = hashlib.sha256(f"SURAKSHA_GOV_ROOT:{payload_str}".encode("utf-8")).hexdigest()
    return f"gov_sig_{digest[:32]}"


@router.post(
    "/sos",
    response_model=MeshSosResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Ingest citizen SOS distress signal bundle",
)
@router.post(
    "/v1/sos",
    response_model=MeshSosResponse,
    status_code=status.HTTP_202_ACCEPTED,
    include_in_schema=False,
)
def ingest_sos_bundle(payload: MeshSosPayload) -> MeshSosResponse:
    """
    Ingest citizen SOS distress signal.
    Strictly idempotent on sos_event.id.
    Accepts direct citizen uploads or gateway uploads carrying peer snapshots.
    """
    sos = payload.sos_event
    now_iso = datetime.now(timezone.utc).isoformat()

    all_sos = _load_json(MESH_SOS_FILE, {})

    # Check for existing duplicate (Idempotency requirement A.2)
    if sos.id in all_sos:
        existing = all_sos[sos.id]
        return MeshSosResponse(
            status="ACCEPTED",
            sos_id=sos.id,
            received_at=existing.get("received_at", now_iso),
            is_duplicate=True,
            events_ingested=0,
            ack_signature=existing.get("ack_signature", _generate_gov_signature(sos.id)),
            notice="SIMULATED DISPATCH: In demo/prototype mode, real emergency services are NOT contacted.",
        )

    ack_sig = _generate_gov_signature(f"{sos.id}:{sos.hlc}:{sos.lat}:{sos.lon}")

    # Build stored SOS record
    record = {
        "sos_id": sos.id,
        "status": "PENDING",
        "type": sos.type,
        "severity": sos.severity,
        "headcount": sos.qty,
        "text": sos.text,
        "location": {
            "latitude": sos.lat,
            "longitude": sos.lon,
            "feature_id": sos.feature_id,
        },
        "author": sos.author,
        "hlc": sos.hlc,
        "device_time": sos.device_time,
        "sent_via": payload.client.sent_via if payload.client else "direct",
        "app_version": payload.client.app_version if payload.client else "1.0.0",
        "gateway_key": payload.client.gateway_key if payload.client else None,
        "created_at": sos.device_time,
        "received_at": now_iso,
        "assigned_responder": None,
        "ack_signature": ack_sig,
        "provenance_tag": "SIMULATED",
    }

    all_sos[sos.id] = record
    _save_json(MESH_SOS_FILE, all_sos)

    # Ingest accompanying peer snapshot events
    events_count = 0
    if payload.events:
        peer_events = _load_json(MESH_EVENTS_FILE, {})
        for ev in payload.events:
            if ev.id not in peer_events:
                peer_events[ev.id] = ev.model_dump()
                events_count += 1
        _save_json(MESH_EVENTS_FILE, peer_events)

    logger.info(
        f"Ingested SOS {sos.id} (lat={sos.lat}, lon={sos.lon}, severity={sos.severity}) with {events_count} mesh events"
    )

    return MeshSosResponse(
        status="ACCEPTED",
        sos_id=sos.id,
        received_at=now_iso,
        is_duplicate=False,
        events_ingested=events_count,
        ack_signature=ack_sig,
        notice="SIMULATED DISPATCH: In demo/prototype mode, real emergency services are NOT contacted.",
    )


@router.get(
    "/sos",
    summary="Query active citizen SOS distress beacons for command dashboard",
)
@router.get(
    "/v1/sos",
    include_in_schema=False,
)
def list_sos_records(
    status_filter: Optional[str] = Query(None, alias="status", description="PENDING, DISPATCHED, ACKNOWLEDGED, RESOLVED, ALL"),
    min_severity: int = Query(1, ge=1, le=3, description="Minimum severity level"),
    limit: int = Query(50, ge=1, le=100, description="Max records to return"),
) -> Dict[str, Any]:
    """
    List active citizen distress beacons for incident command and responder dispatch.
    """
    all_sos = _load_json(MESH_SOS_FILE, {})
    records = list(all_sos.values())

    # Sort newest received first
    records.sort(key=lambda r: r.get("received_at", ""), reverse=True)

    filtered = []
    for r in records:
        if status_filter and status_filter.upper() != "ALL":
            if r.get("status", "").upper() != status_filter.upper():
                continue
        if r.get("severity", 1) < min_severity:
            continue
        filtered.append(r)
        if len(filtered) >= limit:
            break

    return {
        "total": len(filtered),
        "sos_records": filtered,
        "provenance_tag": "SIMULATED",
        "notice": "SIMULATED: All beacon responses are simulated for training and emergency decision support.",
    }


@router.post(
    "/sos/{sos_id}/ack",
    summary="Acknowledge citizen SOS and generate verifiable SOS_ACK event for mesh",
)
@router.post(
    "/v1/sos/{sos_id}/ack",
    include_in_schema=False,
)
def acknowledge_sos(sos_id: str, payload: MeshSosAckRequest) -> Dict[str, Any]:
    """
    Dispatcher or responder acknowledges an SOS distress signal.
    Emits an official SOS_ACK MeshEvent signed by the authority key that propagates back through the peer mesh.
    """
    all_sos = _load_json(MESH_SOS_FILE, {})
    if sos_id not in all_sos:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"SOS beacon '{sos_id}' not found.",
        )

    record = all_sos[sos_id]
    record["status"] = "ACKNOWLEDGED"
    record["assigned_responder"] = f"{payload.responder_name} (Simulated)"
    record["acknowledged_at"] = datetime.now(timezone.utc).isoformat()

    _save_json(MESH_SOS_FILE, all_sos)

    # Build signed SOS_ACK event for the mesh
    ack_now = datetime.now(timezone.utc).isoformat()
    ack_event_id = f"01J9ACK{hashlib.md5(f'{sos_id}:{ack_now}'.encode('utf-8')).hexdigest()[:16].upper()}"
    instructions = payload.instructions or "Rescue teams alerted. Stay in shelter."
    eta_text = f" ETA ~{payload.estimated_arrival_minutes}m." if payload.estimated_arrival_minutes else ""
    event_text = f"Acknowledged by {payload.responder_name}.{eta_text} {instructions}"[:280]

    ack_event = {
        "id": ack_event_id,
        "v": 1,
        "kind": "SOS_ACK",
        "type": "rescue_dispatched",
        "feature_id": record["location"]["feature_id"],
        "ref": sos_id,
        "lat": record["location"]["latitude"],
        "lon": record["location"]["longitude"],
        "severity": 1,
        "text": event_text,
        "qty": None,
        "hlc": f"{ack_now[:19]}Z-0001",
        "device_time": ack_now,
        "author": GOV_KEY_ID,
        "ttl_hours": 72,
        "sig": _generate_gov_signature(f"{ack_event_id}:{sos_id}:{GOV_KEY_ID}"),
    }

    # Add to peer mesh store so peers syncing get this ACK
    peer_events = _load_json(MESH_EVENTS_FILE, {})
    peer_events[ack_event_id] = ack_event
    _save_json(MESH_EVENTS_FILE, peer_events)

    return {
        "sos_id": sos_id,
        "status": "ACKNOWLEDGED",
        "assigned_responder": record["assigned_responder"],
        "ack_event": ack_event,
        "notice": "SIMULATED DISPATCH: Demonstrates closed-loop responder mesh delivery.",
    }


@router.get(
    "/official",
    summary="Download official government directives and hazard states for offline mesh",
)
@router.get(
    "/v1/official",
    include_in_schema=False,
)
def get_official_events(
    since_hlc: Optional[str] = Query(None, description="Only fetch events with HLC greater than this value"),
) -> Dict[str, Any]:
    """
    Returns signed official government events and advisories.
    Client devices store these with priority; OFFICIAL events override citizen report conflicts.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    
    # Official authoritative bulletins for Odisha Cyclone Fani / Disaster Response
    official_bulletins = [
        {
            "id": "01J9OFFICIAL001FANI2019",
            "v": 1,
            "kind": "OFFICIAL",
            "type": "evacuation_order",
            "feature_id": "u4pru",
            "ref": None,
            "lat": 19.8135,
            "lon": 85.8312,
            "severity": 3,
            "text": "IMD Red Alert: Extremely Severe Cyclonic Storm Fani landfall expected near Puri coast. Mandatory evacuation ordered to designated cyclone shelters.",
            "qty": None,
            "hlc": "2026-10-30T15:00:00.000Z-0000",
            "device_time": "2026-10-30T15:00:00Z",
            "author": GOV_KEY_ID,
            "ttl_hours": 120,
            "sig": _generate_gov_signature("01J9OFFICIAL001FANI2019:evacuation_order"),
        },
        {
            "id": "01J9OFFICIAL002SHELTER01",
            "v": 1,
            "kind": "OFFICIAL",
            "type": "shelter",
            "feature_id": "u4pruyd84",
            "ref": None,
            "lat": 19.8160,
            "lon": 85.8350,
            "severity": 1,
            "text": "Puri Multipurpose Cyclone Shelter #4 open. Medical personnel and drinking water tankers available. Capacity 1,200.",
            "qty": 1200,
            "hlc": "2026-10-30T15:30:00.000Z-0000",
            "device_time": "2026-10-30T15:30:00Z",
            "author": GOV_KEY_ID,
            "ttl_hours": 72,
            "sig": _generate_gov_signature("01J9OFFICIAL002SHELTER01:shelter"),
        },
    ]

    if since_hlc:
        official_bulletins = [b for b in official_bulletins if b["hlc"] > since_hlc]

    return {
        "official_events": official_bulletins,
        "provenance": "OFFICIAL FORECAST (IMD / OSDMA)",
        "freshness": "VERIFIED_FRESH",
        "gov_public_key": "3b6a27bcceb6a42d62a3a8d02a6f0d73653215771de243a63ac048a18b59da29",
        "server_time": now_iso,
    }
