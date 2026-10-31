/**
 * Vitest tests for the MeshMap event domain + crypto layer.
 *
 * Covers:
 * - Valid event passes validation
 * - Tampered text fails signature check
 * - Wrong signature (different keypair) fails
 * - Far-future HLC timestamp is rejected
 * - HLC stays ordered when a peer's clock is days ahead
 * - Test vectors from /protocol/test-vectors.json
 */

import { describe, it, expect, beforeAll } from 'vitest';
import type { MeshEvent } from './types';
import { EVENT_KINDS, MAX_FUTURE_DRIFT_MS } from './types';
import { HLC } from './hlc';
import { validateEvent } from './validate';
import { ensureSodium, generateKeyPair } from '../crypto/keys';
import { signEvent, verifyEvent } from '../crypto/sign';
import { canonicalJson } from '../crypto/canonical';
import testVectors from '../../../protocol/test-vectors.json';

/** Helper: build a valid unsigned event for testing. */
function makeUnsignedEvent(
  pubKeyHex: string,
  hlcStr: string,
  overrides?: Partial<Omit<MeshEvent, 'sig'>>,
): Omit<MeshEvent, 'sig'> {
  return {
    id: '01JBXYZ1234567890ABCDEF',
    v: 1,
    kind: 'HAZARD',
    type: 'flooding',
    feature_id: 'w8r4g5h6j',
    ref: null,
    lat: 20.2961,
    lon: 85.8245,
    severity: 2,
    text: 'Knee-deep water on MG Road',
    qty: null,
    hlc: hlcStr,
    device_time: new Date().toISOString(),
    author: pubKeyHex,
    ttl_hours: 24,
    ...overrides,
  };
}

describe('MeshEvent crypto + validation', () => {
  beforeAll(async () => {
    await ensureSodium();
  });

  // ─── Valid event passes ───────────────────────────────────
  it('valid signed event passes validateEvent()', async () => {
    const kp = await generateKeyPair();
    const hlc = new HLC(kp.publicKey.slice(0, 8));
    const hlcStr = hlc.tick();
    const unsigned = makeUnsignedEvent(kp.publicKey, hlcStr);
    const signed = await signEvent(unsigned, kp.secretKey);

    const result = await validateEvent(signed);
    expect(result).toEqual({ valid: true });
  });

  // ─── Tampered text fails ──────────────────────────────────
  it('tampered text causes signature verification to fail', async () => {
    const kp = await generateKeyPair();
    const hlc = new HLC(kp.publicKey.slice(0, 8));
    const hlcStr = hlc.tick();
    const unsigned = makeUnsignedEvent(kp.publicKey, hlcStr);
    const signed = await signEvent(unsigned, kp.secretKey);

    // Tamper with the text AFTER signing
    const tampered: MeshEvent = { ...signed, text: 'TAMPERED CONTENT' };

    const result = await validateEvent(tampered);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Invalid Ed25519 signature');
  });

  // ─── Wrong signature (different keypair) ──────────────────
  it('wrong keypair signature fails verification', async () => {
    const kpAuthor = await generateKeyPair();
    const kpImposter = await generateKeyPair();
    const hlc = new HLC(kpAuthor.publicKey.slice(0, 8));
    const hlcStr = hlc.tick();
    const unsigned = makeUnsignedEvent(kpAuthor.publicKey, hlcStr);

    // Sign with the IMPOSTER's key
    const signedByImposter = await signEvent(unsigned, kpImposter.secretKey);

    const result = await validateEvent(signedByImposter);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Invalid Ed25519 signature');
  });

  // ─── Far-future timestamp is rejected ─────────────────────
  it('rejects event with HLC timestamp too far in the future', async () => {
    const kp = await generateKeyPair();
    const now = Date.now();
    // Set HLC wall clock 10 minutes in the future (> MAX_FUTURE_DRIFT_MS = 5 min)
    const futureMs = now + 10 * 60 * 1000;
    const hlc = new HLC(kp.publicKey.slice(0, 8), futureMs);
    const hlcStr = hlc.tick(futureMs);
    const unsigned = makeUnsignedEvent(kp.publicKey, hlcStr, {
      device_time: new Date(futureMs).toISOString(),
    });
    const signed = await signEvent(unsigned, kp.secretKey);

    const result = await validateEvent(signed, now);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('too far in the future');
  });

  // ─── Timestamp exactly at boundary passes ─────────────────
  it('accepts event with HLC timestamp exactly at the drift limit', async () => {
    const kp = await generateKeyPair();
    const now = Date.now();
    const atLimitMs = now + MAX_FUTURE_DRIFT_MS; // exactly at boundary
    const hlc = new HLC(kp.publicKey.slice(0, 8), atLimitMs);
    const hlcStr = hlc.tick(atLimitMs);
    const unsigned = makeUnsignedEvent(kp.publicKey, hlcStr, {
      device_time: new Date(atLimitMs).toISOString(),
    });
    const signed = await signEvent(unsigned, kp.secretKey);

    const result = await validateEvent(signed, now);
    expect(result).toEqual({ valid: true });
  });
});

