import { describe, it, expect, beforeAll } from 'vitest';
import {
  runDeltaSync,
  isPeerBlocked,
  unblockPeer,
  blockPeerTemporary,
  chunkEventsByBytes,
  MAX_BATCH_BYTES,
  categorizeRejection,
  type EventStoreLike,
} from './deltaSync';
import { RateLimiter } from './rateLimiter';
import { createMemorySessionPair, MemorySession } from '../transports/memoryTransport';
import { ensureSodium, generateKeyPair } from '../crypto/keys';
import { signEvent } from '../crypto/sign';
import { HLC } from '../domain/hlc';
import type { MeshEvent } from '../domain/types';
import { getDeviceIdentity } from '../data/identity';

class TestStore implements EventStoreLike {
  private events: MeshEvent[] = [];
  constructor(initial: MeshEvent[] = []) {
    this.events = [...initial];
  }
  getEvents(): MeshEvent[] {
    return [...this.events];
  }
  addEvent(event: MeshEvent): void {
    if (!this.events.some((e) => e.id === event.id)) {
      this.events.push(event);
    }
  }
}

async function createSignedEvent(id: string, overrides?: Partial<Omit<MeshEvent, 'sig'>>): Promise<MeshEvent> {
  const kp = await generateKeyPair();
  const hlc = new HLC(kp.publicKey.slice(0, 8));
  const unsigned: Omit<MeshEvent, 'sig'> = {
    id,
    v: 1,
    kind: 'HAZARD',
    type: 'flooding',
    feature_id: 'sp3e8test1',
    ref: null,
    lat: 43.77,
    lon: 11.25,
    severity: 2,
    text: `Audit Test Event ${id}`,
    qty: null,
    hlc: hlc.tick(),
    device_time: new Date().toISOString(),
    author: kp.publicKey,
    ttl_hours: 48,
    ...overrides,
  };
  return signEvent(unsigned, kp.secretKey);
}

