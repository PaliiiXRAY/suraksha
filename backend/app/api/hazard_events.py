"""
SURAKSHA — Hazard Event API Router
Implements:
- Hazard Event CRUD operations scoped strictly to the authenticated user's organization
- State Machine transition enforcement (MONITORING -> WARNING -> EVAC_ORDERED -> DEPLOYED -> RESOLVED / STAND_DOWN)
- Deterministic freshness interlocks gate for EVAC_ORDERED
- Transactional append-only audit logging into hazard_event_logs
"""
import re
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from backend.app.core.auth import get_current_user
from backend.app.core.errors import (
    bad_request_error,
    conflict_error,
    forbidden_error,
    not_found_error,
    validation_error,
)
from backend.app.db.session import get_db
from backend.app.models.cyclone import HazardEvent, HazardEventLog
from backend.app.models.user import User
from backend.app.schemas.cyclone import (
    HazardEventCreate,
    HazardEventLogResponse,
    HazardEventResponse,
    HazardEventStatusUpdate,
    HazardEventUpdate,
)
from backend.app.services.cyclone.interlocks import evaluate_source_freshness
from backend.app.services.cyclone.state_machine import (
    CycloneStateError,
    CycloneStatus,
    normalize_status,
    validate_transition,
)

router = APIRouter(prefix="/hazard-events", tags=["Hazard Events"])

# Roles permitted to create and modify hazard events
ALLOWED_WRITE_ROLES = {"authority", "analyst", "admin"}
# Roles permitted to transition event lifecycle status
ALLOWED_STATUS_TRANSITION_ROLES = {"authority", "admin"}


def _slugify(text: str) -> str:
    """Create a URL-safe lowercase slug from text."""
    slug = re.sub(r"[^\w\s-]", "", text).strip().lower()
    return re.sub(r"[-\s]+", "-", slug)


def _check_org_access(user: User, event: Optional[HazardEvent] = None) -> int:
    """
    Enforce tenant isolation.
    Returns user's org_id if valid; raises HTTP 403 if user lacks org or attempts cross-org access.
    """
    if user.org_id is None:
        raise forbidden_error(
            "Access forbidden: User is not assigned to any organization",
            code="FORBIDDEN_NO_ORG",
        )
    if event is not None and event.org_id != user.org_id:
        raise forbidden_error(
            f"Access forbidden: Hazard event '{event.id}' belongs to another organization",
            code="FORBIDDEN_CROSS_ORG",
        )
    return user.org_id


