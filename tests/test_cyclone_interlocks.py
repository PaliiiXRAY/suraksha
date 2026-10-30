"""
Tests for Task T3: Deterministic Decision Interlocks v1.
Validates source timestamp freshness evaluation, boundary conditions, safe failure modes,
future timestamp safety interlocks, and hand-in-glove integration with Task T1's Cyclone State Machine.
Zero database, network, or clock sleep dependencies.
"""
from dataclasses import FrozenInstanceError
from datetime import datetime, timedelta, timezone
import pytest

from backend.app.services.cyclone import (
    CycloneStatus,
    InterlockBlockedError,
    validate_transition,
    evaluate_source_freshness,
    FreshnessResult,
    STALE_DATA_FLAG,
    REVIEW_REQUIRED_STATUS,
    CLEAR_STATUS,
    INSUFFICIENT_DATA_PROVENANCE,
    DEFAULT_STALENESS_THRESHOLD_HOURS,
)
from backend.app.services.cyclone.interlocks import FUTURE_SOURCE_TIMESTAMP_FLAG

# Deterministic reference baseline for testing
FIXED_REF_TIME = datetime(2026, 10, 30, 12, 0, 0, tzinfo=timezone.utc)
FIXED_REF_STR = "2026-10-30T12:00:00Z"


# -------------------------------------------------------------------------
# 1. Fresh Timestamp
# -------------------------------------------------------------------------

def test_fresh_timestamp():
    """Telemetry strictly younger than 6 hours is fresh with no interlock flags."""
    source_time = FIXED_REF_TIME - timedelta(hours=2)
    result = evaluate_source_freshness(source_time, reference_time=FIXED_REF_TIME)

    assert result.is_stale is False
    assert result.age_hours == 2.0
    assert result.interlock_flags == ()
    assert result.review_status == CLEAR_STATUS
    assert result.provenance_override is None
    assert result.flags_as_list == []


# -------------------------------------------------------------------------
# 2. Timestamp Older than Six Hours
# -------------------------------------------------------------------------

def test_stale_timestamp_older_than_six_hours():
    """Telemetry older than 6 hours produces STALE_DATA and forces REVIEW_REQUIRED."""
    source_time = FIXED_REF_TIME - timedelta(hours=6, minutes=30)
    result = evaluate_source_freshness(source_time, reference_time=FIXED_REF_TIME)

    assert result.is_stale is True
    assert result.age_hours == 6.5
    assert STALE_DATA_FLAG in result.interlock_flags
    assert result.review_status == REVIEW_REQUIRED_STATUS
    assert result.provenance_override == INSUFFICIENT_DATA_PROVENANCE


# -------------------------------------------------------------------------
# 3. Exactly Six-Hour Boundary
# -------------------------------------------------------------------------

def test_exactly_six_hour_boundary_is_fresh():
    """Exactly six hours of age is classified as fresh."""
    source_time = FIXED_REF_TIME - timedelta(hours=6)
    result = evaluate_source_freshness(source_time, reference_time=FIXED_REF_TIME)

    assert result.is_stale is False
    assert result.age_hours == 6.0
    assert result.interlock_flags == ()
    assert result.review_status == CLEAR_STATUS
    assert result.provenance_override is None


# -------------------------------------------------------------------------
# 4. Just Over the Six-Hour Boundary
# -------------------------------------------------------------------------

def test_just_over_six_hour_boundary_is_stale():
    """Age strictly greater than six hours (by 1 second) triggers staleness."""
    source_time = FIXED_REF_TIME - timedelta(hours=6, seconds=1)
    result = evaluate_source_freshness(source_time, reference_time=FIXED_REF_TIME)

    assert result.is_stale is True
    assert result.age_hours > 6.0
    assert STALE_DATA_FLAG in result.interlock_flags
    assert result.review_status == REVIEW_REQUIRED_STATUS
    assert result.provenance_override == INSUFFICIENT_DATA_PROVENANCE


# -------------------------------------------------------------------------
# 5. Missing Timestamp (None and Empty String)
# -------------------------------------------------------------------------

