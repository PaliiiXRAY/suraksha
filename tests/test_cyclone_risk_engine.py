"""
SURAKSHA Cyclone Area-Wise Risk Engine Tests (M1 T3).
Validates ARCHITECTURE §4.1, docs/SRS.md FR-3.1 - FR-3.4, docs/KICKOFF.md.
"""
from datetime import datetime, timedelta, timezone
import pytest

from backend.app.services.risk.area_engine import (
    calculate_area_risk,
    compute_wind_factor,
    compute_rainfall_factor,
    compute_population_factor,
    compute_surge_factor,
    compute_infrastructure_factor,
    compute_urgency_factor,
    WEIGHT_WIND,
    WEIGHT_RAINFALL,
    WEIGHT_POPULATION,
    WEIGHT_SURGE,
    WEIGHT_INFRASTRUCTURE,
    WEIGHT_URGENCY,
)


def test_weights_sum_to_one():
    total_weights = (
        WEIGHT_WIND
        + WEIGHT_RAINFALL
        + WEIGHT_POPULATION
        + WEIGHT_SURGE
        + WEIGHT_INFRASTRUCTURE
        + WEIGHT_URGENCY
    )
    assert abs(total_weights - 1.0) < 1e-6
    assert WEIGHT_WIND == 0.30
    assert WEIGHT_RAINFALL == 0.20
    assert WEIGHT_POPULATION == 0.20
    assert WEIGHT_SURGE == 0.15
    assert WEIGHT_INFRASTRUCTURE == 0.10
    assert WEIGHT_URGENCY == 0.05


def test_coastal_block_at_120kmh_scores_above_70():
    """
    Critical acceptance criterion:
    Coastal block at wind 120 km/h scores > 70 under the specified acceptance fixture.
    """
    res = calculate_area_risk(
        area_code="OD_PUR_01",
        wind_kmh=120.0,
        rainfall_mm=180.0,
        flood_susceptibility=0.75,
        total_population=185000,
        vulnerable_population=32000,
        is_coastal=True,
        distance_to_landfall_km=15.0,
        asset_count_10km=3,
        hours_to_landfall=16.0,  # <24h urgency
    )

    assert res.score > 70.0, f"Expected score > 70, got {res.score}"
    assert len(res.reasons) == 6
    assert res.provenance_tag == "MODEL_ESTIMATE"
    assert res.data_freshness == "FRESH"


def test_reasons_sum_strictly_to_final_score():
    """
    FR-3.2: Contributions of all 6 reasons must sum to the final score within float tolerance.
    """
    res = calculate_area_risk(
        area_code="OD_CTC_04",
        wind_kmh=95.0,
        rainfall_mm=110.0,
        flood_susceptibility=0.60,
        total_population=140000,
        vulnerable_population=15000,
        is_coastal=False,
        distance_to_landfall_km=None,
        asset_count_10km=2,
        hours_to_landfall=36.0,
    )

    reason_contrib_sum = sum(r.contribution for r in res.reasons)
    assert abs(reason_contrib_sum - res.score) < 1e-4

    # Verify each factor reason contains required keys
    for r in res.reasons:
        d = r.to_dict()
        assert "factor" in d
        assert "weight" in d
        assert "contribution" in d
        assert "detail" in d
        assert len(d["detail"]) > 5


def test_deterministic_repeatability():
    """
    FR-3.1: Identical inputs must yield identical scores and identical reason contributions.
    """
    params = dict(
        area_code="OD_BAM_02",
        wind_kmh=140.0,
        rainfall_mm=210.0,
        flood_susceptibility=0.85,
        total_population=210000,
        vulnerable_population=40000,
        is_coastal=True,
        distance_to_landfall_km=8.0,
        asset_count_10km=4,
        hours_to_landfall=12.0,
    )

    run1 = calculate_area_risk(**params)
    run2 = calculate_area_risk(**params)

    assert run1.score == run2.score
    assert [r.to_dict() for r in run1.reasons] == [r.to_dict() for r in run2.reasons]
    assert run1.provenance_tag == run2.provenance_tag


