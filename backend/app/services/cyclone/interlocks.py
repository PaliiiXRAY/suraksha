"""
Deterministic Decision Interlocks v1 for SURAKSHA.
Pure module: Database-independent, side-effect-free, zero external dependencies.

Requirements (ARCHITECTURE.md §4, §4.2, §7; docs/SRS.md FR-4.1, AC-4; docs/PROVENANCE_SPEC.md):
- Evaluates source timestamp freshness against an explicit threshold (default 6.0 hours).
- Stale data (age > 6h) produces STALE_DATA and forces REVIEW_REQUIRED.
- Exactly 6h is fresh.
- Future-dated timestamps (source > reference) fail safe to REVIEW_REQUIRED, INSUFFICIENT_DATA,
  and emit (STALE_DATA, FUTURE_SOURCE_TIMESTAMP) to block EVAC_ORDERED.
- Missing, naive, or malformed source evidence fails safe to REVIEW_REQUIRED and INSUFFICIENT_DATA.
- Fresh data returns no stale flags, review_status="CLEAR", and provenance_override=None.
- Provides immutable structured result convertible to list for T1 EVAC_ORDERED validation.
"""
from dataclasses import dataclass
from datetime import datetime, timezone
import math
from typing import Any, Dict, List, Optional, Tuple, Union

# Canonical interlock flag and status constants
STALE_DATA_FLAG: str = "STALE_DATA"
FUTURE_SOURCE_TIMESTAMP_FLAG: str = "FUTURE_SOURCE_TIMESTAMP"
REVIEW_REQUIRED_STATUS: str = "REVIEW_REQUIRED"
CLEAR_STATUS: str = "CLEAR"
INSUFFICIENT_DATA_PROVENANCE: str = "INSUFFICIENT_DATA"
DEFAULT_STALENESS_THRESHOLD_HOURS: float = 6.0


@dataclass(frozen=True)
class FreshnessResult:
    """
    Immutable structured evaluation result from evaluate_source_freshness.
    Exposes fields for API serialization, risk engine integration, and T1 gate validation.
    """
    is_stale: bool
    age_hours: Optional[float]
    interlock_flags: Tuple[str, ...]
    review_status: str
    provenance_override: Optional[str]

    @property
    def flags_as_list(self) -> List[str]:
        """Return interlock_flags as a mutable list suitable for T1 state machine validation."""
        return list(self.interlock_flags)

    def to_dict(self) -> Dict[str, Any]:
        """Serialize evaluation result to dictionary for API responses."""
        return {
            "is_stale": self.is_stale,
            "age_hours": self.age_hours,
            "interlock_flags": list(self.interlock_flags),
            "review_status": self.review_status,
            "provenance_override": self.provenance_override,
        }


def _parse_timestamp(val: Any) -> Tuple[Optional[datetime], Optional[str]]:
    """
    Parse a timestamp input into a timezone-aware UTC datetime.
    Returns (datetime_utc, error_reason).
    If val is naive, error_reason is 'NAIVE_TIMESTAMP'.
    If val is malformed, error_reason is 'MALFORMED_SOURCE_TIMESTAMP'.
    If val is missing/empty, error_reason is 'MISSING_SOURCE_TIMESTAMP'.
    """
    if val is None:
        return None, "MISSING_SOURCE_TIMESTAMP"

    if isinstance(val, str):
        clean_val = val.strip()
        if not clean_val:
            return None, "MISSING_SOURCE_TIMESTAMP"
        try:
            # Handle ISO-8601 with trailing Z for UTC
            iso_str = clean_val.replace("Z", "+00:00")
            parsed = datetime.fromisoformat(iso_str)
        except (ValueError, TypeError):
            return None, "MALFORMED_SOURCE_TIMESTAMP"
    elif isinstance(val, datetime):
        parsed = val
    else:
        return None, "MALFORMED_SOURCE_TIMESTAMP"

    # Reject naive datetimes: do not silently interpret as UTC
    if parsed.tzinfo is None or parsed.tzinfo.utcoffset(parsed) is None:
        return None, "NAIVE_TIMESTAMP"

    return parsed.astimezone(timezone.utc), None


