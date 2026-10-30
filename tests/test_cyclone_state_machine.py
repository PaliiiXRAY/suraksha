"""
Tests for Task T1: Deterministic Cyclone Lifecycle State Machine.
Validates the complete transition matrix, terminal states, same-state behavior,
case-normalisation, and the safety interlock gate for EVAC_ORDERED.
Zero database or network dependency.
"""
import pytest
from types import MappingProxyType
from typing import Any, List, Optional

from backend.app.services.cyclone import normalize_status as exported_normalize_status
from backend.app.services.cyclone.state_machine import (
    CycloneStatus,
    CycloneStateError,
    InvalidStatusError,
    InvalidStateTransitionError,
    SameStateTransitionError,
    TerminalStateError,
    InterlockBlockedError,
    ALLOWED_TRANSITIONS,
    TERMINAL_STATUSES,
    can_transition,
    validate_transition,
    get_allowed_transitions,
    is_terminal_status,
    normalize_status,
)


# -------------------------------------------------------------------------
# 1. Valid Transitions Matrix
# -------------------------------------------------------------------------

@pytest.mark.parametrize(
    "current_status, target_status, interlock_flags, expected",
    [
        (CycloneStatus.MONITORING, CycloneStatus.WARNING, None, CycloneStatus.WARNING),
        (CycloneStatus.WARNING, CycloneStatus.EVAC_ORDERED, [], CycloneStatus.EVAC_ORDERED),
        (CycloneStatus.WARNING, CycloneStatus.STAND_DOWN, None, CycloneStatus.STAND_DOWN),
        (CycloneStatus.EVAC_ORDERED, CycloneStatus.DEPLOYED, None, CycloneStatus.DEPLOYED),
        (CycloneStatus.DEPLOYED, CycloneStatus.RESOLVED, None, CycloneStatus.RESOLVED),
        # Also verify with string inputs
        ("MONITORING", "WARNING", None, CycloneStatus.WARNING),
        ("WARNING", "EVAC_ORDERED", [], CycloneStatus.EVAC_ORDERED),
        ("WARNING", "STAND_DOWN", None, CycloneStatus.STAND_DOWN),
        ("EVAC_ORDERED", "DEPLOYED", None, CycloneStatus.DEPLOYED),
        ("DEPLOYED", "RESOLVED", None, CycloneStatus.RESOLVED),
    ],
)
def test_valid_transitions_succeed(current_status, target_status, interlock_flags, expected):
    """Verify each allowed transition in the canonical lifecycle succeeds."""
    result = validate_transition(current_status, target_status, interlock_flags=interlock_flags)
    assert result == expected
    assert can_transition(current_status, target_status, interlock_flags=interlock_flags) is True


# -------------------------------------------------------------------------
# 2. Invalid and Skipped Forward Transitions
# -------------------------------------------------------------------------

@pytest.mark.parametrize(
    "current_status, target_status",
    [
        (CycloneStatus.MONITORING, CycloneStatus.EVAC_ORDERED),
        (CycloneStatus.MONITORING, CycloneStatus.DEPLOYED),
        (CycloneStatus.MONITORING, CycloneStatus.RESOLVED),
        (CycloneStatus.MONITORING, CycloneStatus.STAND_DOWN),
        (CycloneStatus.WARNING, CycloneStatus.DEPLOYED),
        (CycloneStatus.WARNING, CycloneStatus.RESOLVED),
        (CycloneStatus.EVAC_ORDERED, CycloneStatus.RESOLVED),
        (CycloneStatus.EVAC_ORDERED, CycloneStatus.STAND_DOWN),
        (CycloneStatus.DEPLOYED, CycloneStatus.STAND_DOWN),
        (CycloneStatus.DEPLOYED, CycloneStatus.WARNING),
    ],
)
def test_invalid_or_skipped_transitions_rejected(current_status, target_status):
    """Skipping phases or moving to unauthorized states must raise InvalidStateTransitionError."""
    with pytest.raises(InvalidStateTransitionError) as exc_info:
        validate_transition(current_status, target_status, interlock_flags=[])
    assert exc_info.value.current_status == current_status
    assert exc_info.value.target_status == target_status
    assert can_transition(current_status, target_status, interlock_flags=[]) is False


