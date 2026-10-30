"""
SURAKSHA — Unified Multi-Hazard Intelligence & Response API
Provides:
1. Specialized satellite scenario feeds (Cyclone, Wildfire, Flood, Earthquake).
2. Universal Spatial Exposure Engine evaluation (blocks, assets, routes, reasons[]).
3. Government-to-Response command loop (task authorization, status updates, field reporting).
"""
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query, status

from backend.app.schemas.hazard_footprint import (
    HazardFootprintEvent,
    HazardType,
    HazardExposureReport,
    OperationTaskCreate,
    OperationTaskUpdate,
    OperationStatus,
)
from backend.app.services.adapters import (
    get_hazard_footprint,
    list_available_scenarios,
)
from backend.app.services.risk.universal_exposure_engine import UniversalExposureEngine

router = APIRouter(tags=["Multi-Hazard Intelligence & Response"])

# In-memory thread-safe Operational Task Store for the Government -> Response loop
OPERATIONAL_TASKS: List[Dict[str, Any]] = [
    {
        "id": "TASK-OD-9041",
        "hazard_event_id": "HZ-2019-FANI-CYCLONE",
        "title": "Stage NDRF Unit 03 to Brahmagiri Cyclone Shelter",
        "priority": "CRITICAL",
        "location": "Brahmagiri Block, Puri District",
        "assigned_unit": "NDRF Unit 03 (Bhubaneswar)",
        "instructions": "Verify shelter accessibility, pre-position high-capacity dewatering pumps, and coordinate coastal evacuation.",
        "status": "ASSIGNED",
        "field_reports": [
            {
                "timestamp": "2026-10-31T01:30:00Z",
                "reporter": "Authority Command",
                "note": "Operation authorized based on 6-factor risk score (92.0) and storm surge exposure.",
            }
        ],
        "created_at": "2026-10-31T01:30:00Z",
        "updated_at": "2026-10-31T01:30:00Z",
    },
    {
        "id": "TASK-OD-9042",
        "hazard_event_id": "HZ-2020-MAHANADI-FLOOD",
        "title": "Deploy ODRAF Inflatable Rescue Boats to Kujang Delta",
        "priority": "HIGH",
        "location": "Kujang Block, Jagatsinghpur",
        "assigned_unit": "ODRAF Team 02",
        "instructions": "Monitor river embankment stability and establish water purification staging at Community Health Centre.",
        "status": "ACKNOWLEDGED",
        "field_reports": [
            {
                "timestamp": "2026-10-31T02:00:00Z",
                "reporter": "ODRAF Lead",
                "note": "Team acknowledged task; mobilizing 4 Zodiac inflatable craft.",
            }
        ],
        "created_at": "2026-10-31T02:00:00Z",
        "updated_at": "2026-10-31T02:05:00Z",
    }
]


@router.get("/hazards/scenarios", summary="List Available Multi-Hazard Scenarios")
def get_scenarios() -> List[Dict[str, Any]]:
    """Returns the 4 pre-packaged satellite hazard telemetry scenarios."""
    return list_available_scenarios()


@router.get("/hazards/scenarios/{hazard_type}", summary="Get Raw Hazard Footprint Event")
def get_scenario_footprint(hazard_type: str) -> HazardFootprintEvent:
    """Returns the canonical HazardFootprintEvent contract for a specific hazard."""
    try:
        ht = HazardType(hazard_type.upper())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid hazard type '{hazard_type}'. Available: {[h.value for h in HazardType]}",
        )
    return get_hazard_footprint(ht)


@router.post("/hazards/evaluate", summary="Run Universal Spatial Exposure Engine")
def evaluate_hazard(
    event: Optional[HazardFootprintEvent] = None,
    hazard_type: Optional[str] = Query(None, description="Pre-packaged hazard scenario preset (CYCLONE, WILDFIRE, FLOOD, EARTHQUAKE)"),
) -> HazardExposureReport:
    """
    Evaluates any HazardFootprintEvent against the spatial intelligence engine.
    Calculates block prioritization (0-100 score + reasons[]), asset exposure,
    supply route cutoffs, and safe staging recommendations.
    """
    if event is None:
        if not hazard_type:
            ht = HazardType.CYCLONE
        else:
            try:
                ht = HazardType(hazard_type.upper())
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid hazard type '{hazard_type}'. Available: {[h.value for h in HazardType]}",
                )
        event = get_hazard_footprint(ht)

    return UniversalExposureEngine.evaluate(event)


@router.get("/hazards/operations", summary="List Active Authorized Response Operations")
def get_operations(status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
    """Returns all authorized operations for the Response Portal."""
    if status_filter:
        return [t for t in OPERATIONAL_TASKS if t["status"].upper() == status_filter.upper()]
    return OPERATIONAL_TASKS


@router.post("/hazards/operations/authorize", status_code=status.HTTP_201_CREATED, summary="Government Portal Authorizes Operation")
def authorize_operation(task_in: OperationTaskCreate) -> Dict[str, Any]:
    """
    Command & Decision Layer: Government official authorizes a response operation
    based on spatial risk intelligence. Handoffs task to the Response Portal.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    new_task = {
        "id": f"TASK-OD-{len(OPERATIONAL_TASKS) + 9041}",
        "hazard_event_id": task_in.hazard_event_id,
        "title": task_in.title,
        "priority": task_in.priority.upper(),
        "location": task_in.location,
        "assigned_unit": task_in.assigned_unit,
        "instructions": task_in.instructions or "Execute field deployment and verify infrastructure access.",
        "status": "ASSIGNED",
        "field_reports": [
            {
                "timestamp": now_iso,
                "reporter": "Authority Command",
                "note": "Operation authorized via Government Portal.",
            }
        ],
        "created_at": now_iso,
        "updated_at": now_iso,
    }
    OPERATIONAL_TASKS.insert(0, new_task)
    return new_task


@router.patch("/hazards/operations/{task_id}/status", summary="Response Portal Updates Mission Status & Ground Reports")
def update_operation_status(task_id: str, update_in: OperationTaskUpdate) -> Dict[str, Any]:
    """
    Field Execution Layer: Responders update mission lifecycle (ASSIGNED -> ACKNOWLEDGED
    -> MOBILIZED -> ON_SCENE -> COMPLETED) and submit ground observation feedback.
    """
    target = None
    for task in OPERATIONAL_TASKS:
        if task["id"] == task_id:
            target = task
            break

    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Operational task '{task_id}' not found.",
        )

    now_iso = datetime.now(timezone.utc).isoformat()
    target["status"] = update_in.status.value
    target["updated_at"] = now_iso

    report_entry: Dict[str, Any] = {
        "timestamp": now_iso,
        "reporter": target["assigned_unit"],
        "status_change": update_in.status.value,
    }
    if update_in.field_note:
        report_entry["note"] = update_in.field_note
    if update_in.reported_road_blocked is not None:
        report_entry["road_blocked"] = update_in.reported_road_blocked
    if update_in.flood_depth_meters is not None:
        report_entry["flood_depth_m"] = update_in.flood_depth_meters

    target["field_reports"].append(report_entry)
    return target