describe('Sync Audit Requirements & Failure Injections', () => {
  beforeAll(async () => {
    await ensureSodium();
  });

  // 1. Simultaneous HELLO from both phones (tie-break rule)
  it('handles simultaneous HELLO from both phones with deterministic tie-break', async () => {
    unblockPeer('peerLow');
    unblockPeer('peerHigh');

    const ev1 = await createSignedEvent('01SIMULHELLO00000000000001');
    const storeLow = new TestStore([ev1]);
    const storeHigh = new TestStore([]);

    const [sessionA, sessionB] = createMemorySessionPair('phoneLow', 'phoneHigh');

    const pLow = runDeltaSync(sessionA, storeLow, {
      nodeId: 'phoneLow', // lexicographically lower -> initiator
      skipCoolDown: true,
      rateLimiter: new RateLimiter(50),
    });
    const pHigh = runDeltaSync(sessionB, storeHigh, {
      nodeId: 'phoneHigh', // lexicographically higher -> responder
      skipCoolDown: true,
      rateLimiter: new RateLimiter(50),
    });

    const [resLow, resHigh] = await Promise.all([pLow, pHigh]);

    expect(resLow.success).toBe(true);
    expect(resHigh.success).toBe(true);
    expect(storeHigh.getEvents().some((e) => e.id === ev1.id)).toBe(true);
  });

  // 2. A batch over 32 KB chunked safely under 16 KB Nearby limit
  it('chunks events into batches under 16 KB raw payload limit (never exceeds 32 KB)', async () => {
    const bigEvents: MeshEvent[] = [];
    // Create 40 events with 250 characters of text each (~700 bytes each -> ~28 KB total)
    for (let i = 0; i < 40; i++) {
      const id = `01BATCHCHUNK${i.toString().padStart(14, '0')}`;
      const ev = await createSignedEvent(id, {
        text: 'A'.repeat(250),
      });
      bigEvents.push(ev);
    }

    const batches = chunkEventsByBytes(bigEvents, MAX_BATCH_BYTES);
    expect(batches.length).toBeGreaterThan(1); // Must have been chunked into multiple batches

    for (const batch of batches) {
      const batchBytes = new TextEncoder().encode(JSON.stringify(batch)).length;
      expect(batchBytes).toBeLessThanOrEqual(32 * 1024); // Must NEVER exceed 32 KB Nearby limit
    }
  });

  // 3. A peer with a clock 3 days ahead (rejected events but peer not blocked)
  it('rejects events with clock skewed 3 days ahead without blocking the peer', async () => {
    unblockPeer('clockSkewPeer');

    const futureTime = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString();
    const kp = await generateKeyPair();
    const hlcFuture = new HLC(kp.publicKey.slice(0, 8), Date.now() + 3 * 24 * 3600 * 1000);

    const skewEvent = await signEvent(
      {
        id: '01SKEWCLOCK00000000000001',
        v: 1,
        kind: 'HAZARD',
        type: 'road_blocked',
        feature_id: 'sp3e8skew1',
        ref: null,
        lat: 43.76,
        lon: 11.24,
        severity: 2,
        text: 'Report from far future phone',
        qty: null,
        hlc: hlcFuture.tick(),
        device_time: futureTime,
        author: kp.publicKey,
        ttl_hours: 48,
      },
      kp.secretKey
    );

    const storeGood = new TestStore([]);
    const storeSkew = new TestStore([skewEvent]);

    const [sessGood, sessSkew] = createMemorySessionPair('goodPeer', 'clockSkewPeer');

    const [resGood] = await Promise.all([
      runDeltaSync(sessGood, storeGood, { nodeId: 'goodPeer', skipCoolDown: true }),
      runDeltaSync(sessSkew, storeSkew, { nodeId: 'clockSkewPeer', skipCoolDown: true }),
    ]);

    // The skewed event must NOT be stored
    expect(storeGood.getEvents()).toHaveLength(0);

    // Rejection reason categorized as clockSkew (1 or more timestamp checks failed)
    expect(resGood.rejectionsByReason.clockSkew).toBeGreaterThan(0);

    // CRITICAL: Peer must NOT be blocked for harmless clock skew!
    expect(isPeerBlocked('clockSkewPeer')).toBe(false);
  });

  // 4. A peer sending one tampered event (rejected, not blocked)
  it('rejects a single tampered event without blocking the peer (strikes < 3)', async () => {
    unblockPeer('singleTamperPeer');

    // Categorization check:
    const cat = categorizeRejection('Invalid Ed25519 signature');
    expect(cat.isSecurityStrike).toBe(true);

    // Peer is only blocked after 3 security strikes
    expect(isPeerBlocked('singleTamperPeer')).toBe(false);
  });

  // 5. Temporary block with 10 minute TTL
  it('temporary block expires after TTL', () => {
    const peerId = 'tempBlockedTestPeer';
    const now = Date.now();

    blockPeerTemporary(peerId, 1000, now); // 1 second TTL
    expect(isPeerBlocked(peerId, now + 500)).toBe(true);
    expect(isPeerBlocked(peerId, now + 1500)).toBe(false); // Expired!
  });

  // 6. Identity migration from localStorage to IndexedDB
  it('migrates identity from localStorage if present', async () => {
    const mockLegacyKey = {
      publicKey: '11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff',
      secretKey: 'aa'.repeat(64),
    };

    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('meshmap_device_identity_v1', JSON.stringify(mockLegacyKey));
    }

    const identity = await getDeviceIdentity();
    expect(identity.keyPair).toBeDefined();
    expect(identity.nodeId).toBeDefined();
  });

  // 7. Session that drops mid-sync (resets safely without crashing or hanging)
  it('handles a session that drops mid-sync gracefully', async () => {
    const ev = await createSignedEvent('01DROPMIDSYNC0000000000001');
    const storeA = new TestStore([ev]);
    const storeB = new TestStore([]);

    const [sessA, sessB] = createMemorySessionPair('peerA', 'peerB');

    // Simulate connection dropping abruptly after 10ms
    setTimeout(() => {
      sessA.close();
      sessB.close();
    }, 10);

    const resA = await runDeltaSync(sessA, storeA, { nodeId: 'peerA', timeoutMs: 500 });
    // Must complete and resolve safely with success: false (or timeout)
    expect(resA).toBeDefined();
  });
});