@pytest.mark.parametrize("missing_input", [None, "", "   "])
def test_missing_timestamp_fails_safe(missing_input):
    """Missing source timestamp evidence fails safe and is not treated as fresh."""
    result = evaluate_source_freshness(missing_input, reference_time=FIXED_REF_TIME)

    assert result.is_stale is True
    assert result.age_hours is None
    assert STALE_DATA_FLAG in result.interlock_flags
    assert "MISSING_SOURCE_TIMESTAMP" in result.interlock_flags
    assert result.review_status == REVIEW_REQUIRED_STATUS
    assert result.provenance_override == INSUFFICIENT_DATA_PROVENANCE


# -------------------------------------------------------------------------
# 6. Malformed Timestamp
# -------------------------------------------------------------------------

@pytest.mark.parametrize("malformed_input", ["not-a-date", "2026-99-99T99:99:99Z", 12345, [], {}])
def test_malformed_timestamp_fails_safe(malformed_input):
    """Malformed timestamp inputs fail safe without throwing unhandled exceptions."""
    result = evaluate_source_freshness(malformed_input, reference_time=FIXED_REF_TIME)

    assert result.is_stale is True
    assert result.age_hours is None
    assert STALE_DATA_FLAG in result.interlock_flags
    assert "MALFORMED_SOURCE_TIMESTAMP" in result.interlock_flags
    assert result.review_status == REVIEW_REQUIRED_STATUS
    assert result.provenance_override == INSUFFICIENT_DATA_PROVENANCE


# -------------------------------------------------------------------------
# 7. Timezone-Aware UTC Input (datetime and ISO String)
# -------------------------------------------------------------------------

def test_timezone_aware_utc_inputs():
    """Verify both timezone-aware UTC datetime and valid ISO string work identically."""
    # Datetime with tzinfo=timezone.utc
    dt_input = datetime(2026, 10, 30, 9, 0, 0, tzinfo=timezone.utc)
    res_dt = evaluate_source_freshness(dt_input, reference_time=FIXED_REF_TIME)
    assert res_dt.is_stale is False
    assert res_dt.age_hours == 3.0

    # ISO string with trailing Z
    str_input_z = "2026-10-30T09:00:00Z"
    res_str_z = evaluate_source_freshness(str_input_z, reference_time=FIXED_REF_TIME)
    assert res_str_z.is_stale is False
    assert res_str_z.age_hours == 3.0

    # ISO string with +00:00 offset
    str_input_offset = "2026-10-30T09:00:00+00:00"
    res_str_offset = evaluate_source_freshness(str_input_offset, reference_time=FIXED_REF_TIME)
    assert res_str_offset.is_stale is False
    assert res_str_offset.age_hours == 3.0


# -------------------------------------------------------------------------
# 8. Equivalent Non-UTC Timezone Input (e.g. IST +05:30)
# -------------------------------------------------------------------------

def test_equivalent_non_utc_timezone_normalized_correctly():
    """14:30 IST is identical to 09:00 UTC (3 hours before 12:00 UTC reference)."""
    ist = timezone(timedelta(hours=5, minutes=30))
    dt_ist = datetime(2026, 10, 30, 14, 30, 0, tzinfo=ist)

    res_dt = evaluate_source_freshness(dt_ist, reference_time=FIXED_REF_TIME)
    assert res_dt.is_stale is False
    assert res_dt.age_hours == 3.0

    # ISO-8601 string with IST offset (+05:30)
    str_ist = "2026-10-30T14:30:00+05:30"
    res_str = evaluate_source_freshness(str_ist, reference_time=FIXED_REF_TIME)
    assert res_str.is_stale is False
    assert res_str.age_hours == 3.0


# -------------------------------------------------------------------------
# 9. Naive Datetime Behaviour
# -------------------------------------------------------------------------

def test_naive_datetime_fails_safe_without_assuming_utc():
    """Naive datetime must NOT be silently interpreted as UTC; it fails safe to REVIEW_REQUIRED."""
    naive_dt = datetime(2026, 10, 30, 10, 0, 0)  # No tzinfo
    result = evaluate_source_freshness(naive_dt, reference_time=FIXED_REF_TIME)

    assert result.is_stale is True
    assert result.age_hours is None
    assert STALE_DATA_FLAG in result.interlock_flags
    assert "NAIVE_TIMESTAMP" in result.interlock_flags
    assert result.review_status == REVIEW_REQUIRED_STATUS
    assert result.provenance_override == INSUFFICIENT_DATA_PROVENANCE

    # Same rule applies to naive ISO string without timezone offset
    naive_str = "2026-10-30T10:00:00"
    res_str = evaluate_source_freshness(naive_str, reference_time=FIXED_REF_TIME)
    assert res_str.is_stale is True
    assert "NAIVE_TIMESTAMP" in res_str.interlock_flags


