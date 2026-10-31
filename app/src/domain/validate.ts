/**
 * Event validation — SRS §8.1 + §10 safety rules.
 *
 * validateEvent() checks schema, size limits, signature, and timestamp sanity.
 * Returns { valid: true } or { valid: false, reason: string }.
 */

import type { MeshEvent, EventKind } from './types';
import {
  EVENT_KINDS,
  MAX_TEXT_LENGTH,
  MAX_FUTURE_DRIFT_MS,
  MAX_EVENT_SIZE_BYTES,
  CANONICAL_FIELD_ORDER,
} from './types';
import { verifyEvent } from '../crypto/sign';

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validate a received MeshEvent.
 *
 * Checks (in order):
 * 1. Required fields present and correct types.
 * 2. Schema version supported.
 * 3. Kind is valid.
 * 4. Severity in range [1, 3].
 * 5. Text within MAX_TEXT_LENGTH.
 * 6. Serialized size within MAX_EVENT_SIZE_BYTES.
 * 7. Timestamp not too far in the future (anti-spoofing).
 * 8. Ed25519 signature is valid for canonical bytes + author pubkey.
 *
 * @param event   The event to validate.
 * @param nowMs   Current wall-clock time in ms (injectable for testing).
 */
export async function validateEvent(
  event: MeshEvent,
  nowMs?: number,
): Promise<ValidationResult> {
  const now = nowMs ?? Date.now();

  // 1. Required fields present
  for (const field of CANONICAL_FIELD_ORDER) {
    if (event[field] === undefined) {
      return { valid: false, reason: `Missing required field: ${field}` };
    }
  }
  if (event.sig === undefined || event.sig === null || event.sig === '') {
    return { valid: false, reason: 'Missing required field: sig' };
  }

  // Type checks on critical fields
  if (typeof event.id !== 'string' || event.id.length === 0) {
    return { valid: false, reason: 'id must be a non-empty string' };
  }
  if (typeof event.v !== 'number') {
    return { valid: false, reason: 'v must be a number' };
  }
  if (typeof event.lat !== 'number' || typeof event.lon !== 'number') {
    return { valid: false, reason: 'lat and lon must be numbers' };
  }
  if (typeof event.severity !== 'number') {
    return { valid: false, reason: 'severity must be a number' };
  }
  if (typeof event.text !== 'string') {
    return { valid: false, reason: 'text must be a string' };
  }
  if (typeof event.author !== 'string' || event.author.length === 0) {
    return { valid: false, reason: 'author must be a non-empty string' };
  }
  if (typeof event.sig !== 'string') {
    return { valid: false, reason: 'sig must be a string' };
  }
  if (typeof event.hlc !== 'string' || event.hlc.length === 0) {
    return { valid: false, reason: 'hlc must be a non-empty string' };
  }
  if (typeof event.device_time !== 'string' || event.device_time.length === 0) {
    return { valid: false, reason: 'device_time must be a non-empty ISO 8601 string' };
  }
  if (typeof event.ttl_hours !== 'number' || event.ttl_hours <= 0) {
    return { valid: false, reason: 'ttl_hours must be a positive number' };
  }

  // 2. Schema version
  if (event.v !== 1) {
    return { valid: false, reason: `Unsupported schema version: ${event.v}` };
  }

  // 3. Kind
  if (!EVENT_KINDS.includes(event.kind as EventKind)) {
    return { valid: false, reason: `Invalid event kind: ${event.kind}` };
  }

  // 4. Severity range
  if (event.severity < 1 || event.severity > 3) {
    return { valid: false, reason: `Severity must be 1-3, got: ${event.severity}` };
  }

  // 5. Text length
  if (event.text.length > MAX_TEXT_LENGTH) {
    return { valid: false, reason: `Text exceeds ${MAX_TEXT_LENGTH} characters` };
  }

  // 6. Serialized size
  const jsonBytes = new TextEncoder().encode(JSON.stringify(event));
  if (jsonBytes.length > MAX_EVENT_SIZE_BYTES) {
    return { valid: false, reason: `Event exceeds ${MAX_EVENT_SIZE_BYTES} bytes` };
  }

  // 7. Future timestamp check (HLC wall-clock component)
  const hlcParts = event.hlc.split(':');
  if (hlcParts.length !== 3) {
    return { valid: false, reason: 'Invalid HLC format (expected wall_ms:counter:node_id)' };
  }
  const hlcWallMs = parseInt(hlcParts[0], 10);
  if (isNaN(hlcWallMs)) {
    return { valid: false, reason: 'Invalid HLC wall_ms (not a number)' };
  }
  if (hlcWallMs > now + MAX_FUTURE_DRIFT_MS) {
    return {
      valid: false,
      reason: `Event timestamp is too far in the future (${hlcWallMs - now}ms ahead)`,
    };
  }

  // Also check device_time
  const deviceTimeMs = new Date(event.device_time).getTime();
  if (isNaN(deviceTimeMs)) {
    return { valid: false, reason: 'Invalid device_time (not a valid ISO date)' };
  }
  if (deviceTimeMs > now + MAX_FUTURE_DRIFT_MS) {
    return {
      valid: false,
      reason: `device_time is too far in the future (${deviceTimeMs - now}ms ahead)`,
    };
  }

  // 8. Signature verification
  const sigValid = await verifyEvent(event);
  if (!sigValid) {
    return { valid: false, reason: 'Invalid Ed25519 signature' };
  }

  return { valid: true };
}

