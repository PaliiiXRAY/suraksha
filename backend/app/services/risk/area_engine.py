"""
SURAKSHA Area-Wise Risk Prioritization Engine (M1 T3).
Pure deterministic engine: ARCHITECTURE.md §4.1, docs/SRS.md FR-3.1 - FR-3.4, docs/KICKOFF.md.

Implements the 6-factor weighted prioritization scoring heuristic:
1. Wind exposure (30%, weight = 0.30)
2. Rainfall and flood susceptibility (20%, weight = 0.20)
3. Population exposure (20%, weight = 0.20)
4. Storm surge / coastal proximity (15%, weight = 0.15)
5. Critical infrastructure density (10%, weight = 0.10)
6. Urgency / Time-to-impact (5%, weight = 0.05)

Guarantees:
- Every factor emits a structured FactorReason: {factor, weight, contribution, detail}.
- Factor contributions strictly sum to the final score within float tolerance.
- Deterministic: same inputs always produce identical outputs.
- Edge-case safe: zero population, negative values, and missing evidence handled without crash.
- Integrates M2 freshness interlocks: stale, future, or missing telemetry flags INSUFFICIENT_DATA.
- Priority index strictly bounded [0.0, 100.0] - explicitly NOT a probability.
"""
from dataclasses import dataclass, field
from datetime import datetime, timezone
import math
from typing import Any, Dict, List, Optional, Tuple, Union

from backend.app.services.cyclone.interlocks import (
    DEFAULT_STALENESS_THRESHOLD_HOURS,
    evaluate_source_freshness,
)

# Canonical Factor Weights (Sum = 1.00)
WEIGHT_WIND: float = 0.30
WEIGHT_RAINFALL: float = 0.20
WEIGHT_POPULATION: float = 0.20
WEIGHT_SURGE: float = 0.15
WEIGHT_INFRASTRUCTURE: float = 0.10
WEIGHT_URGENCY: float = 0.05

# Operational Reference Constants
REF_WIND_MAX_KMH: float = 150.0  # 150 km/h maps to normalized 100.0 intensity
REF_RAINFALL_MAX_MM: float = 250.0  # 250 mm 24h accumulation maps to 100.0
REF_POPULATION_BASELINE: float = 200000.0  # Typical high-density coastal block population
REF_SURGE_DECAY_KM: float = 0.6  # Surge risk decay per km from landfall
REF_INFRA_ASSET_CAP: int = 4  # 4 or more assets within 10km buffer = 100.0


@dataclass(frozen=True)
class FactorReason:
    """Structured operational explanation for a single risk factor contribution."""
    factor: str
    weight: float
    contribution: float
    detail: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "factor": self.factor,
            "weight": round(self.weight, 4),
            "contribution": round(self.contribution, 2),
            "detail": self.detail,
        }


@dataclass(frozen=True)
class AreaRiskResult:
    """Complete explainable risk assessment output for an administrative block."""
    area_code: str
    score: float
    reasons: Tuple[FactorReason, ...]
    interlock_flags: Tuple[str, ...]
    provenance_tag: str
    calculated_at: datetime
    data_freshness: str = "FRESH"

    @property
    def reasons_list(self) -> List[Dict[str, Any]]:
        return [r.to_dict() for r in self.reasons]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "area_code": self.area_code,
            "score": round(self.score, 2),
            "reasons": self.reasons_list,
            "interlock_flags": list(self.interlock_flags),
            "provenance_tag": self.provenance_tag,
            "calculated_at": self.calculated_at.isoformat(),
            "data_freshness": self.data_freshness,
        }


def _clamp(val: float, low: float = 0.0, high: float = 100.0) -> float:
    """Clamp float to [low, high]. Safely handles NaN / inf."""
    if math.isnan(val):
        return low
    return max(low, min(high, val))


# ---------------------------------------------------------------------------
# Individual Factor Normalization Functions (Each returns (norm_0_100, detail))
# ---------------------------------------------------------------------------

def compute_wind_factor(wind_kmh: Optional[float]) -> Tuple[float, str, bool]:
    """
    Factor 1: Forecast wind exposure (Weight: 30%).
    Returns: (normalized_score, detail_string, is_data_missing)
    """
    if wind_kmh is None:
        return 0.0, "Missing forecast wind speed; factor marked as insufficient data", True
    if wind_kmh < 0.0:
        return 0.0, f"Invalid negative wind speed ({wind_kmh} km/h) clamped to 0.0", True

    norm = _clamp((wind_kmh / REF_WIND_MAX_KMH) * 100.0, 0.0, 100.0)
    detail = f"Forecast wind speed {wind_kmh:.1f} km/h ({norm:.1f}% intensity relative to {REF_WIND_MAX_KMH:.0f} km/h reference)"
    return norm, detail, False


