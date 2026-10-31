import sodium from 'libsodium-wrappers';
import type { MeshEvent } from '../domain/types';
import { canonicalBytes } from './canonical';
import { ensureSodium } from './keys';

/**
 * Embedded Government Public Keys (build-time trusted keys).
 * Matches mock-gov deterministic test keypair.
 */
export const GOV_ED25519_PK =
  'e28a8970753332bd72fef413e6b0b2ef1b4aadda7aa2c141f233712a6876b351';

export const GOV_CURVE25519_PK =
  '596ef330b2ed1d785e554e098ce301e7dbd6d45b6abf0fda479852019928ac1e';

/**
 * Encrypt private SOS payload (contact, medical notes, etc.) to the government public key
 * using an anonymous sealed box (crypto_box_seal).
 * Returns base64 encoded string.
 */
export async function encryptPrivateField(
  data: Record<string, unknown>,
  govCurvePkHex: string = GOV_CURVE25519_PK
): Promise<string> {
  await ensureSodium();
  const plainBytes = new TextEncoder().encode(JSON.stringify(data));
  const pubKeyBytes = sodium.from_hex(govCurvePkHex);
  const cipherBytes = sodium.crypto_box_seal(plainBytes, pubKeyBytes);
  return sodium.to_base64(cipherBytes);
}

/**
 * Verify that an event (e.g. SOS_ACK or OFFICIAL) is signed with the trusted
 * government Ed25519 public key.
 */
export async function verifyGovSignature(
  event: MeshEvent,
  expectedGovPkHex: string = GOV_ED25519_PK
): Promise<boolean> {
  await ensureSodium();
  if (!event || !event.sig || !event.author) return false;

  // The author must match the trusted government key
  if (event.author.toLowerCase() !== expectedGovPkHex.toLowerCase()) {
    return false;
  }

  try {
    const bytes = canonicalBytes(event);
    const sigBytes = sodium.from_hex(event.sig);
    const pkBytes = sodium.from_hex(event.author);
    return sodium.crypto_sign_verify_detached(sigBytes, bytes, pkBytes);
  } catch (err) {
    console.error('[GovCrypto] Signature verification failed:', err);
    return false;
  }
}

