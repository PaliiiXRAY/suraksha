/**
 * Canonical serialization for MeshMap events.
 *
 * Fields are serialized in the fixed order defined in types.ts (CANONICAL_FIELD_ORDER).
 * This produces deterministic bytes so the same event always yields the same signature,
 * regardless of JS object key order.
 *
 * Wire format: UTF-8 JSON array of values in canonical order (no `sig`).
 * This is compact, deterministic, and easy to verify in any language.
 */

import type { MeshEvent } from '../domain/types';
import { CANONICAL_FIELD_ORDER } from '../domain/types';

/**
 * Produce the canonical byte representation of an event for signing/verification.
 * Returns a Uint8Array of UTF-8 encoded JSON.
 */
export function canonicalBytes(event: MeshEvent): Uint8Array {
  const values: unknown[] = [];
  for (const field of CANONICAL_FIELD_ORDER) {
    values.push(event[field]);
  }
  const json = JSON.stringify(values);
  return new TextEncoder().encode(json);
}

/**
 * Produce the canonical JSON string (useful for debugging / test vectors).
 */
export function canonicalJson(event: MeshEvent): string {
  const values: unknown[] = [];
  for (const field of CANONICAL_FIELD_ORDER) {
    values.push(event[field]);
  }
  return JSON.stringify(values);
}

