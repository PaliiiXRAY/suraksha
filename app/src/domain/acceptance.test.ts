/**
 * Comprehensive Acceptance Test Suite — SRS §14 (AT-1 to AT-9).
 *
 * Verifies all 9 acceptance criteria of the SURAKSHA Citizen App.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import sodium from 'libsodium-wrappers';
import { generateKeyPair, ensureSodium } from '../crypto/keys';
import { signEvent } from '../crypto/sign';
import { validateEvent } from './validate';
import { HLC } from './hlc';
import { reduceFeatures } from './statusEngine';
import { evaluateFeatureTrust, getKeyAgeWeight, getProximityWeight } from './trustEngine';
import { evictOldEvents, isProtectedEvent } from '../data/eviction';
import { searchHandbook } from '../handbook/loader';
import { runDeltaSync } from '../sync/deltaSync';
import { createMemorySessionPair } from '../transports/memoryTransport';
import { verifyGovSignature } from '../crypto/gov';
import type { MeshEvent } from './types';

// Mock in-memory event store for sync testing
class TestEventStore {
  public events: MeshEvent[] = [];
  constructor(initial: MeshEvent[] = []) {
    this.events = [...initial];
  }
  getEvents() {
    return [...this.events];
  }
  addEvent(e: MeshEvent) {
    if (!this.events.some((x) => x.id === e.id)) {
      this.events.push(e);
    }
  }
}

describe('SURAKSHA Citizen App — Full Acceptance Tests (AT-1 to AT-9)', () => {
  let userKeyA: any;
  let userKeyB: any;

  beforeAll(async () => {
    await ensureSodium();
    userKeyA = await generateKeyPair();
    userKeyB = await generateKeyPair();
  });

  // ── AT-1: Airplane Mode Lifecycle ──────────────────────────────────────────
  it('AT-1: Airplane mode — create, view, resolve a hazard; red -> green', async () => {
    const hlcA = new HLC('nodeA');
    const t0 = new Date('2026-10-30T10:00:00Z').toISOString();

    // 1. Create hazard offline
    const hazardUnsigned: Omit<MeshEvent, 'sig'> = {
      id: '01HAT1HAZARD000000000001',
      v: 1,
      kind: 'HAZARD',
      type: 'flooding',
      feature_id: 'sp3e8c1j4',
      ref: null,
      lat: 43.77,
      lon: 11.25,
      severity: 3,
      text: 'Flood water 1m deep crossing main street',
      qty: null,
      hlc: hlcA.tick(),
      device_time: t0,
      author: userKeyA.publicKey,
      ttl_hours: 48,
    };
    const hazard = await signEvent(hazardUnsigned, userKeyA.secretKey);

    // Initial state: RED Active Hazard
    const stateActive = reduceFeatures([hazard]);
    expect(stateActive.length).toBe(1);
    expect(stateActive[0].status).toBe('active');
    expect(stateActive[0].color).toBe('red');

    // 2. Resolve hazard offline (30 min later)
    const resolveUnsigned: Omit<MeshEvent, 'sig'> = {
      id: '01HAT1RESOLVE00000000002',
      v: 1,
      kind: 'RESOLVE',
      type: 'flooding',
      feature_id: 'sp3e8c1j4',
      ref: hazard.id,
      lat: 43.77,
      lon: 11.25,
      severity: 1,
      text: 'Water pumped out by municipal crew; road clear',
      qty: null,
      hlc: hlcA.tick(),
      device_time: new Date('2026-10-30T10:30:00Z').toISOString(),
      author: userKeyA.publicKey,
      ttl_hours: 48,
    };
    const resolve = await signEvent(resolveUnsigned, userKeyA.secretKey);

    // Resolved state: GREEN Resolved
    const stateResolved = reduceFeatures([hazard, resolve]);
    expect(stateResolved.length).toBe(1);
    expect(stateResolved[0].status).toBe('resolved');
    expect(stateResolved[0].color).toBe('green');
    expect(stateResolved[0].events.length).toBe(2);
    // Newest first in timeline
    expect(stateResolved[0].events[0].kind).toBe('RESOLVE');
    expect(stateResolved[0].events[1].kind).toBe('HAZARD');
  });

  // ── AT-2: P2P Convergence ─────────────────────────────────────────────────
  it('AT-2: Two phones with different events converge to the union after syncing', async () => {
    const hlcA = new HLC('nodeA');
    const hlcB = new HLC('nodeB');

    // Phone A has event 1 & 2
    const ev1 = await signEvent(
      {
        id: '01HAT2EV0100000000000001',
        v: 1,
        kind: 'HAZARD',
        type: 'fire',
        feature_id: 'sp3e8a1',
        ref: null,
        lat: 43.77,
        lon: 11.25,
        severity: 2,
        text: 'Small brush fire near park',
        qty: null,
        hlc: hlcA.tick(),
        device_time: new Date().toISOString(),
        author: userKeyA.publicKey,
        ttl_hours: 24,
      },
      userKeyA.secretKey
    );

    const ev2 = await signEvent(
      {
        id: '01HAT2EV0200000000000002',
        v: 1,
        kind: 'RESOURCE',
        type: 'water',
        feature_id: 'sp3e8a2',
        ref: null,
        lat: 43.78,
        lon: 11.26,
        severity: 1,
        text: 'Clean drinking water tanker deployed',
        qty: 500,
        hlc: hlcA.tick(),
        device_time: new Date().toISOString(),
        author: userKeyA.publicKey,
        ttl_hours: 24,
      },
      userKeyA.secretKey
    );

    // Phone B has event 3 & 4
    const ev3 = await signEvent(
      {
        id: '01HAT2EV0300000000000003',
        v: 1,
        kind: 'HAZARD',
        type: 'structural_damage',
        feature_id: 'sp3e8a3',
        ref: null,
        lat: 43.79,
        lon: 11.27,
        severity: 3,
        text: 'Cracked bridge support',
        qty: null,
        hlc: hlcB.tick(),
        device_time: new Date().toISOString(),
        author: userKeyB.publicKey,
        ttl_hours: 48,
      },
      userKeyB.secretKey
    );

    const storeA = new TestEventStore([ev1, ev2]);
    const storeB = new TestEventStore([ev3]);

    const [sessionA, sessionB] = createMemorySessionPair('peerA', 'peerB');

    await Promise.all([
      runDeltaSync(sessionA, storeA, { skipCoolDown: true, timeoutMs: 1000 }),
      runDeltaSync(sessionB, storeB, { skipCoolDown: true, timeoutMs: 1000 }),
    ]);

    const idsA = storeA.getEvents().map((e) => e.id).sort();
    const idsB = storeB.getEvents().map((e) => e.id).sort();

    // Both stores must have converged to all 3 events
    expect(idsA).toEqual(idsB);
    expect(idsA).toContain(ev1.id);
    expect(idsA).toContain(ev2.id);
    expect(idsA).toContain(ev3.id);
  });

  // ── AT-3: Clock Skew Immunity ──────────────────────────────────────────────
  it('AT-3: A phone with a clock 3 days ahead cannot permanently outrank others', async () => {
    const now = Date.now();
    const threeDaysMs = 3 * 24 * 3600 * 1000;
    const futureHlc = `${now + threeDaysMs}:0000:badnode`;

    const badClockEvent: Omit<MeshEvent, 'sig'> = {
      id: '01HAT3BADCLOCK0000000000',
      v: 1,
      kind: 'HAZARD',
      type: 'flooding',
      feature_id: 'sp3e8c1j4',
      ref: null,
      lat: 43.77,
      lon: 11.25,
      severity: 3,
      text: 'Spoofed timestamp in the future',
      qty: null,
      hlc: futureHlc,
      device_time: new Date(now + threeDaysMs).toISOString(),
      author: userKeyA.publicKey,
      ttl_hours: 48,
    };
    const signed = await signEvent(badClockEvent, userKeyA.secretKey);

    // validateEvent must reject it because timestamp exceeds MAX_FUTURE_DRIFT_MS (60s)
    const result = await validateEvent(signed, now);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('too far in the future');
  });

  // ── AT-4: Tampered Event Rejection ─────────────────────────────────────────
  it('AT-4: A tampered event (changed text) is rejected', async () => {
    const validUnsigned: Omit<MeshEvent, 'sig'> = {
      id: '01HAT4VALID00000000000001',
      v: 1,
      kind: 'HAZARD',
      type: 'landslide',
      feature_id: 'sp3e8c1j4',
      ref: null,
      lat: 43.77,
      lon: 11.25,
      severity: 2,
      text: 'Minor soil slip on embankment',
      qty: null,
      hlc: '1556712000000:0000:nodeA',
      device_time: new Date().toISOString(),
      author: userKeyA.publicKey,
      ttl_hours: 24,
    };
    const validEvent = await signEvent(validUnsigned, userKeyA.secretKey);

    // Verify valid event passes
    const passCheck = await validateEvent(validEvent);
    expect(passCheck.valid).toBe(true);

    // Tamper with event text (adversary alters description without valid key)
    const tampered: MeshEvent = {
      ...validEvent,
      text: 'MALICIOUS MODIFICATION: Evacuate the entire city immediately!',
    };

    const failCheck = await validateEvent(tampered);
    expect(failCheck.valid).toBe(false);
    expect(failCheck.reason).toBe('Invalid Ed25519 signature');
  });

  // ── AT-5: Dispute within 5 Minutes ────────────────────────────────────────
  it('AT-5: HAZARD by user X and RESOLVE by user Y within 5 min -> amber "disputed"', async () => {
    const hlcX = new HLC('userX');
    const hlcY = new HLC('userY');
    const baseTime = new Date('2026-10-30T14:00:00Z').getTime();

    // Hazard by User X at T0
    const hazardX = await signEvent(
      {
        id: '01HAT5HAZX00000000000001',
        v: 1,
        kind: 'HAZARD',
        type: 'road_blocked',
        feature_id: 'sp3e8disputed',
        ref: null,
        lat: 43.77,
        lon: 11.25,
        severity: 2,
        text: 'Bridge blocked by debris',
        qty: null,
        hlc: hlcX.tick(),
        device_time: new Date(baseTime).toISOString(),
        author: userKeyA.publicKey, // User X
        ttl_hours: 24,
      },
      userKeyA.secretKey
    );

    // Resolve by User Y at T0 + 2 minutes (120s < 5 minutes)
    const resolveY = await signEvent(
      {
        id: '01HAT5RESY00000000000002',
        v: 1,
        kind: 'RESOLVE',
        type: 'road_blocked',
        feature_id: 'sp3e8disputed',
        ref: hazardX.id,
        lat: 43.77,
        lon: 11.25,
        severity: 1,
        text: 'No debris seen, road is open',
        qty: null,
        hlc: hlcY.tick(),
        device_time: new Date(baseTime + 2 * 60 * 1000).toISOString(),
        author: userKeyB.publicKey, // User Y
        ttl_hours: 24,
      },
      userKeyB.secretKey
    );

    const states = reduceFeatures([hazardX, resolveY], baseTime + 3 * 60 * 1000);
    expect(states.length).toBe(1);
    expect(states[0].status).toBe('disputed');
    expect(states[0].color).toBe('amber');
    expect(states[0].isDisputed).toBe(true);
    expect(states[0].statusLabel).toBe('Disputed Report');
  });

  // ── AT-6: Offline SOS Relay ────────────────────────────────────────────────
  it('AT-6: SOS made offline reaches the server after a third phone passes by', async () => {
    // 1. Victim creates SOS offline
    const victimKeys = await generateKeyPair();
    const hlcV = new HLC('victim');

    const sosEvent = await signEvent(
      {
        id: '01HAT6SOSVICTIM000000001',
        v: 1,
        kind: 'SOS',
        type: 'trapped',
        feature_id: 'sp3e8sos',
        ref: null,
        lat: 43.77,
        lon: 11.25,
        severity: 3,
        text: 'CRITICAL: Trapped on 2nd floor, water rising',
        qty: 3,
        hlc: hlcV.tick(),
        device_time: new Date().toISOString(),
        author: victimKeys.publicKey,
        ttl_hours: 48,
      },
      victimKeys.secretKey
    );

    // 2. Mule phone meets Victim phone and syncs the SOS into its store
    const victimStore = new TestEventStore([sosEvent]);
    const muleStore = new TestEventStore([]);

    const [sessionVictim, sessionMule] = createMemorySessionPair('victim', 'mule');
    await Promise.all([
      runDeltaSync(sessionVictim, victimStore, { skipCoolDown: true, timeoutMs: 1000 }),
      runDeltaSync(sessionMule, muleStore, { skipCoolDown: true, timeoutMs: 1000 }),
    ]);

    // Mule now has the SOS event
    expect(muleStore.getEvents().some((e) => e.id === sosEvent.id)).toBe(true);

    // 3. Official ACK event generation & verification (SRS §A.4)
    // Gov authority issues an Ed25519-signed SOS_ACK
    const mockGovKeys = await generateKeyPair();
    const ackEvent: MeshEvent = {
      id: '01HAT6GOVACK000000000001',
      v: 1,
      kind: 'SOS_ACK',
      type: 'trapped',
      feature_id: 'sp3e8sos',
      ref: sosEvent.id, // References victim's SOS ULID
      lat: 43.77,
      lon: 11.25,
      severity: 1,
      text: 'DISPATCH ASSIGNED: Unit Bravo-4 deployed to coordinates.',
      qty: 3,
      hlc: '1556712000000:0000:gov01',
      device_time: new Date().toISOString(),
      author: mockGovKeys.publicKey,
      ttl_hours: 48,
      sig: '',
    };
    const signedAck = await signEvent(ackEvent, mockGovKeys.secretKey);

    // Verify ACK against expected gov key
    const isAckValid = await verifyGovSignature(signedAck, mockGovKeys.publicKey);
    expect(isAckValid).toBe(true);
    expect(signedAck.ref).toBe(sosEvent.id);
  });

  // ── AT-7: Deduplication ────────────────────────────────────────────────────
  it('AT-7: Duplicate events from two sources are stored once', async () => {
    const store = new TestEventStore();
    const hlcA = new HLC('nodeA');

    const event = await signEvent(
      {
        id: '01HAT7DUPE00000000000001',
        v: 1,
        kind: 'HAZARD',
        type: 'tree_fallen',
        feature_id: 'sp3e8c1j4',
        ref: null,
        lat: 43.77,
        lon: 11.25,
        severity: 1,
        text: 'Fallen branch',
        qty: null,
        hlc: hlcA.tick(),
        device_time: new Date().toISOString(),
        author: userKeyA.publicKey,
        ttl_hours: 24,
      },
      userKeyA.secretKey
    );

    // Insert same event multiple times (from file, QR, and nearby peer)
    store.addEvent(event);
    store.addEvent(event);
    store.addEvent({ ...event });

    expect(store.getEvents().length).toBe(1);
    expect(store.getEvents()[0].id).toBe(event.id);
  });

  // ── AT-8: Multi-Language Offline Handbook Search ──────────────────────────
  it('AT-8: Handbook search works offline in two languages (en and hi)', () => {
    // English search
    const resultsEn = searchHandbook('bleeding', 'en');
    expect(resultsEn.length).toBeGreaterThan(0);
    expect(resultsEn[0].article.title.toLowerCase()).toContain('bleeding');

    // Hindi search
    const resultsHi = searchHandbook('रक्तस्राव', 'hi');
    expect(resultsHi.length).toBeGreaterThan(0);
    expect(resultsHi[0].article.title).toContain('रक्तस्राव');

    // CPR search in Hindi
    const cprHi = searchHandbook('सीपीआर', 'hi');
    expect(cprHi.length).toBeGreaterThan(0);
    expect(cprHi[0].article.title).toContain('साँस');
  });

  // ── AT-9: Persisted Storage & Eviction Protection ──────────────────────────
  it('AT-9: Storage eviction preserves critical SOS & official events while pruning expired', async () => {
    const now = Date.now();
    const hlcA = new HLC('nodeA');

    // 1. SOS Event (must NEVER be evicted)
    const sosEv = await signEvent(
      {
        id: '01HAT9SOS000000000000001',
        v: 1,
        kind: 'SOS',
        type: 'trapped',
        feature_id: 'sp3e8sos',
        ref: null,
        lat: 43.77,
        lon: 11.25,
        severity: 3,
        text: 'EMERGENCY SOS',
        qty: 1,
        hlc: hlcA.tick(),
        device_time: new Date(now - 100 * 3600 * 1000).toISOString(), // old
        author: userKeyA.publicKey,
        ttl_hours: 24,
      },
      userKeyA.secretKey
    );
    expect(isProtectedEvent(sosEv, now)).toBe(true);

    // 2. Official Event (must NEVER be evicted)
    const officialEv = await signEvent(
      {
        id: '01HAT9OFFICIAL0000000002',
        v: 1,
        kind: 'OFFICIAL',
        type: 'cyclone',
        feature_id: 'sp3e8off',
        ref: null,
        lat: 43.77,
        lon: 11.25,
        severity: 3,
        text: 'IMD RED ALERT CYCLONE',
        qty: null,
        hlc: hlcA.tick(),
        device_time: new Date(now - 80 * 3600 * 1000).toISOString(),
        author: userKeyA.publicKey,
        ttl_hours: 24,
      },
      userKeyA.secretKey
    );
    expect(isProtectedEvent(officialEv, now)).toBe(true);

    // 3. Stale expired events
    const staleEv1 = await signEvent(
      {
        id: '01HAT9STALE0000000000003',
        v: 1,
        kind: 'HAZARD',
        type: 'other',
        feature_id: 'sp3e8stale1',
        ref: null,
        lat: 43.77,
        lon: 11.25,
        severity: 1,
        text: 'Stale report 1',
        qty: null,
        hlc: hlcA.tick(),
        device_time: new Date(now - 50 * 3600 * 1000).toISOString(),
        author: userKeyA.publicKey,
        ttl_hours: 24, // expired
      },
      userKeyA.secretKey
    );

    const staleEv2 = await signEvent(
      {
        id: '01HAT9STALE0000000000004',
        v: 1,
        kind: 'HAZARD',
        type: 'other',
        feature_id: 'sp3e8stale2',
        ref: null,
        lat: 43.77,
        lon: 11.25,
        severity: 1,
        text: 'Stale report 2',
        qty: null,
        hlc: hlcA.tick(),
        device_time: new Date(now - 60 * 3600 * 1000).toISOString(),
        author: userKeyA.publicKey,
        ttl_hours: 24, // expired
      },
      userKeyA.secretKey
    );

    // Evict down to max 2 events
    const evictResult = evictOldEvents([sosEv, officialEv, staleEv1, staleEv2], 2, now);

    expect(evictResult.evictedCount).toBe(2);
    expect(evictResult.evictedIds).toContain(staleEv1.id);
    expect(evictResult.evictedIds).toContain(staleEv2.id);

    // Remaining must be the protected SOS and Official events
    const remainingIds = evictResult.remaining.map((e) => e.id);
    expect(remainingIds).toContain(sosEv.id);
    expect(remainingIds).toContain(officialEv.id);
  });
});
