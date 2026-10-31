/**
 * Ed25519 key generation, signing, and verification using libsodium.
 *
 * All keys and signatures are hex-encoded strings for JSON portability.
 */

import sodium from 'libsodium-wrappers';

let _ready = false;

/** Ensure libsodium is initialized. Must be awaited before any crypto op. */
export async function ensureSodium(): Promise<void> {
  if (!_ready) {
    await sodium.ready;
    _ready = true;
  }
}

export interface KeyPair {
  /** Hex-encoded Ed25519 public key (32 bytes = 64 hex chars). */
  publicKey: string;
  /** Hex-encoded Ed25519 secret key (64 bytes = 128 hex chars). */
  secretKey: string;
}

/** Generate a new Ed25519 keypair. */
export async function generateKeyPair(): Promise<KeyPair> {
  await ensureSodium();
  const kp = sodium.crypto_sign_keypair();
  return {
    publicKey: sodium.to_hex(kp.publicKey),
    secretKey: sodium.to_hex(kp.privateKey),
  };
}

/**
 * Sign a message (Uint8Array) with a hex-encoded secret key.
 * Returns the hex-encoded detached signature.
 */
export async function sign(message: Uint8Array, secretKeyHex: string): Promise<string> {
  await ensureSodium();
  const sk = sodium.from_hex(secretKeyHex);
  const sig = sodium.crypto_sign_detached(message, sk);
  return sodium.to_hex(sig);
}

/**
 * Verify a detached signature.
 * Returns true if the signature is valid for the message and public key.
 */
export async function verify(
  message: Uint8Array,
  signatureHex: string,
  publicKeyHex: string,
): Promise<boolean> {
  await ensureSodium();
  try {
    const sig = sodium.from_hex(signatureHex);
    const pk = sodium.from_hex(publicKeyHex);
    return sodium.crypto_sign_verify_detached(sig, message, pk);
  } catch {
    return false;
  }
}

/** Hex-encode a Uint8Array. */
export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Decode a hex string to Uint8Array. */
export function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

