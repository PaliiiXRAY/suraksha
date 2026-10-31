/**
 * Sign and verify MeshMap events.
 *
 * Combines canonical serialization with Ed25519 signatures.
 */

import type { MeshEvent } from '../domain/types';
import { canonicalBytes } from './canonical';
import { sign as signBytes, verify as verifyBytes } from './keys';

/**
 * Sign an event: compute canonical bytes, sign with the secret key,
 * and return a new event with the `sig` field populated.
 */
export async function signEvent(event: Omit<MeshEvent, 'sig'>, secretKeyHex: string): Promise<MeshEvent> {
  const bytes = canonicalBytes(event as MeshEvent);
  const sig = await signBytes(bytes, secretKeyHex);
  return { ...event, sig };
}

/**
 * Verify that an event's signature is valid for its canonical bytes
 * and the public key in the `author` field.
 */
export async function verifyEvent(event: MeshEvent): Promise<boolean> {
  if (!event.sig) return false;
  const bytes = canonicalBytes(event);
  return verifyBytes(bytes, event.sig, event.author);
}