# -------------------------------------------------------------------------
# 3. Backward Transitions
# -------------------------------------------------------------------------

@pytest.mark.parametrize(
    "current_status, target_status",
    [
        (CycloneStatus.WARNING, CycloneStatus.MONITORING),
        (CycloneStatus.EVAC_ORDERED, CycloneStatus.WARNING),
        (CycloneStatus.EVAC_ORDERED, CycloneStatus.MONITORING),
        (CycloneStatus.DEPLOYED, CycloneStatus.EVAC_ORDERED),
        (CycloneStatus.DEPLOYED, CycloneStatus.WARNING),
        (CycloneStatus.DEPLOYED, CycloneStatus.MONITORING),
    ],
)
def test_backward_transitions_rejected(current_status, target_status):
    """Backwards movement through the lifecycle is prohibited."""
    with pytest.raises(InvalidStateTransitionError) as exc_info:
        validate_transition(current_status, target_status, interlock_flags=[])
    assert exc_info.value.current_status == current_status
    assert exc_info.value.target_status == target_status
    assert can_transition(current_status, target_status, interlock_flags=[]) is False


# -------------------------------------------------------------------------
# 4. Terminal State Immutability
# -------------------------------------------------------------------------

@pytest.mark.parametrize("terminal_status", [CycloneStatus.STAND_DOWN, CycloneStatus.RESOLVED])
@pytest.mark.parametrize("target_status", list(CycloneStatus))
def test_terminal_states_reject_all_outgoing_transitions(terminal_status, target_status):
    """STAND_DOWN and RESOLVED cannot transition to any status (terminal)."""
    assert is_terminal_status(terminal_status) is True
    if terminal_status == target_status:
        # Same-state transition to self raises SameStateTransitionError
        with pytest.raises(SameStateTransitionError):
            validate_transition(terminal_status, target_status)
    else:
        with pytest.raises(TerminalStateError) as exc_info:
            validate_transition(terminal_status, target_status)
        assert exc_info.value.current_status == terminal_status
        assert exc_info.value.target_status == target_status

    assert can_transition(terminal_status, target_status) is False


# -------------------------------------------------------------------------
# 5. Same-State Transitions
# -------------------------------------------------------------------------

@pytest.mark.parametrize("status", list(CycloneStatus))
def test_same_state_transitions_strictly_rejected(status):
    """Transitioning to the exact same status is a disallowed no-op and raises SameStateTransitionError."""
    with pytest.raises(SameStateTransitionError) as exc_info:
        validate_transition(status, status, interlock_flags=[])
    assert exc_info.value.current_status == status
    assert exc_info.value.target_status == status
    assert can_transition(status, status, interlock_flags=[]) is False


# -------------------------------------------------------------------------
# 6. Safety Interlock Gate: WARNING -> EVAC_ORDERED (ARCHITECTURE §7 & §4.2)
# -------------------------------------------------------------------------

def test_evac_ordered_succeeds_when_interlock_flags_empty_list():
    """EVAC_ORDERED requires interlock_flags == []."""
    result = validate_transition(
        CycloneStatus.WARNING,
        CycloneStatus.EVAC_ORDERED,
        interlock_flags=[],
    )
    assert result == CycloneStatus.EVAC_ORDERED
    assert can_transition(CycloneStatus.WARNING, CycloneStatus.EVAC_ORDERED, interlock_flags=[]) is True


def test_evac_ordered_rejected_when_single_flag_present():
    """A single active interlock flag (e.g. STALE_DATA) blocks EVAC_ORDERED."""
    flags = ["STALE_DATA"]
    with pytest.raises(InterlockBlockedError) as exc_info:
        validate_transition(
            CycloneStatus.WARNING,
            CycloneStatus.EVAC_ORDERED,
            interlock_flags=flags,
        )
    assert exc_info.value.interlock_flags == flags
    assert "active interlock flags present" in str(exc_info.value)
    assert can_transition(CycloneStatus.WARNING, CycloneStatus.EVAC_ORDERED, interlock_flags=flags) is False