def evaluate_source_freshness(
    source_timestamp: Any,
    reference_time: Optional[Union[datetime, str]] = None,
    max_age_hours: float = DEFAULT_STALENESS_THRESHOLD_HOURS,
) -> FreshnessResult:
    """
    Evaluate telemetry freshness against a staleness threshold (default 6.0 hours).

    Enforces:
    1. Validation of reference_time and max_age_hours parameters (raises ValueError if invalid).
    2. Timezone awareness: Timestamps must be timezone-aware; naive datetimes fail safe.
    3. Normalization: All comparisons performed in timezone.utc.
    4. Deterministic threshold:
       - Future-dated timestamp (source > ref): FAILS SAFE (STALE_DATA, FUTURE_SOURCE_TIMESTAMP,
         REVIEW_REQUIRED, INSUFFICIENT_DATA).
       - age_hours strictly > max_age_hours: STALE (STALE_DATA, REVIEW_REQUIRED, INSUFFICIENT_DATA).
       - 0.0 <= age_hours <= max_age_hours: FRESH (no flags, CLEAR, provenance_override=None).
    5. Missing / malformed / naive evidence: Fails safe to STALE with INSUFFICIENT_DATA.

    Returns:
        FreshnessResult: Immutable dataclass with evaluation attributes.
    """
    # 1. Validate max_age_hours parameter
    if (
        isinstance(max_age_hours, bool)
        or not isinstance(max_age_hours, (int, float))
        or math.isnan(max_age_hours)
        or math.isinf(max_age_hours)
        or max_age_hours <= 0.0
    ):
        raise ValueError(
            f"Invalid max_age_hours threshold '{max_age_hours}'. Must be a positive finite number."
        )

    # 2. Validate and normalize reference_time parameter
    if reference_time is None:
        ref_utc = datetime.now(timezone.utc)
    else:
        ref_parsed, ref_err = _parse_timestamp(reference_time)
        if ref_err or ref_parsed is None:
            raise ValueError(
                f"Invalid reference_time '{reference_time}': must be a timezone-aware datetime "
                "or ISO-8601 string with timezone offset."
            )
        ref_utc = ref_parsed

    # 3. Parse source_timestamp
    source_utc, parse_err = _parse_timestamp(source_timestamp)

    # Missing, malformed, or naive timestamp fails safe
    if parse_err or source_utc is None:
        return FreshnessResult(
            is_stale=True,
            age_hours=None,
            interlock_flags=(STALE_DATA_FLAG, parse_err or "INVALID_TIMESTAMP"),
            review_status=REVIEW_REQUIRED_STATUS,
            provenance_override=INSUFFICIENT_DATA_PROVENANCE,
        )

    # 4. Calculate elapsed age in hours
    elapsed_seconds = (ref_utc - source_utc).total_seconds()
    age_hours = elapsed_seconds / 3600.0

    # 5. Evaluate future timestamp (source_utc strictly later than ref_utc)
    # Future-dated source evidence cannot be certified fresh and must fail safe.
    if age_hours < 0.0:
        return FreshnessResult(
            is_stale=True,
            age_hours=round(age_hours, 4),
            interlock_flags=(STALE_DATA_FLAG, FUTURE_SOURCE_TIMESTAMP_FLAG),
            review_status=REVIEW_REQUIRED_STATUS,
            provenance_override=INSUFFICIENT_DATA_PROVENANCE,
        )

    # 6. Evaluate against staleness threshold
    # Rule: Age strictly greater than max_age_hours is stale; exactly equal is fresh.
    if age_hours > max_age_hours:
        return FreshnessResult(
            is_stale=True,
            age_hours=round(age_hours, 4),
            interlock_flags=(STALE_DATA_FLAG,),
            review_status=REVIEW_REQUIRED_STATUS,
            provenance_override=INSUFFICIENT_DATA_PROVENANCE,
        )

    # Fresh source data (0.0 <= age_hours <= max_age_hours)
    return FreshnessResult(
        is_stale=False,
        age_hours=round(age_hours, 4),
        interlock_flags=(),
        review_status=CLEAR_STATUS,
        provenance_override=None,
    )