def test_score_bounding_and_clamping():
    """
    Risk score must be clamped strictly within [0.0, 100.0].
    """
    # Extremely massive hazard inputs
    max_res = calculate_area_risk(
        area_code="OD_KRD_99",
        wind_kmh=400.0,
        rainfall_mm=999.0,
        flood_susceptibility=1.5,
        total_population=1000000,
        vulnerable_population=500000,
        is_coastal=True,
        distance_to_landfall_km=0.0,
        asset_count_10km=20,
        hours_to_landfall=1.0,
    )
    assert max_res.score <= 100.0

    # Zero hazard inputs
    min_res = calculate_area_risk(
        area_code="OD_KRD_00",
        wind_kmh=0.0,
        rainfall_mm=0.0,
        flood_susceptibility=0.0,
        total_population=0,
        vulnerable_population=0,
        is_coastal=False,
        distance_to_landfall_km=500.0,
        asset_count_10km=0,
        hours_to_landfall=100.0,
    )
    # Even at zero hazard, urgency factor contributes baseline 20 * 0.05 = 1.0
    assert min_res.score >= 0.0
    assert min_res.score <= 5.0


def test_zero_population_handled_safely():
    """
    Zero population should not raise ZeroDivisionError and should emit 0 contribution.
    """
    res = calculate_area_risk(
        area_code="OD_FOREST_01",
        wind_kmh=80.0,
        rainfall_mm=50.0,
        total_population=0,
        vulnerable_population=0,
        is_coastal=False,
    )
    pop_reason = next(r for r in res.reasons if r.factor == "population_exposure")
    assert pop_reason.contribution == 0.0
    assert "Zero or unrecorded block population" in pop_reason.detail


def test_missing_wind_telemetry_flags_insufficient_data():
    """
    FR-3.4 / ARCHITECTURE §4.2: Missing inputs must NOT silently become low risk or neutral 50.
    Must flag INSUFFICIENT_DATA and record interlock flag.
    """
    res = calculate_area_risk(
        area_code="OD_UNK_01",
        wind_kmh=None,  # Missing
        rainfall_mm=100.0,
        total_population=80000,
        is_coastal=False,
    )
    assert res.provenance_tag == "INSUFFICIENT_DATA"
    assert "MISSING_WIND_TELEMETRY" in res.interlock_flags
    wind_reason = next(r for r in res.reasons if r.factor == "wind_exposure")
    assert "insufficient data" in wind_reason.detail.lower()


def test_stale_source_timestamp_triggers_interlock():
    """
    M2 T3 Interlock integration: Telemetry older than 6h forces INSUFFICIENT_DATA and STALE_DATA flag.
    """
    now = datetime.now(timezone.utc)
    stale_time = now - timedelta(hours=10)

    res = calculate_area_risk(
        area_code="OD_STALE_01",
        wind_kmh=110.0,
        rainfall_mm=80.0,
        total_population=90000,
        is_coastal=True,
        source_timestamp=stale_time,
        reference_time=now,
    )
    assert "STALE_DATA" in res.interlock_flags
    assert res.provenance_tag == "INSUFFICIENT_DATA"
    assert res.data_freshness == "STALE"


def test_future_source_timestamp_fails_safe():
    """
    M2 T3 Interlock integration: Future timestamp fails safe with FUTURE_SOURCE_TIMESTAMP.
    """
    now = datetime.now(timezone.utc)
    future_time = now + timedelta(hours=3)

    res = calculate_area_risk(
        area_code="OD_FUT_01",
        wind_kmh=100.0,
        source_timestamp=future_time,
        reference_time=now,
    )
    assert "FUTURE_SOURCE_TIMESTAMP" in res.interlock_flags
    assert res.provenance_tag == "INSUFFICIENT_DATA"


def test_invalid_negative_inputs_clamped():
    """
    Negative values for wind, rainfall, population clamped safely.
    """
    norm_w, det_w, miss_w = compute_wind_factor(-50.0)
    assert norm_w == 0.0
    assert miss_w is True

    norm_r, det_r, miss_r = compute_rainfall_factor(-100.0, -0.5)
    assert norm_r == 0.0

    norm_p, det_p = compute_population_factor(-5000)
    assert norm_p == 0.0
