/**
 * Storage Eviction Manager — SRS §10, FR-17.
 *
 * Enforces local storage quotas while strictly protecting critical safety data:
 * - SOS & SOS_ACK events are NEVER evicted.
 * - OFFICIAL government alerts are NEVER evicted.
 * - Active critical hazards (severity 3) are preserved until TTL expires.
 * - Prioritized eviction for expired, resolved, and low-severity stale events.
 */

import type { MeshEvent } from '../domain/types';
import { HLC } from '../domain/hlc';

export interface EvictionResult {
  remaining: MeshEvent[];
  evictedCount: number;
  evictedIds: string[];
  reasons: string[];
}

export const DEFAULT_MAX_EVENTS_STORAGE = 5000;

/**
 * Checks if an event is strictly protected from storage eviction.
 */
export function isProtectedEvent(event: MeshEvent, nowMs: number = Date.now()): boolean {
  // 1. SOS and SOS_ACK are non-negotiably protected
  if (event.kind === 'SOS' || event.kind === 'SOS_ACK') {
    return true;
  }

  // 2. Official alerts are protected
  if (event.kind === 'OFFICIAL') {
    return true;
  }

  // 3. Active critical hazards (severity 3) within unexpired TTL
  if (event.kind === 'HAZARD' && event.severity === 3) {
    const eventTime = new Date(event.device_time).getTime();
    const ttlMs = (event.ttl_hours || 48) * 3600 * 1000;
    if (nowMs - eventTime < ttlMs) {
      return true;
    }
  }

  return false;
}

/**
 * Calculates eviction priority score for an event (higher score = evict first).
 */
function getEvictionScore(event: MeshEvent, nowMs: number): number {
  const eventTime = new Date(event.device_time).getTime();
  const ageMs = Math.max(0, nowMs - eventTime);
  const ttlMs = (event.ttl_hours || 48) * 3600 * 1000;
  const isExpired = ageMs > ttlMs;

  let score = 0;

  // 1. Expired events get highest eviction priority
  if (isExpired) {
    score += 10000;
  }

  // 2. Resolved or closed events
  if (event.kind === 'RESOLVE' || event.kind === 'CLOSE') {
    score += 5000;
  }

  // 3. Low severity gets higher eviction priority than high severity
  score += (4 - event.severity) * 500;

  // 4. Age factor (older events evict sooner)
  score += Math.min(1000, ageMs / (3600 * 1000));

  return score;
}

/**
 * Enforces storage quota limit by pruning lowest-priority evictable events.
 */
export function evictOldEvents(
  events: MeshEvent[],
  maxLimit: number = DEFAULT_MAX_EVENTS_STORAGE,
  nowMs: number = Date.now()
): EvictionResult {
  if (events.length <= maxLimit) {
    return {
      remaining: events,
      evictedCount: 0,
      evictedIds: [],
      reasons: ['Store within quota limits'],
    };
  }

  const protectedEvents: MeshEvent[] = [];
  const candidateEvents: { event: MeshEvent; score: number }[] = [];

  for (const ev of events) {
    if (isProtectedEvent(ev, nowMs)) {
      protectedEvents.push(ev);
    } else {
      candidateEvents.push({
        event: ev,
        score: getEvictionScore(ev, nowMs),
      });
    }
  }

  // Sort candidates by eviction score descending (highest score = evict first)
  candidateEvents.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Tie-break: older HLC evicts first
    return HLC.compare(a.event.hlc, b.event.hlc);
  });

  const targetEvictionCount = events.length - maxLimit;
  const evictedIds: string[] = [];
  const remainingCandidates: MeshEvent[] = [];

  for (let i = 0; i < candidateEvents.length; i++) {
    if (i < targetEvictionCount) {
      evictedIds.push(candidateEvents[i].event.id);
    } else {
      remainingCandidates.push(candidateEvents[i].event);
    }
  }

  const remaining = [...protectedEvents, ...remainingCandidates].sort((a, b) =>
    HLC.compare(a.hlc, b.hlc)
  );

  return {
    remaining,
    evictedCount: evictedIds.length,
    evictedIds,
    reasons: [
      `Evicted ${evictedIds.length} stale/expired events; preserved ${protectedEvents.length} protected SOS and official records`,
    ],
  };
}

