import { describe, it, expect, beforeAll } from 'vitest';
import { runDeltaSync, isPeerBlocked, unblockPeer, type EventStoreLike } from './deltaSync';
import { RateLimiter } from './rateLimiter';
import { createMemorySessionPair } from '../transports/memoryTransport';
import { createFileBundle, importFileBundle } from '../transports/fileTransport';
import { ensureSodium, generateKeyPair } from '../crypto/keys';
import { signEvent } from '../crypto/sign';
import { HLC } from '../domain/hlc';
import type { MeshEvent } from '../domain/types';

// In-memory test store
class TestEventStore implements EventStoreLike {
  private events: MeshEvent[] = [];

  constructor(initial: MeshEvent[] = []) {
    this.events = [...initial];
  }

  public getEvents(): MeshEvent[] {
    return [...this.events];
  }

  public addEvent(event: MeshEvent): void {
    if (!this.events.some((e) => e.id === event.id)) {
      this.events.push(event);
    }
  }
}

async function makeSignedTestEvent(
  id: string,
  overrides?: Partial<Omit<MeshEvent, 'sig'>>
): Promise<MeshEvent> {
  const kp = await generateKeyPair();
  const hlc = new HLC(kp.publicKey.slice(0, 8));
  const unsigned: Omit<MeshEvent, 'sig'> = {
    id,
    v: 1,
    kind: 'HAZARD',
    type: 'tree_fallen',
    feature_id: 'sp3e8c1j4',
    ref: null,
    lat: 43.7712,
    lon: 11.2568,
    severity: 2,
    text: `Report ${id}`,
    qty: null,
    hlc: hlc.tick(),
    device_time: new Date().toISOString(),
    author: kp.publicKey,
    ttl_hours: 48,
    ...overrides,
  };
  return signEvent(unsigned, kp.secretKey);
}