describe('HLC ordering', () => {
  // ─── HLC stays ordered when peer clock is days ahead ──────
  it('HLC stays ordered even when a peer clock is 3 days ahead', () => {
    const now = Date.now();
    const localHlc = new HLC('local000', now);

    // Local ticks once
    const t1 = localHlc.tick(now);

    // Peer is 3 days (259200000 ms) ahead
    const peerFutureMs = now + 3 * 24 * 60 * 60 * 1000;
    const peerHlc = new HLC('peer0000', peerFutureMs);
    const peerTick = peerHlc.tick(peerFutureMs);

    // Local receives the far-future peer tick
    const t2 = localHlc.receive(peerTick, now);

    // t2 must be > t1 (local advanced past old value)
    expect(HLC.compare(t2, t1)).toBeGreaterThan(0);

    // t2 must be > peerTick (receiving must produce strictly greater)
    expect(HLC.compare(t2, peerTick)).toBeGreaterThan(0);

    // Subsequent local tick (still at "now") must be > t2
    const t3 = localHlc.tick(now);
    expect(HLC.compare(t3, t2)).toBeGreaterThan(0);

    // The wall_ms of t2 and t3 should be the peer's future time (adopted)
    expect(HLC.wallMs(t2)).toBe(peerFutureMs);
    expect(HLC.wallMs(t3)).toBe(peerFutureMs);

    // When local clock catches up past the peer (simulate time passing)
    const futureNow = peerFutureMs + 1000;
    const t4 = localHlc.tick(futureNow);
    expect(HLC.compare(t4, t3)).toBeGreaterThan(0);
    // Now wall_ms should advance to real time
    expect(HLC.wallMs(t4)).toBe(futureNow);
  });

  it('monotonically increasing ticks even with static clock', () => {
    const frozen = 1700000000000;
    const hlc = new HLC('node0001', frozen);

    const ticks: string[] = [];
    for (let i = 0; i < 100; i++) {
      ticks.push(hlc.tick(frozen));
    }

    // Every tick must be strictly greater than the previous
    for (let i = 1; i < ticks.length; i++) {
      expect(HLC.compare(ticks[i], ticks[i - 1])).toBeGreaterThan(0);
    }
  });
});

describe('Test vectors (protocol/test-vectors.json)', () => {
  beforeAll(async () => {
    await ensureSodium();
  });

  it('has 3 test vectors', () => {
    expect(testVectors.vectors).toHaveLength(3);
  });

  for (const vec of testVectors.vectors) {
    it(`vector "${vec.description}" verifies correctly`, async () => {
      const event = vec.event as MeshEvent;
      const isValid = await verifyEvent(event);
      expect(isValid).toBe(vec.expected_valid);
    });

    it(`vector "${vec.description}" has deterministic canonical JSON`, () => {
      const event = vec.event as MeshEvent;
      const json = canonicalJson(event);
      expect(json).toBe(vec.canonical_json);
    });
  }
});

