"""
Deterministic Cyclone Lifecycle State Machine for SURAKSHA.
Pure module: Database-independent, side-effect-free, zero external dependencies.

Canonical Lifecycle (ARCHITECTURE.md §7, docs/SRS.md FR-2.2, FR-2.3):
    MONITORING → WARNING → EVAC_ORDERED → DEPLOYED → RESOLVED
                     ↘ STAND_DOWN (from WARNING)

Terminal States:
    - STAND_DOWN
    - RESOLVED

Safety Interlock Gate:
    - Transition to EVAC_ORDERED requires that interlock_flags is strictly an empty list ([]).
    - If interlock_flags is None, not a list, or contains any active flags, transition is refused.
"""
from enum import Enum
from types import MappingProxyType
from typing import Any, Dict, FrozenSet, List, Optional, Set, Union


class CycloneStatus(str, Enum):
    """Canonical cyclone hazard event statuses."""
    MONITORING = "MONITORING"
    WARNING = "WARNING"
    EVAC_ORDERED = "EVAC_ORDERED"
    DEPLOYED = "DEPLOYED"
    RESOLVED = "RESOLVED"
    STAND_DOWN = "STAND_DOWN"


# Allowed forward state transitions (immutable mapping of frozensets)
_ALLOWED_TRANSITIONS: Dict[CycloneStatus, FrozenSet[CycloneStatus]] = {
    CycloneStatus.MONITORING: frozenset({CycloneStatus.WARNING}),
    CycloneStatus.WARNING: frozenset({CycloneStatus.EVAC_ORDERED, CycloneStatus.STAND_DOWN}),
    CycloneStatus.EVAC_ORDERED: frozenset({CycloneStatus.DEPLOYED}),
    CycloneStatus.DEPLOYED: frozenset({CycloneStatus.RESOLVED}),
    CycloneStatus.STAND_DOWN: frozenset(),
    CycloneStatus.RESOLVED: frozenset(),
}

ALLOWED_TRANSITIONS: MappingProxyType[CycloneStatus, FrozenSet[CycloneStatus]] = MappingProxyType(
    _ALLOWED_TRANSITIONS
)

# Terminal states from which no further transitions are allowed (immutable frozenset)
TERMINAL_STATUSES: FrozenSet[CycloneStatus] = frozenset({
    CycloneStatus.STAND_DOWN,
    CycloneStatus.RESOLVED,
})


class CycloneStateError(Exception):
    """Base domain exception for cyclone state machine errors."""
    pass


class InvalidStatusError(CycloneStateError, ValueError):
    """Raised when an unrecognised status value is provided."""
    def __init__(self, invalid_value: Any):
        valid = [s.value for s in CycloneStatus]
        super().__init__(
            f"Invalid cyclone status '{invalid_value}'. Must be one of canonical vocabulary: {valid}"
        )
        self.invalid_value = invalid_value


class InvalidStateTransitionError(CycloneStateError):
    """Raised when attempting an illegal state transition."""
    def __init__(
        self,
        current_status: CycloneStatus,
        target_status: CycloneStatus,
        message: Optional[str] = None,
    ):
        allowed = [s.value for s in ALLOWED_TRANSITIONS.get(current_status, frozenset())]
        default_msg = (
            f"Cannot transition cyclone status from '{current_status.value}' to '{target_status.value}'. "
            f"Allowed next states from '{current_status.value}': {sorted(allowed)}"
        )
        super().__init__(message or default_msg)
        self.current_status = current_status
        self.target_status = target_status


class SameStateTransitionError(InvalidStateTransitionError):
    """
    Raised when attempting to transition to the current status.
    Same-state transitions represent a no-op and are strictly rejected.
    """
    def __init__(self, status: CycloneStatus):
        super().__init__(
            current_status=status,
            target_status=status,
            message=f"Cannot transition from '{status.value}' to itself. Same-state transitions are not permitted.",
        )


class TerminalStateError(InvalidStateTransitionError):
    """Raised when attempting to transition out of a terminal state."""
    def __init__(self, current_status: CycloneStatus, target_status: CycloneStatus):
        super().__init__(
            current_status=current_status,
            target_status=target_status,
            message=(
                f"Cannot transition from terminal state '{current_status.value}' to '{target_status.value}'. "
                f"Status '{current_status.value}' is terminal and cannot transition to any other status."
            ),
        )