# -------------------------------------------------------------------------
# 10. Invalid reference_time
# -------------------------------------------------------------------------

@pytest.mark.parametrize(
    "invalid_ref",
    [
        datetime(2026, 10, 30, 12, 0, 0),  # Naive datetime
        "invalid-ref-date",
        "2026-10-30T12:00:00",              # Naive string
        12345,
        [],
    ],
)
def test_invalid_reference_time_raises_value_error(invalid_ref):
    """Developer/tester contract error: invalid reference_time raises ValueError."""
    with pytest.raises(ValueError) as exc_info:
        evaluate_source_freshness(FIXED_REF_TIME, reference_time=invalid_ref)
    assert "Invalid reference_time" in str(exc_info.value)


# -------------------------------------------------------------------------
# 11. Invalid threshold
# -------------------------------------------------------------------------

@pytest.mark.parametrize("invalid_threshold", [0, -1.0, -10, float("nan"), float("inf"), "6.0", True, False])
def test_invalid_threshold_raises_value_error(invalid_threshold):
    """Developer contract error: invalid max_age_hours threshold raises ValueError."""
    with pytest.raises(ValueError) as exc_info:
        evaluate_source_freshness(FIXED_REF_TIME, reference_time=FIXED_REF_TIME, max_age_hours=invalid_threshold)
    assert "Invalid max_age_hours" in str(exc_info.value)


# -------------------------------------------------------------------------
# 12. Future-Dated Source Timestamps Safety Gate
# -------------------------------------------------------------------------

def test_future_timestamp_one_second_ahead_fails_safe():
    """A source timestamp strictly 1 second in the future must fail safe."""
    future_source = FIXED_REF_TIME + timedelta(seconds=1)
    result = evaluate_source_freshness(future_source, reference_time=FIXED_REF_TIME)

    assert result.is_stale is True
    assert result.age_hours < 0.0
    assert result.review_status == REVIEW_REQUIRED_STATUS
    assert result.provenance_override == INSUFFICIENT_DATA_PROVENANCE
    assert STALE_DATA_FLAG in result.interlock_flags
    assert FUTURE_SOURCE_TIMESTAMP_FLAG in result.interlock_flags


def test_future_timestamp_several_hours_ahead_fails_safe():
    """A source timestamp several hours in the future must fail safe."""
    future_source = FIXED_REF_TIME + timedelta(hours=3)
    result = evaluate_source_freshness(future_source, reference_time=FIXED_REF_TIME)

    assert result.is_stale is True
    assert result.age_hours == -3.0
    assert result.review_status == REVIEW_REQUIRED_STATUS
    assert result.provenance_override == INSUFFICIENT_DATA_PROVENANCE
    assert STALE_DATA_FLAG in result.interlock_flags
    assert FUTURE_SOURCE_TIMESTAMP_FLAG in result.interlock_flags


@pytest.mark.parametrize(
    "future_delta",
    [
        timedelta(seconds=1),
        timedelta(minutes=5),
        timedelta(hours=2),
    ],
)
def test_future_timestamp_blocks_evac_ordered_through_t1(future_delta):
    """Future-dated telemetry must strictly block T1 WARNING -> EVAC_ORDERED transition."""
    future_source = FIXED_REF_TIME + future_delta
    evaluation = evaluate_source_freshness(future_source, reference_time=FIXED_REF_TIME)

    assert evaluation.is_stale is True
    assert evaluation.review_status == REVIEW_REQUIRED_STATUS
    assert STALE_DATA_FLAG in evaluation.interlock_flags

    # Passing evaluation flags to T1 state machine must be strictly refused
    with pytest.raises(InterlockBlockedError) as exc_info:
        validate_transition(
            current_status=CycloneStatus.WARNING,
            new_status=CycloneStatus.EVAC_ORDERED,
            interlock_flags=evaluation.flags_as_list,
        )
    assert STALE_DATA_FLAG in exc_info.value.interlock_flags