def compute_rainfall_factor(
    rainfall_mm: Optional[float],
    flood_susceptibility: float = 0.0,
) -> Tuple[float, str, bool]:
    """
    Factor 2: Rainfall and flood susceptibility (Weight: 20%).
    Combines forecast 24h precipitation accumulation with static terrain flood susceptibility.
    """
    susc = _clamp(flood_susceptibility, 0.0, 1.0)
    if rainfall_mm is None:
        norm = susc * 50.0
        return norm, f"Missing rainfall telemetry; evaluated on static flood susceptibility ({susc:.2f})", True

    clamped_rain = max(0.0, rainfall_mm)
    rain_norm = _clamp((clamped_rain / REF_RAINFALL_MAX_MM) * 100.0, 0.0, 100.0)
    # 70% weighted to forecast rainfall accumulation, 30% to static terrain susceptibility
    combined = _clamp(rain_norm * 0.70 + (susc * 100.0) * 0.30, 0.0, 100.0)
    detail = f"Forecast rainfall {clamped_rain:.1f} mm with terrain flood susceptibility index {susc:.2f}"
    return combined, detail, False


def compute_population_factor(
    total_population: int,
    vulnerable_population: int = 0,
) -> Tuple[float, str]:
    """
    Factor 3: Population exposure (Weight: 20%).
    Safely handles zero or negative population.
    """
    if total_population <= 0:
        return 0.0, "Zero or unrecorded block population (zero human exposure)"

    total = float(total_population)
    vuln = float(max(0, vulnerable_population))
    base_norm = _clamp((total / REF_POPULATION_BASELINE) * 85.0, 0.0, 85.0)
    vuln_ratio = min(1.0, vuln / total) if total > 0 else 0.0
    combined = _clamp(base_norm + vuln_ratio * 15.0, 0.0, 100.0)
    detail = f"Total exposed population {int(total):,} (vulnerable demographics: {int(vuln):,})"
    return combined, detail


def compute_surge_factor(
    is_coastal: bool,
    distance_to_landfall_km: Optional[float] = None,
) -> Tuple[float, str]:
    """
    Factor 4: Storm surge and coastal proximity (Weight: 15%).
    Inland blocks have 0.0 surge risk. Coastal blocks scale inversely with distance to landfall.
    """
    if not is_coastal:
        return 0.0, "Inland block (zero coastal storm surge exposure)"

    if distance_to_landfall_km is None:
        return 85.0, "Coastal block exposed to oceanic storm surge (landfall distance unspecified)"

    dist = max(0.0, distance_to_landfall_km)
    # Proximity decay: starts at 100.0 at landfall point, drops by REF_SURGE_DECAY_KM per km, floored at 40.0
    norm = _clamp(100.0 - (dist * REF_SURGE_DECAY_KM), 40.0, 100.0)
    detail = f"Coastal block situated {dist:.1f} km from forecast landfall point"
    return norm, detail


def compute_infrastructure_factor(asset_count_10km: int) -> Tuple[float, str]:
    """
    Factor 5: Critical infrastructure density (Weight: 10%).
    Evaluated by count of strategic assets (depots, hospitals, helipads, shelters) within 10km buffer.
    """
    count = max(0, asset_count_10km)
    if count == 0:
        return 0.0, "No critical infrastructure assets recorded within 10 km buffer"

    norm = _clamp((float(count) / REF_INFRA_ASSET_CAP) * 100.0, 0.0, 100.0)
    detail = f"{count} strategic assets located within 10 km operational buffer"
    return norm, detail


def compute_urgency_factor(hours_to_landfall: Optional[float]) -> Tuple[float, str]:
    """
    Factor 6: Urgency / Time-to-impact (Weight: 5%).
    Per ARCHITECTURE.md §4.1: <24h = 5 (100.0), <48h = 3 (60.0), else 1 (20.0).
    """
    if hours_to_landfall is None:
        return 20.0, "Unspecified landfall timing; baseline window (>=48h)"
    if hours_to_landfall < 0.0:
        # Landfall already occurred
        return 100.0, f"Post-landfall impact active ({abs(hours_to_landfall):.1f}h elapsed)"
    if hours_to_landfall < 24.0:
        return 100.0, f"Immediate operational urgency: <24h ({hours_to_landfall:.1f}h to landfall)"
    if hours_to_landfall < 48.0:
        return 60.0, f"High operational urgency: 24h-48h window ({hours_to_landfall:.1f}h to landfall)"
    return 20.0, f"Standard monitoring window: >=48h ({hours_to_landfall:.1f}h to landfall)"


# ---------------------------------------------------------------------------
# Core Area Risk Engine
# ---------------------------------------------------------------------------

