import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NearbyTransport, NearbySession, MeshNative } from './nearby';
import { PermissionsManager, PERMISSION_EXPLANATIONS } from './permissions';

describe('NearbyTransport and MeshNative Plugin Bridge', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('has transport id "nearby"', () => {
    const transport = new NearbyTransport();
    expect(transport.id).toBe('nearby');
  });

  it('reports unavailable in standard browser/Node environment', async () => {
    const transport = new NearbyTransport();
    const available = await transport.isAvailable();
    expect(available).toBe(false);
  });

  it('NearbySession correctly dispatches received bytes to listener and supports unsubscribe', () => {
    const session = new NearbySession('peer_android_123');
    const received: Uint8Array[] = [];

    const unsub = session.onReceive((bytes) => {
      received.push(bytes);
    });

    const testPayload = new Uint8Array([1, 2, 3, 4, 5]);
    session.dispatchBytes(testPayload);

    expect(received.length).toBe(1);
    expect(received[0]).toEqual(testPayload);

    // Unsubscribe should stop delivery
    unsub();
    session.dispatchBytes(new Uint8Array([6, 7]));
    expect(received.length).toBe(1);
  });

  it('NearbySession keeps session alive and open across multiple dispatches if not closed', () => {
    const session = new NearbySession('peer_android_persist');
    expect(session.isClosed).toBe(false);

    let count = 0;
    const unsub1 = session.onReceive(() => { count++; });
    session.dispatchBytes(new Uint8Array([1]));
    expect(count).toBe(1);
    unsub1();

    expect(session.isClosed).toBe(false);

    const unsub2 = session.onReceive(() => { count += 10; });
    session.dispatchBytes(new Uint8Array([2]));
    expect(count).toBe(11);
    unsub2();

    expect(session.isClosed).toBe(false);
  });

  it('NearbySession rejects send after close()', async () => {
    const session = new NearbySession('peer_android_123');
    await session.close();
    expect(session.isClosed).toBe(true);

    const testPayload = new Uint8Array([10, 20]);
    await expect(session.send(testPayload)).rejects.toThrow('Cannot send on closed NearbySession');
  });

  it('PermissionsManager provides complete explanations for all 4 required permissions', () => {
    expect(PERMISSION_EXPLANATIONS.length).toBe(4);
    const ids = PERMISSION_EXPLANATIONS.map((p) => p.id);
    expect(ids).toContain('location');
    expect(ids).toContain('nearbyDevices');
    expect(ids).toContain('notifications');
    expect(ids).toContain('sms');

    for (const exp of PERMISSION_EXPLANATIONS) {
      expect(exp.title.length).toBeGreaterThan(0);
      expect(exp.purpose.length).toBeGreaterThan(15);
      expect(exp.icon.length).toBeGreaterThan(0);
    }
  });

  it('PermissionsManager.checkStatus returns all true fallback in browser', async () => {
    const status = await PermissionsManager.checkStatus();
    expect(status.allGranted).toBe(true);
    expect(status.location).toBe(true);
    expect(status.nearbyDevices).toBe(true);
    expect(status.notifications).toBe(true);
    expect(status.sms).toBe(true);
  });
});

