/**
 * Status Engine — SRS §8.4 + FR-10.
 *
 * Aggregates a sequence of MeshEvents for each feature into current display state:
 * - Status: 'active' | 'resolved' | 'closed' | 'disputed'
 * - Colour: 'red' | 'green' | 'blue' | 'grey' | 'amber'
 * - Icon: type icon + status symbol
 * - Trust badge: 'official' | 'confirmed' | 'new'
 * - Explainable reasons[] array
 * - Full timeline (newest first)
 */

import type { MeshEvent, EventKind, EventType } from './types';
import { HLC } from './hlc';
import { evaluateFeatureTrust } from './trustEngine';

export type FeatureStatus = 'active' | 'resolved' | 'closed' | 'disputed';
export type FeatureColor = 'red' | 'green' | 'blue' | 'grey' | 'amber';
export type TrustBadgeType = 'official' | 'confirmed' | 'new';

export interface FeatureState {
  feature_id: string;
  kind: EventKind;
  type: EventType;
  lat: number;
  lon: number;
  severity: number;
  status: FeatureStatus;
  color: FeatureColor;
  statusLabel: string;
  trustBadge: TrustBadgeType;
  trustLabel: string;
  confirmationsCount: number;
  score: number;
  reasons: string[];
  isDisputed: boolean;
  isOfficial: boolean;
  initialReport: MeshEvent;
  latestEvent: MeshEvent;
  events: MeshEvent[]; // Newest first for timeline
  createdAt: string;
  updatedAt: string;
}

/**
 * Reduce a set of raw MeshEvents into a list of consolidated FeatureStates.
 */
export function reduceFeatures(
  events: MeshEvent[],
  nowMs: number = Date.now(),
  keyFirstSeenMap?: Map<string, number>
): FeatureState[] {
  // 1. Group events by feature_id
  const groups = new Map<string, MeshEvent[]>();
  for (const ev of events) {
    const list = groups.get(ev.feature_id) || [];
    list.push(ev);
    groups.set(ev.feature_id, list);
  }

  const features: FeatureState[] = [];

  for (const [featureId, rawList] of groups.entries()) {
    // 2. Sort by HLC ascending (chronological order)
    const sorted = [...rawList].sort((a, b) => HLC.compare(a.hlc, b.hlc));

    const initial = sorted[0];
    const latest = sorted[sorted.length - 1];
    const confirmations = sorted.filter((e) => e.kind === 'CONFIRM').length;

    // 3. Evaluate comprehensive trust, key-age, proximity, and dispute status
    const evalRes = evaluateFeatureTrust(sorted, { nowMs, keyFirstSeenMap });

    // Timeline is newest first
    const timeline = [...sorted].reverse();

    features.push({
      feature_id: featureId,
      kind: initial.kind,
      type: initial.type,
      lat: initial.lat,
      lon: initial.lon,
      severity: initial.severity,
      status: evalRes.status,
      color: evalRes.color,
      statusLabel: evalRes.statusLabel,
      trustBadge: evalRes.trustBadge,
      trustLabel: evalRes.trustLabel,
      confirmationsCount: confirmations,
      score: evalRes.score,
      reasons: evalRes.reasons,
      isDisputed: evalRes.isDisputed,
      isOfficial: evalRes.isOfficial,
      initialReport: initial,
      latestEvent: latest,
      events: timeline,
      createdAt: initial.device_time,
      updatedAt: latest.device_time,
    });
  }

  return features;
}