@router.post("", response_model=HazardEventResponse, status_code=status.HTTP_201_CREATED)
def create_hazard_event(
    req: HazardEventCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Register a new hazard event scoped to the current user's organization.
    Requires role: authority, analyst, or admin.
    """
    user_role = (current_user.role or "").lower()
    if user_role not in ALLOWED_WRITE_ROLES:
        raise forbidden_error(
            f"Role '{current_user.role}' is not authorized to create hazard events",
            code="FORBIDDEN",
        )

    org_id = _check_org_access(current_user)

    # Validate initial status
    try:
        init_status = normalize_status(req.status)
    except CycloneStateError as exc:
        raise bad_request_error(str(exc), code="INVALID_STATUS")

    event_id = req.id.strip() if req.id else f"{_slugify(req.name)}-{uuid.uuid4().hex[:6]}"
    existing = db.query(HazardEvent).filter(HazardEvent.id == event_id).first()
    if existing:
        raise conflict_error(f"Hazard event with ID '{event_id}' already exists", code="CONFLICT")

    event = HazardEvent(
        id=event_id,
        name=req.name.strip(),
        hazard_type=req.hazard_type.strip(),
        category=req.category.strip(),
        status=init_status.value,
        provenance_tag=req.provenance_tag.strip(),
        source_name=req.source_name.strip(),
        source_published_at=req.source_published_at,
        source_timestamp=req.source_timestamp,
        data_freshness=req.data_freshness.strip(),
        max_wind_kmh=req.max_wind_kmh,
        forward_speed_kmh=req.forward_speed_kmh,
        target_landfall=req.target_landfall.strip() if req.target_landfall else None,
        org_id=org_id,
    )
    db.add(event)

    # Initial creation audit log
    init_log = HazardEventLog(
        hazard_event_id=event.id,
        old_status=None,
        new_status=event.status,
        action="EVENT_CREATED",
        changed_by=current_user.email or current_user.id,
        note=f"Initial registration by {current_user.role}",
        interlock_flags=[],
    )
    db.add(init_log)
    db.commit()
    db.refresh(event)

    return event


@router.get("", response_model=List[HazardEventResponse])
def list_hazard_events(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List all hazard events belonging to the authenticated user's organization.
    Filtered at the database query level to ensure tenant isolation.
    """
    org_id = _check_org_access(current_user)
    events = (
        db.query(HazardEvent)
        .filter(HazardEvent.org_id == org_id)
        .order_by(HazardEvent.created_at.desc())
        .all()
    )
    return events


@router.get("/{event_id}", response_model=HazardEventResponse)
def get_hazard_event(
    event_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve details for a single hazard event within the user's organization.
    Returns HTTP 403 on cross-organization access.
    """
    event = db.query(HazardEvent).filter(HazardEvent.id == event_id.strip()).first()
    if not event:
        raise not_found_error(f"Hazard event '{event_id}' not found", code="NOT_FOUND")

    _check_org_access(current_user, event)
    return event


@router.patch("/{event_id}", response_model=HazardEventResponse)
def update_hazard_event(
    event_id: str,
    req: HazardEventUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update permitted operational attributes of a hazard event.
    Requires role: authority, analyst, or admin.
    Updating source telemetry (source_timestamp, source_published_at) requires authority or admin,
    enforces timezone-awareness, prevents future/regressive timestamps, and records an audit log.
    """
    user_role = (current_user.role or "").lower()
    if user_role not in ALLOWED_WRITE_ROLES:
        raise forbidden_error(
            f"Role '{current_user.role}' is not authorized to update hazard events",
            code="FORBIDDEN",
        )

    event = db.query(HazardEvent).filter(HazardEvent.id == event_id.strip()).first()
    if not event:
        raise not_found_error(f"Hazard event '{event_id}' not found", code="NOT_FOUND")

    _check_org_access(current_user, event)

    # Telemetry timestamp modification security boundary
    is_telemetry_update = req.source_timestamp is not None or req.source_published_at is not None
    if is_telemetry_update:
        if user_role not in ALLOWED_STATUS_TRANSITION_ROLES:
            raise forbidden_error(
                f"Role '{current_user.role}' is not authorized to modify source telemetry timestamps",
                code="FORBIDDEN_TELEMETRY_UPDATE",
            )
        if req.source_timestamp is not None:
            ts = req.source_timestamp
            now_utc = datetime.now(timezone.utc)
            if ts.tzinfo is None or ts.tzinfo.utcoffset(ts) is None:
                raise validation_error(
                    "source_timestamp must be timezone-aware UTC",
                    code="INVALID_TIMESTAMP_NAIVE",
                )
            # Ensure UTC comparison
            ts_utc = ts.astimezone(timezone.utc)
            if ts_utc > now_utc:
                raise validation_error(
                    "source_timestamp cannot be future-dated",
                    code="FUTURE_SOURCE_TIMESTAMP",
                )
            if event.source_timestamp is not None:
                curr_ts_utc = (
                    event.source_timestamp
                    if event.source_timestamp.tzinfo is not None
                    else event.source_timestamp.replace(tzinfo=timezone.utc)
                )
                if ts_utc < curr_ts_utc:
                    raise validation_error(
                        "source_timestamp cannot regress to an earlier timestamp than current telemetry",
                        code="REGRESSIVE_SOURCE_TIMESTAMP",
                    )

    old_source_ts = event.source_timestamp

    if req.name is not None:
        event.name = req.name.strip()
    if req.category is not None:
        event.category = req.category.strip()
    if req.max_wind_kmh is not None:
        event.max_wind_kmh = req.max_wind_kmh
    if req.forward_speed_kmh is not None:
        event.forward_speed_kmh = req.forward_speed_kmh
    if req.target_landfall is not None:
        event.target_landfall = req.target_landfall.strip() if req.target_landfall else None
    if req.source_timestamp is not None:
        event.source_timestamp = req.source_timestamp
    if req.source_published_at is not None:
        event.source_published_at = req.source_published_at

    if is_telemetry_update:
        telemetry_log = HazardEventLog(
            hazard_event_id=event.id,
            old_status=event.status,
            new_status=event.status,
            action="SOURCE_TELEMETRY_UPDATED",
            changed_by=current_user.email or current_user.id,
            note=f"Source timestamp updated from {old_source_ts} to {event.source_timestamp}. Rationale: {req.note or 'Telemetry update'}",
            interlock_flags=[],
        )
        db.add(telemetry_log)

    db.commit()
    db.refresh(event)
    return event


@router.patch("/{event_id}/status", response_model=HazardEventResponse)
def transition_hazard_event_status(
    event_id: str,
    req: HazardEventStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Execute a validated lifecycle state transition on a hazard event.
    Enforces:
    - Organization scoping (cross-org -> 403)
    - Role check: authority or admin only (analyst -> 403)
    - Full State Machine valid transition graph (invalid -> 409)
    - EVAC_ORDERED interlock evaluation (stale/future data -> 409)
    - Reference-time trust boundary: always grounded in server-side UTC time
    - Atomic audit logging into hazard_event_logs
    """
    user_role = (current_user.role or "").lower()
    if user_role not in ALLOWED_STATUS_TRANSITION_ROLES:
        raise forbidden_error(
            f"Role '{current_user.role}' is not authorized to change hazard event status",
            code="FORBIDDEN",
        )

    event = db.query(HazardEvent).filter(HazardEvent.id == event_id.strip()).first()
    if not event:
        raise not_found_error(f"Hazard event '{event_id}' not found", code="NOT_FOUND")

    _check_org_access(current_user, event)

    # 1. Parse and normalize target status
    try:
        target_status = normalize_status(req.status)
    except CycloneStateError as exc:
        raise bad_request_error(str(exc), code="INVALID_STATUS")

    # 2. Check if transitioning to EVAC_ORDERED; evaluate freshness interlocks
    interlock_flags: List[str] = []
    if target_status == CycloneStatus.EVAC_ORDERED:
        # Reference-time trust boundary (ARCHITECTURE §4.2, §7):
        # Public clients must not be able to forge freshness by supplying an arbitrary reference_time.
        # Live status evaluation enforces server-side timezone-aware UTC clock.
        server_reference_time = datetime.now(timezone.utc)
        freshness = evaluate_source_freshness(
            source_timestamp=event.source_timestamp,
            reference_time=server_reference_time,
            max_age_hours=6.0,
        )
        interlock_flags = list(freshness.interlock_flags)

    # 3. Validate state machine transition
    try:
        validate_transition(event.status, target_status, interlock_flags=interlock_flags)
    except CycloneStateError as exc:
        raise conflict_error(
            str(exc),
            code="INVALID_STATUS_TRANSITION",
            details={"interlock_flags": interlock_flags},
        )

    # 4. Atomic transaction: update event status + write audit log
    old_status = event.status
    event.status = target_status.value

    audit_log = HazardEventLog(
        hazard_event_id=event.id,
        old_status=old_status,
        new_status=event.status,
        action=f"STATUS_CHANGE_{event.status}",
        changed_by=current_user.email or current_user.id,
        note=req.note.strip() if req.note else None,
        interlock_flags=interlock_flags,
    )
    db.add(audit_log)
    db.commit()
    db.refresh(event)

    return event


@router.get("/{event_id}/logs", response_model=List[HazardEventLogResponse])
def get_hazard_event_logs(
    event_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve the append-only audit trail of status transitions for a hazard event.
    Scoped strictly to the user's organization.
    """
    event = db.query(HazardEvent).filter(HazardEvent.id == event_id.strip()).first()
    if not event:
        raise not_found_error(f"Hazard event '{event_id}' not found", code="NOT_FOUND")

    _check_org_access(current_user, event)

    logs = (
        db.query(HazardEventLog)
        .filter(HazardEventLog.hazard_event_id == event.id)
        .order_by(HazardEventLog.changed_at.asc())
        .all()
    )
    return logs