# -------------------------------------------------------------------------
# 13. T1 Integration: Stale Data Blocks Evacuation
# -------------------------------------------------------------------------

def test_t1_integration_stale_data_blocks_evac_ordered():
    """Stale source telemetry forces STALE_DATA, which blocks T1 EVAC_ORDERED transition."""
    stale_source = FIXED_REF_TIME - timedelta(hours=8)
    evaluation = evaluate_source_freshness(stale_source, reference_time=FIXED_REF_TIME)

    assert evaluation.is_stale is True
    assert evaluation.review_status == REVIEW_REQUIRED_STATUS
    assert STALE_DATA_FLAG in evaluation.interlock_flags

    # Feeding evaluation flags to T1 state machine must be strictly refused
    with pytest.raises(InterlockBlockedError) as exc_info:
        validate_transition(
            current_status=CycloneStatus.WARNING,
            new_status=CycloneStatus.EVAC_ORDERED,
            interlock_flags=evaluation.flags_as_list,
        )
    assert STALE_DATA_FLAG in exc_info.value.interlock_flags


# -------------------------------------------------------------------------
# 14. T1 Integration: Fresh Data Allows Evacuation
# -------------------------------------------------------------------------

def test_t1_integration_fresh_data_permits_evac_ordered():
    """Fresh source telemetry produces empty flags ([]), permitting T1 EVAC_ORDERED transition."""
    fresh_source = FIXED_REF_TIME - timedelta(hours=1)
    evaluation = evaluate_source_freshness(fresh_source, reference_time=FIXED_REF_TIME)

    assert evaluation.is_stale is False
    assert evaluation.review_status == CLEAR_STATUS
    assert evaluation.flags_as_list == []

    # Feeding evaluation flags to T1 state machine must succeed
    target = validate_transition(
        current_status=CycloneStatus.WARNING,
        new_status=CycloneStatus.EVAC_ORDERED,
        interlock_flags=evaluation.flags_as_list,
    )
    assert target == CycloneStatus.EVAC_ORDERED


# -------------------------------------------------------------------------
# 15. Provenance Fallback on Stale or Missing Data
# -------------------------------------------------------------------------

def test_provenance_fallback_on_stale_or_missing_evidence():
    """Per PROVENANCE_SPEC.md, stale or missing data overrides provenance to INSUFFICIENT_DATA."""
    # Stale data
    stale_eval = evaluate_source_freshness(FIXED_REF_TIME - timedelta(hours=7), reference_time=FIXED_REF_TIME)
    assert stale_eval.provenance_override == INSUFFICIENT_DATA_PROVENANCE

    # Missing data
    missing_eval = evaluate_source_freshness(None, reference_time=FIXED_REF_TIME)
    assert missing_eval.provenance_override == INSUFFICIENT_DATA_PROVENANCE

    # Fresh data carries no override
    fresh_eval = evaluate_source_freshness(FIXED_REF_TIME - timedelta(hours=1), reference_time=FIXED_REF_TIME)
    assert fresh_eval.provenance_override is None


# -------------------------------------------------------------------------
# 16. Deterministic Repeatability Using Injected reference_time
# -------------------------------------------------------------------------

def test_deterministic_repeatability():
    """Evaluating identical parameters multiple times yields identical results."""
    source = "2026-10-30T08:30:00Z"
    ref = "2026-10-30T12:00:00Z"

    res1 = evaluate_source_freshness(source, reference_time=ref)
    res2 = evaluate_source_freshness(source, reference_time=ref)

    assert res1 == res2
    assert res1.to_dict() == res2.to_dict()
    assert res1.age_hours == 3.5


# -------------------------------------------------------------------------
# 17. FreshnessResult Immutability and Serialization
# -------------------------------------------------------------------------

def test_freshness_result_immutability_and_serialization():
    """FreshnessResult is a frozen dataclass and serializes cleanly to dict."""
    result = evaluate_source_freshness(FIXED_REF_TIME, reference_time=FIXED_REF_TIME)

    # Immutability
    with pytest.raises(FrozenInstanceError):
        result.is_stale = True

    # Dict serialization
    d = result.to_dict()
    assert d["is_stale"] is False
    assert d["age_hours"] == 0.0
    assert d["interlock_flags"] == []
    assert d["review_status"] == CLEAR_STATUS
    assert d["provenance_override"] is None