def test_evac_ordered_rejected_when_multiple_flags_present():
    """Multiple active interlock flags block EVAC_ORDERED."""
    flags = ["STALE_DATA", "IMD_DISAGREEMENT", "UNVERIFIED_TRACK"]
    with pytest.raises(InterlockBlockedError) as exc_info:
        validate_transition(
            CycloneStatus.WARNING,
            CycloneStatus.EVAC_ORDERED,
            interlock_flags=flags,
        )
    assert exc_info.value.interlock_flags == flags
    assert can_transition(CycloneStatus.WARNING, CycloneStatus.EVAC_ORDERED, interlock_flags=flags) is False


def test_evac_ordered_rejected_when_interlock_flags_none():
    """Missing or unverified interlock data (None) MUST NOT bypass the safety gate."""
    with pytest.raises(InterlockBlockedError) as exc_info:
        validate_transition(
            CycloneStatus.WARNING,
            CycloneStatus.EVAC_ORDERED,
            interlock_flags=None,
        )
    assert exc_info.value.interlock_flags is None
    assert "received None" in str(exc_info.value)
    assert can_transition(CycloneStatus.WARNING, CycloneStatus.EVAC_ORDERED, interlock_flags=None) is False


@pytest.mark.parametrize("invalid_flags", [(), ("FLAG",), "STALE_DATA", {"FLAG"}, False, 0])
def test_evac_ordered_rejected_when_interlock_flags_not_a_list(invalid_flags):
    """Non-list collections or values are rejected to prevent loose truthiness bypassing."""
    with pytest.raises(InterlockBlockedError) as exc_info:
        validate_transition(
            CycloneStatus.WARNING,
            CycloneStatus.EVAC_ORDERED,
            interlock_flags=invalid_flags,
        )
    assert can_transition(CycloneStatus.WARNING, CycloneStatus.EVAC_ORDERED, interlock_flags=invalid_flags) is False


# -------------------------------------------------------------------------
# 7. Safety Interlock Gate: Unrelated Transitions Not Blocked
# -------------------------------------------------------------------------

@pytest.mark.parametrize(
    "current_status, target_status, flags",
    [
        (CycloneStatus.MONITORING, CycloneStatus.WARNING, ["STALE_DATA"]),
        (CycloneStatus.MONITORING, CycloneStatus.WARNING, None),
        (CycloneStatus.WARNING, CycloneStatus.STAND_DOWN, ["STALE_DATA", "IMD_DISAGREEMENT"]),
        (CycloneStatus.WARNING, CycloneStatus.STAND_DOWN, None),
        (CycloneStatus.EVAC_ORDERED, CycloneStatus.DEPLOYED, ["STALE_DATA"]),
        (CycloneStatus.EVAC_ORDERED, CycloneStatus.DEPLOYED, None),
        (CycloneStatus.DEPLOYED, CycloneStatus.RESOLVED, ["STALE_DATA"]),
        (CycloneStatus.DEPLOYED, CycloneStatus.RESOLVED, None),
    ],
)
def test_interlock_flags_do_not_block_unrelated_transitions(current_status, target_status, flags):
    """The interlock gate specifically protects EVAC_ORDERED; other valid lifecycle transitions succeed."""
    result = validate_transition(current_status, target_status, interlock_flags=flags)
    assert result == target_status
    assert can_transition(current_status, target_status, interlock_flags=flags) is True


# -------------------------------------------------------------------------
# 8. Invalid Status Input Values
# -------------------------------------------------------------------------

@pytest.mark.parametrize("invalid_val", ["UNKNOWN", "INVALID_STATUS", "", "  ", "PENDING", 123, None, [], {}])
def test_invalid_status_values_rejected(invalid_val):
    """Unrecognized values or non-string inputs raise InvalidStatusError."""
    with pytest.raises(InvalidStatusError) as exc_info:
        normalize_status(invalid_val)
    assert exc_info.value.invalid_value == invalid_val

    with pytest.raises(InvalidStatusError):
        validate_transition(invalid_val, CycloneStatus.WARNING)

    with pytest.raises(InvalidStatusError):
        validate_transition(CycloneStatus.MONITORING, invalid_val)

    assert can_transition(invalid_val, CycloneStatus.WARNING) is False
    assert can_transition(CycloneStatus.MONITORING, invalid_val) is False