class InterlockBlockedError(CycloneStateError):
    """
    Raised when a deterministic safety interlock blocks a status transition.
    Specifically, EVAC_ORDERED requires that interlock_flags is strictly an empty list ([]).
    """
    def __init__(self, message: str, interlock_flags: Any = None):
        super().__init__(message)
        self.interlock_flags = interlock_flags


def normalize_status(status_val: Union[str, CycloneStatus]) -> CycloneStatus:
    """
    Normalise status string or enum to canonical CycloneStatus.
    Strips whitespace and converts to uppercase for strings.
    Raises InvalidStatusError if the input cannot be mapped.
    """
    if isinstance(status_val, CycloneStatus):
        return status_val

    if not isinstance(status_val, str):
        raise InvalidStatusError(status_val)

    clean_val = status_val.strip().upper()
    try:
        return CycloneStatus(clean_val)
    except ValueError:
        raise InvalidStatusError(status_val)


def is_terminal_status(status_val: Union[str, CycloneStatus]) -> bool:
    """Check if the given status is a terminal state."""
    normalized = normalize_status(status_val)
    return normalized in TERMINAL_STATUSES


def get_allowed_transitions(status_val: Union[str, CycloneStatus]) -> List[CycloneStatus]:
    """Return the sorted list of permitted next statuses from the given status."""
    normalized = normalize_status(status_val)
    return sorted(list(ALLOWED_TRANSITIONS.get(normalized, frozenset())), key=lambda s: s.value)


def can_transition(
    current_status: Union[str, CycloneStatus],
    new_status: Union[str, CycloneStatus],
    interlock_flags: Optional[List[str]] = None,
) -> bool:
    """
    Predicate returning True if transitioning from current_status to new_status is permitted.
    Returns False for any invalid status, invalid/skipped/backward transition, terminal origin,
    same-state transition, or active/unverified interlocks blocking EVAC_ORDERED.
    """
    try:
        validate_transition(current_status, new_status, interlock_flags=interlock_flags)
        return True
    except (CycloneStateError, ValueError):
        return False


def validate_transition(
    current_status: Union[str, CycloneStatus],
    new_status: Union[str, CycloneStatus],
    interlock_flags: Optional[List[str]] = None,
) -> CycloneStatus:
    """
    Validate and return the new CycloneStatus for a proposed transition.

    Enforces:
    1. Status validity: Both current and new status must be recognized members of CycloneStatus.
    2. Same-state rejection: current == new raises SameStateTransitionError.
    3. Terminal immutability: Transition from STAND_DOWN or RESOLVED raises TerminalStateError.
    4. Allowed transition graph: Disallowed jumps or backwards transitions raise InvalidStateTransitionError.
    5. Deterministic Safety Interlock (ARCHITECTURE §7 & §4.2):
       Transition to EVAC_ORDERED is permitted ONLY when interlock_flags is strictly an empty list ([]).
       If interlock_flags is None, not a list, or non-empty, InterlockBlockedError is raised.
       Interlock flags do not block unrelated transitions (e.g. MONITORING -> WARNING).

    Returns:
        The validated target CycloneStatus.
    """
    curr = normalize_status(current_status)
    nxt = normalize_status(new_status)

    # 1. Same-state check (explicitly rejected)
    if curr == nxt:
        raise SameStateTransitionError(curr)

    # 2. Terminal state check
    if curr in TERMINAL_STATUSES:
        raise TerminalStateError(current_status=curr, target_status=nxt)

    # 3. Transition graph validation
    allowed_next = ALLOWED_TRANSITIONS.get(curr, frozenset())
    if nxt not in allowed_next:
        raise InvalidStateTransitionError(current_status=curr, target_status=nxt)

    # 4. Critical Deterministic Safety Interlock for EVAC_ORDERED
    if nxt == CycloneStatus.EVAC_ORDERED:
        if interlock_flags is None:
            raise InterlockBlockedError(
                "Transition to EVAC_ORDERED is blocked: interlock_flags must be explicitly verified "
                "as an empty list ([]), but received None (unverified or missing interlock data).",
                interlock_flags=None,
            )
        if not isinstance(interlock_flags, list):
            raise InterlockBlockedError(
                f"Transition to EVAC_ORDERED is blocked: interlock_flags must be a list, "
                f"but received type {type(interlock_flags).__name__}.",
                interlock_flags=interlock_flags,
            )
        if len(interlock_flags) > 0:
            raise InterlockBlockedError(
                f"Transition to EVAC_ORDERED is blocked: active interlock flags present: {interlock_flags}.",
                interlock_flags=interlock_flags,
            )

    return nxt
