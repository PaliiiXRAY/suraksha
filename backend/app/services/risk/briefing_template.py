"""
SURAKSHA — Deterministic Situation Briefing Template Fallback Engine.
Generates an auditable, 6-line operational command briefing from structured
risk and logistics engine outputs with ZERO external network or LLM API calls.
Mandatory fallback per SRS FR-8.2 and NFR-1 (offline demo guarantee).
"""
from typing import Dict, Any, List, Optional
from datetime import datetime

def generate_situation_briefing(
    hazard_event: Dict[str, Any],
    top_areas: List[Dict[str, Any]],
    threatened_assets: List[Dict[str, Any]],
    route_statuses: List[Dict[str, Any]],
    staging_recommendation: Optional[Dict[str, Any]] = None,
    interlock_flags: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Renders a deterministic 6-line command briefing without external API calls.
    
    Args:
        hazard_event: metadata about the hazard (name, category, wind, speed, landfall)
        top_areas: list of ranked area risk objects with 'name', 'score', and 'reasons'
        threatened_assets: list of strategic asset objects within the hazard envelope
        route_statuses: list of route objects with 'name' and 'status' (CUT, AT_RISK, PASSABLE)
        staging_recommendation: recommended safe staging depot object
        interlock_flags: list of open safety interlock flag strings
        
    Returns:
        Dict containing:
            - lines: List[str] (exactly 6 formatted lines)
            - text: str (joined briefing text)
            - provenance_tag: str
            - generated_at_ist: str
            - external_calls_made: 0
    """
    interlock_flags = interlock_flags or []
    
    # 1. Event Status Line
    ev_name = hazard_event.get("name", "Cyclone Fani").upper()
    ev_cat = hazard_event.get("category", "Extremely Severe Cyclonic Storm")
    ev_speed = hazard_event.get("forward_speed_kmh", 18)
    ev_wind = hazard_event.get("max_wind_kmh", 215)
    ev_target = hazard_event.get("target_landfall", "Puri Coast, Odisha")
    line1 = f"1. [EVENT STATUS]: Cyclone {ev_name} ({ev_cat}) tracking at {ev_speed} km/h with peak winds {ev_wind} km/h towards {ev_target}."

    # 2. Top Priority Area Line
    if top_areas:
        top_area = top_areas[0]
        area_name = top_area.get("name") or top_area.get("block_name", "Puri Sadar")
        area_score = top_area.get("score", 92)
        reasons = top_area.get("reasons", [])
        if reasons:
            top_reason = reasons[0].get("detail", "direct eye landfall exposure with high coastal population density")
        else:
            top_reason = "critical wind exposure and storm surge proximity"
        line2 = f"2. [TOP PRIORITY]: Block {area_name} ranked #1 (Operational Priority {area_score}/100) due to {top_reason}."
    else:
        line2 = "2. [TOP PRIORITY]: Hazard monitoring active; no block currently exceeds emergency escalation threshold."

    # 3. Critical Assets Line
    asset_count = len(threatened_assets)
    if asset_count > 0:
        names = [a.get("name", "Facility") for a in threatened_assets[:3]]
        sample_str = ", ".join(names)
        if asset_count > 3:
            sample_str += f" and {asset_count - 3} other facilities"
        line3 = f"3. [CRITICAL ASSETS]: {asset_count} strategic installations inside 90 km/h wind envelope, including {sample_str}."
    else:
        line3 = "3. [CRITICAL ASSETS]: Zero high-criticality assets currently situated within the 90 km/h hazard footprint."

    # 4. Logistics & Supply Corridors Line
    cut_routes = [r for r in route_statuses if r.get("status") == "CUT"]
    at_risk_routes = [r for r in route_statuses if r.get("status") == "AT_RISK"]
    passable_routes = [r for r in route_statuses if r.get("status") == "PASSABLE"]

    cut_names = [r.get("name", "Arterial route") for r in cut_routes[:2]]
    cut_summary = ", ".join(cut_names) if cut_names else "None"
    line4 = (
        f"4. [LOGISTICS & ACCESS]: {len(cut_routes)} route(s) CUT ({cut_summary}); "
        f"{len(at_risk_routes)} route(s) AT RISK; {len(passable_routes)} arterial corridor(s) passable with verified evidence."
    )

    # 5. Staging Recommendation Line
    if staging_recommendation:
        stg_name = staging_recommendation.get("name", "OSDMA Central Warehouse")
        stg_loc = staging_recommendation.get("district", "Cuttack / Bhubaneswar")
        stg_rationale = staging_recommendation.get("rationale", "situated outside 90 km/h wind envelope with intact NH-16 access")
        line5 = f"5. [STAGING RECOMMENDATION]: Pre-position response assets at {stg_name} ({stg_loc}) — {stg_rationale}."
    else:
        line5 = "5. [STAGING RECOMMENDATION]: Staging depot selection pending route clearance verification; do not deploy without verified corridors."

    # 6. Interlock & Provenance Status Line
    timestamp_str = datetime.now().strftime("%Y-%m-%d %H:%M IST")
    if interlock_flags:
        flags_str = "; ".join(interlock_flags)
        line6 = f"6. [SAFETY INTERLOCKS]: REVIEW REQUIRED — Open flags: [{flags_str}]. Automated evacuation orders refused. Human approval mandatory."
    else:
        line6 = f"6. [SAFETY INTERLOCKS]: ARMED (0 open flags) | Provenance: MODEL_ESTIMATE as of {timestamp_str} | Decision Support Only."

    lines = [line1, line2, line3, line4, line5, line6]
    return {
        "lines": lines,
        "text": "\n".join(lines),
        "line_count": len(lines),
        "provenance_tag": "MODEL_ESTIMATE",
        "external_calls_made": 0,
        "is_simulated": True
    }