# -------------------------------------------------------------------------
# 9. Case Normalisation and Whitespace Handling
# -------------------------------------------------------------------------

@pytest.mark.parametrize(
    "input_val, expected",
    [
        ("monitoring", CycloneStatus.MONITORING),
        ("MONITORING", CycloneStatus.MONITORING),
        ("  monitoring  ", CycloneStatus.MONITORING),
        ("warning", CycloneStatus.WARNING),
        ("Warning", CycloneStatus.WARNING),
        ("  WARNING\n", CycloneStatus.WARNING),
        ("evac_ordered", CycloneStatus.EVAC_ORDERED),
        ("EVAC_ORDERED", CycloneStatus.EVAC_ORDERED),
        ("  evac_ordered ", CycloneStatus.EVAC_ORDERED),
        ("deployed", CycloneStatus.DEPLOYED),
        ("DEPLOYED", CycloneStatus.DEPLOYED),
        ("resolved", CycloneStatus.RESOLVED),
        ("RESOLVED", CycloneStatus.RESOLVED),
        ("stand_down", CycloneStatus.STAND_DOWN),
        ("STAND_DOWN", CycloneStatus.STAND_DOWN),
    ],
)
def test_case_and_whitespace_normalisation(input_val, expected):
    """Strings are normalized via .strip().upper() to match canonical enum."""
    assert normalize_status(input_val) == expected
    assert exported_normalize_status(input_val) == expected


# -------------------------------------------------------------------------
# 10. Inspection, Helpers, and Immutability
# -------------------------------------------------------------------------

def test_get_allowed_transitions():
    """Verify allowed next transitions query returns sorted lists."""
    assert get_allowed_transitions(CycloneStatus.MONITORING) == [CycloneStatus.WARNING]
    assert get_allowed_transitions(CycloneStatus.WARNING) == [CycloneStatus.EVAC_ORDERED, CycloneStatus.STAND_DOWN]
    assert get_allowed_transitions(CycloneStatus.EVAC_ORDERED) == [CycloneStatus.DEPLOYED]
    assert get_allowed_transitions(CycloneStatus.DEPLOYED) == [CycloneStatus.RESOLVED]
    assert get_allowed_transitions(CycloneStatus.STAND_DOWN) == []
    assert get_allowed_transitions(CycloneStatus.RESOLVED) == []


def test_is_terminal_status():
    """Verify is_terminal_status returns True only for terminal statuses."""
    assert is_terminal_status(CycloneStatus.STAND_DOWN) is True
    assert is_terminal_status(CycloneStatus.RESOLVED) is True
    assert is_terminal_status(CycloneStatus.MONITORING) is False
    assert is_terminal_status(CycloneStatus.WARNING) is False
    assert is_terminal_status(CycloneStatus.EVAC_ORDERED) is False
    assert is_terminal_status(CycloneStatus.DEPLOYED) is False
    # String inputs
    assert is_terminal_status("STAND_DOWN") is True
    assert is_terminal_status("resolved") is True
    assert is_terminal_status("monitoring") is False


def test_transition_definitions_are_immutable():
    """Verify that ALLOWED_TRANSITIONS and TERMINAL_STATUSES cannot be mutated at runtime."""
    assert isinstance(ALLOWED_TRANSITIONS, MappingProxyType)
    assert isinstance(TERMINAL_STATUSES, frozenset)

    # Values inside ALLOWED_TRANSITIONS must be frozensets
    for allowed_set in ALLOWED_TRANSITIONS.values():
        assert isinstance(allowed_set, frozenset)

    # Attempting to assign new entries to ALLOWED_TRANSITIONS raises TypeError
    with pytest.raises(TypeError):
        ALLOWED_TRANSITIONS[CycloneStatus.MONITORING] = frozenset()

    # Attempting to mutate a frozenset raises AttributeError
    with pytest.raises(AttributeError):
        ALLOWED_TRANSITIONS[CycloneStatus.MONITORING].add(CycloneStatus.DEPLOYED)

    with pytest.raises(AttributeError):
        TERMINAL_STATUSES.add(CycloneStatus.MONITORING)
