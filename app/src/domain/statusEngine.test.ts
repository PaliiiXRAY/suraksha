import { describe, it, expect } from 'vitest';
import { reduceFeatures } from './statusEngine';
import type { MeshEvent } from './types';

function createMockEvent(overrides: Partial<MeshEvent>): MeshEvent {
  return {
    id: '01TEST00000000000000000000',
    v: 1,
    kind: 'HAZARD',
    type: 'road_blocked',
    feature_id: 'test_feat_123',
    ref: null,
    lat: 20.2961,
    lon: 85.8245,
    severity: 2,
    text: 'Road completely blocked by fallen debris',
    qty: null,
    hlc: '1000000000000:0000:node1',
    device_time: '2026-10-30T12:00:00.000Z',
    author: 'author_pubkey_1',
    ttl_hours: 24,
    sig: 'sig_mock_1',
    ...overrides,
  };
}

describe('StatusEngine - reduceFeatures', () => {
  it('single hazard event creates an active hazard with red color', () => {
    const ev1 = createMockEvent({
      id: 'ev1',
      kind: 'HAZARD',
      type: 'road_blocked',
      hlc: '1000000000000:0000:node1',
    });

    const features = reduceFeatures([ev1]);
    expect(features).toHaveLength(1);
    expect(features[0].status).toBe('active');
    expect(features[0].color).toBe('red');
    expect(features[0].statusLabel).toBe('Active Hazard');
    expect(features[0].events).toHaveLength(1);
  });

  it('marking hazard fixed (RESOLVE) turns status to resolved and color to green', () => {
    const ev1 = createMockEvent({
      id: 'ev1',
      kind: 'HAZARD',
      type: 'flooding',
      hlc: '1000000000000:0000:node1',
      text: 'Flooded underpass',
    });

    const ev2 = createMockEvent({
      id: 'ev2',
      kind: 'RESOLVE',
      type: 'flooding',
      ref: 'ev1',
      hlc: '1000000001000:0000:node2',
      text: 'Water pumped out, underpass open',
    });

    const features = reduceFeatures([ev1, ev2]);
    expect(features).toHaveLength(1);
    expect(features[0].status).toBe('resolved');
    expect(features[0].color).toBe('green');
    expect(features[0].statusLabel).toBe('Resolved / Fixed');
    expect(features[0].events).toHaveLength(2);
    // Timeline is newest first
    expect(features[0].events[0].id).toBe('ev2');
    expect(features[0].events[1].id).toBe('ev1');
  });

  it('two-tap confirm (CONFIRM) increases confirmation count and sets trust badge', () => {
    const ev1 = createMockEvent({
      id: 'ev1',
      kind: 'HAZARD',
      author: 'author1',
      hlc: '1000000000000:0000:node1',
    });

    const ev2 = createMockEvent({
      id: 'ev2',
      kind: 'CONFIRM',
      author: 'author2',
      ref: 'ev1',
      hlc: '1000000002000:0000:node2',
      text: 'Still there, witnessed 10 mins ago',
    });

    const features = reduceFeatures([ev1, ev2]);
    expect(features).toHaveLength(1);
    expect(features[0].status).toBe('active');
    expect(features[0].color).toBe('red');
    expect(features[0].confirmationsCount).toBe(1);
    expect(features[0].trustBadge).toBe('confirmed');
    expect(features[0].trustLabel).toContain('Confirmed (2)');
  });

  it('resource item is blue and turns grey on CLOSE', () => {
    const ev1 = createMockEvent({
      id: 'ev1',
      kind: 'RESOURCE',
      type: 'shelter',
      hlc: '1000000000000:0000:node1',
    });

    let features = reduceFeatures([ev1]);
    expect(features[0].status).toBe('active');
    expect(features[0].color).toBe('blue');

    const ev2 = createMockEvent({
      id: 'ev2',
      kind: 'CLOSE',
      type: 'shelter',
      hlc: '1000000005000:0000:node1',
    });

    features = reduceFeatures([ev1, ev2]);
    expect(features[0].status).toBe('closed');
    expect(features[0].color).toBe('grey');
  });
});