def calculate_area_risk(
    area_code: str,
    wind_kmh: Optional[float],
    rainfall_mm: Optional[float] = None,
    flood_susceptibility: float = 0.0,
    total_population: int = 0,
    vulnerable_population: int = 0,
    is_coastal: bool = False,
    distance_to_landfall_km: Optional[float] = None,
    asset_count_10km: int = 0,
    hours_to_landfall: Optional[float] = None,
    source_timestamp: Optional[Any] = None,
    reference_time: Optional[Union[datetime, str]] = None,
) -> AreaRiskResult:
    """
    Calculate the 6-factor explainable risk score for an administrative block.

    Returns:
        AreaRiskResult with score, 6 detailed FactorReasons, interlock flags, and provenance.
    """
    reasons: List[FactorReason] = []
    interlock_flags: List[str] = []
    has_insufficient_data = False

    # 1. Freshness & Provenance Interlock Check (M2 T3 integration)
    now_utc = datetime.now(timezone.utc)
    if source_timestamp is not None:
        freshness = evaluate_source_freshness(
            source_timestamp=source_timestamp,
            reference_time=reference_time or now_utc,
            max_age_hours=DEFAULT_STALENESS_THRESHOLD_HOURS,
        )
        if freshness.interlock_flags:
            interlock_flags.extend(freshness.interlock_flags)
        if freshness.is_stale or freshness.provenance_override:
            has_insufficient_data = True

    # Factor 1: Wind
    wind_norm, wind_det, wind_missing = compute_wind_factor(wind_kmh)
    if wind_missing:
        has_insufficient_data = True
        interlock_flags.append("MISSING_WIND_TELEMETRY")
    wind_contrib = wind_norm * WEIGHT_WIND
    reasons.append(FactorReason(
        factor="wind_exposure",
        weight=WEIGHT_WIND,
        contribution=wind_contrib,
        detail=wind_det,
    ))

    # Factor 2: Rainfall & Flood
    rain_norm, rain_det, rain_missing = compute_rainfall_factor(rainfall_mm, flood_susceptibility)
    if rain_missing:
        has_insufficient_data = True
    rain_contrib = rain_norm * WEIGHT_RAINFALL
    reasons.append(FactorReason(
        factor="rainfall_flood",
        weight=WEIGHT_RAINFALL,
        contribution=rain_contrib,
        detail=rain_det,
    ))

    # Factor 3: Population
    pop_norm, pop_det = compute_population_factor(total_population, vulnerable_population)
    pop_contrib = pop_norm * WEIGHT_POPULATION
    reasons.append(FactorReason(
        factor="population_exposure",
        weight=WEIGHT_POPULATION,
        contribution=pop_contrib,
        detail=pop_det,
    ))

    # Factor 4: Surge & Coastal
    surge_norm, surge_det = compute_surge_factor(is_coastal, distance_to_landfall_km)
    surge_contrib = surge_norm * WEIGHT_SURGE
    reasons.append(FactorReason(
        factor="storm_surge_coastal",
        weight=WEIGHT_SURGE,
        contribution=surge_contrib,
        detail=surge_det,
    ))

    # Factor 5: Critical Infrastructure
    infra_norm, infra_det = compute_infrastructure_factor(asset_count_10km)
    infra_contrib = infra_norm * WEIGHT_INFRASTRUCTURE
    reasons.append(FactorReason(
        factor="critical_infrastructure",
        weight=WEIGHT_INFRASTRUCTURE,
        contribution=infra_contrib,
        detail=infra_det,
    ))

    # Factor 6: Urgency
    urgency_norm, urgency_det = compute_urgency_factor(hours_to_landfall)
    urgency_contrib = urgency_norm * WEIGHT_URGENCY
    reasons.append(FactorReason(
        factor="urgency_time_to_impact",
        weight=WEIGHT_URGENCY,
        contribution=urgency_contrib,
        detail=urgency_det,
    ))

    # Sum of contributions strictly equals total raw score
    raw_score = sum(r.contribution for r in reasons)
    final_score = _clamp(raw_score, 0.0, 100.0)

    # Provenance tag assignment
    provenance_tag = "INSUFFICIENT_DATA" if has_insufficient_data else "MODEL_ESTIMATE"
    freshness_tag = "STALE" if ("STALE_DATA" in interlock_flags or has_insufficient_data) else "FRESH"

    return AreaRiskResult(
        area_code=area_code,
        score=final_score,
        reasons=tuple(reasons),
        interlock_flags=tuple(dict.fromkeys(interlock_flags)),  # Deduplicate preserving order
        provenance_tag=provenance_tag,
        calculated_at=now_utc,
        data_freshness=freshness_tag,
    )