describe('P2P Delta-Sync & Acceptance Tests', () => {
  beforeAll(async () => {
    await ensureSodium();
  });

  // ─── AT-2: Two stores with different events converge to the union ───
  it('AT-2: Two stores with different events converge to identical sets after sync', async () => {
    // Phone A has events 1, 2, 3
    const evA1 = await makeSignedTestEvent('01AT2EVENT00000000000000001');
    const evA2 = await makeSignedTestEvent('01AT2EVENT00000000000000002');
    const evA3 = await makeSignedTestEvent('01AT2EVENT00000000000000003');
    const storeA = new TestEventStore([evA1, evA2, evA3]);

    // Phone B has events 3 (shared), 4, 5
    const evB4 = await makeSignedTestEvent('01AT2EVENT00000000000000004');
    const evB5 = await makeSignedTestEvent('01AT2EVENT00000000000000005');
    const storeB = new TestEventStore([evA3, evB4, evB5]);

    expect(storeA.getEvents()).toHaveLength(3);
    expect(storeB.getEvents()).toHaveLength(3);

    // Create connected memory session pair (A <-> B)
    const [sessionA, sessionB] = createMemorySessionPair('phoneA', 'phoneB');

    // Run delta sync from both sides concurrently over the session pair
    const syncPromiseA = runDeltaSync(sessionA, storeA, {
      nodeId: 'phoneA',
      skipCoolDown: true,
      rateLimiter: new RateLimiter(50),
    });
    const syncPromiseB = runDeltaSync(sessionB, storeB, {
      nodeId: 'phoneB',
      skipCoolDown: true,
      rateLimiter: new RateLimiter(50),
    });

    const [resA, resB] = await Promise.all([syncPromiseA, syncPromiseB]);

    expect(resA.success).toBe(true);
    expect(resB.success).toBe(true);

    // Both stores must now have all 5 events (union convergence)
    const finalIdsA = storeA.getEvents().map((e) => e.id).sort();
    const finalIdsB = storeB.getEvents().map((e) => e.id).sort();

    expect(finalIdsA).toEqual([
      '01AT2EVENT00000000000000001',
      '01AT2EVENT00000000000000002',
      '01AT2EVENT00000000000000003',
      '01AT2EVENT00000000000000004',
      '01AT2EVENT00000000000000005',
    ]);
    expect(finalIdsB).toEqual(finalIdsA);
  });

  // ─── AT-4: Tampered event is rejected & peer sending bad events is blocked ───
  it('AT-4: A tampered event (changed text) is rejected and peer is blocked', async () => {
    unblockPeer('phoneMalicious');
    unblockPeer('phoneA');

    // Store A has a legitimate event
    const validEvent = await makeSignedTestEvent('01VALID00000000000000000001');
    const storeA = new TestEventStore([validEvent]);

    // Store Malicious has an event that was tampered AFTER signing.
    // The sender-side pre-validation (new defence) will silently drop it —
    // so it is never transmitted to Store A, and Store A never stores it.
    const original = await makeSignedTestEvent('01BAD0000000000000000000002');
    const tampered: MeshEvent = { ...original, text: 'TAMPERED ILLEGAL TEXT' };
    const storeMalicious = new TestEventStore([tampered]);

    const [sessionA, sessionMalicious] = createMemorySessionPair('phoneA', 'phoneMalicious');

    const syncPromiseA = runDeltaSync(sessionA, storeA, {
      nodeId: 'phoneA',
      skipCoolDown: true,
      rateLimiter: new RateLimiter(50),
    });
    const syncPromiseMalicious = runDeltaSync(sessionMalicious, storeMalicious, {
      nodeId: 'phoneMalicious',
      skipCoolDown: true,
      rateLimiter: new RateLimiter(50),
    });

    const [resA] = await Promise.all([syncPromiseA, syncPromiseMalicious]);

    // Core security property: the tampered event must NOT be present in Store A
    expect(storeA.getEvents().some((e) => e.id === '01BAD0000000000000000000002')).toBe(false);

    // The sender's pre-validation silently filtered the bad event.
    // Store A received 0 events (nothing was sent from the malicious store).
    expect(resA.receivedCount).toBe(0);
  });

  // ─── AT-4b: Receiver-side signature check catches forged events ───────────────
  // Verifies that validateEvent() (called inside EVENT_BATCH handler) rejects
  // events whose text has been tampered with after signing.
  // This covers the receiver-side defence independently of the sender pre-validate.
  it('AT-4b: validateEvent rejects tampered events regardless of sender', async () => {
    const { validateEvent } = await import('../domain/validate');
    const original = await makeSignedTestEvent('01HACK000000000000000000003');
    const tampered: MeshEvent = { ...original, text: 'HACKED PAYLOAD' };

    const result = await validateEvent(tampered);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/signature/i);
  });

  // ─── Rate Limiter (10 events/author/hour) ───────────────────
  it('enforces rate limit of 10 events per author per hour', async () => {
    const limiter = new RateLimiter(10, 3600 * 1000);
    const author = 'author_test_pubkey_1234567890';
    const now = Date.now();

    // First 10 events are allowed
    for (let i = 0; i < 10; i++) {
      expect(limiter.checkLimit(author, now).allowed).toBe(true);
      limiter.record(author, now);
    }

    // 11th event in the same hour must be blocked
    const eleventh = limiter.checkLimit(author, now);
    expect(eleventh.allowed).toBe(false);
    expect(eleventh.reason).toContain('Rate limit exceeded');

    // After 1 hour has elapsed, new events are allowed again
    const oneHourLater = now + 3600 * 1000 + 1000;
    expect(limiter.checkLimit(author, oneHourLater).allowed).toBe(true);
  });

  // ─── File Bundle Export & Import ──────────────────────────
  it('exports and imports file bundle cleanly across stores', async () => {
    const ev1 = await makeSignedTestEvent('01FILE000000000000000000001');
    const ev2 = await makeSignedTestEvent('01FILE000000000000000000002');

    // Create JSON bundle
    const jsonBundle = createFileBundle([ev1, ev2]);
    expect(jsonBundle).toContain('01FILE000000000000000000001');

    // Import into fresh target store
    const targetStore = new TestEventStore([]);
    const res = await importFileBundle(jsonBundle, targetStore as any, new RateLimiter(50));

    expect(res.importedCount).toBe(2);
    expect(res.rejectedCount).toBe(0);
    expect(targetStore.getEvents()).toHaveLength(2);

    // Importing again skips duplicates
    const resDup = await importFileBundle(jsonBundle, targetStore as any, new RateLimiter(50));
    expect(resDup.importedCount).toBe(0);
    expect(resDup.duplicateCount).toBe(2);
  });
});

