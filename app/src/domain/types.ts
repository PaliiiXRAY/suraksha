/**
 * MeshMap Event types — SRS §8.1.
 *
 * This is the shared contract with the government team (Appendix A).
 * DO NOT change field names, types, or order without coordinating with gov team.
 */

/** All valid event kinds. */
export const EVENT_KINDS = [
  'HAZARD',
  'RESOURCE',
  'RESOLVE',
  'CONFIRM',
  'DISPUTE',
  'CLOSE',
  'SOS',
  'SOS_CANCEL',
  'OFFICIAL',
  'SOS_ACK',
] as const;

export type EventKind = (typeof EVENT_KINDS)[number];

/** Report sub-types (extensible). */
export const EVENT_TYPES = [
  // Hazards
  'road_blocked',
  'tree_fallen',
  'bridge_damaged',
  'flooding',
  'fire',
  'power_line_down',
  'landslide',
  'building_collapse',
  'gas_leak',
  // Resources
  'shelter',
  'food',
  'water',
  'medical_aid',
  'charging_point',
  'fuel',
  // General
  'other',
] as const;

export type EventType = (typeof EVENT_TYPES)[number] | string;

/**
 * The canonical MeshMap Event — the only thing that spreads between phones.
 *
 * Fields are listed in the exact canonical signing order (see canonical.ts).
 * The `sig` field is excluded from signing.
 */
export interface MeshEvent {
  /** ULID — unique, generated on device. */
  id: string;
  /** Schema version — frozen per version. Currently 1. */
  v: number;
  /** What this event represents. */
  kind: EventKind;
  /** Sub-type of the report (e.g. 'tree_fallen', 'shelter'). */
  type: EventType;
  /** Geohash9 feature ID this event attaches to. */
  feature_id: string;
  /** Reference to another event ID (e.g. for CONFIRM/RESOLVE). null if none. */
  ref: string | null;
  /** Latitude (WGS84). */
  lat: number;
  /** Longitude (WGS84). */
  lon: number;
  /** Severity 1-3 (1=low, 3=critical). */
  severity: number;
  /** Short description, max 280 characters. */
  text: string;
  /** Optional quantity or capacity. null if not applicable. */
  qty: number | null;
  /** Hybrid Logical Clock string (wall_ms:counter:node_id). */
  hlc: string;
  /** Device wall-clock time when event was created (ISO 8601 UTC). */
  device_time: string;
  /** Author's Ed25519 public key (hex-encoded). */
  author: string;
  /** Time-to-live in hours from device_time. */
  ttl_hours: number;
  /** Ed25519 signature over canonical bytes (hex-encoded). */
  sig: string;
}

/**
 * Canonical field order for signing and serialization.
 * This MUST match the order used by both citizen app and government backend.
 * The `sig` field is always excluded from the signed payload.
 */
export const CANONICAL_FIELD_ORDER: readonly (keyof Omit<MeshEvent, 'sig'>)[] = [
  'id',
  'v',
  'kind',
  'type',
  'feature_id',
  'ref',
  'lat',
  'lon',
  'severity',
  'text',
  'qty',
  'hlc',
  'device_time',
  'author',
  'ttl_hours',
] as const;

/** Maximum text length (FR-7). */
export const MAX_TEXT_LENGTH = 280;

/** Maximum allowed clock drift for incoming events (milliseconds). */
export const MAX_FUTURE_DRIFT_MS = 5 * 60 * 1000; // 5 minutes

/** Maximum event payload size in bytes (wire limit). */
export const MAX_EVENT_SIZE_BYTES = 8192;

