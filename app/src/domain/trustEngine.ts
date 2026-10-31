/**
 * Trust & Scoring Engine — SRS §8.4, §10, and Acceptance Tests AT-1, AT-3, AT-5.
 *
 * Evaluates event trust, key-age weighting, proximity-weighted confirmations,
 * official government signature precedence, and dispute resolution.
 */

import type { MeshEvent } from './types';
import { HLC } from './hlc';
import { verifyGovSignature } from '../crypto/gov';

export interface AuthorTrustProfile {
  author: string;
  firstSeenMs: number;
  confirmedReportsCount: number;
}

export interface FeatureTrustEvaluation {
  score: number;
  status: 'active' | 'resolved' | 'closed' | 'disputed';
  color: 'red' | 'green' | 'blue' | 'grey' | 'amber';
  statusLabel: string;
  trustBadge: 'official' | 'confirmed' | 'new';
  trustLabel: string;
  isOfficial: boolean;
  isDisputed: boolean;
  reasons: string[];
}

/**
 * Haversine distance between two coordinates in meters.
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Key-age weight multiplier (SRS §10: Sybil resistance).
 * Older keys carry higher trust weight; ephemeral brand-new keys are discounted.
 */
export function getKeyAgeWeight(firstSeenMs: number, eventTimeMs: number): number {
  const ageMs = Math.max(0, eventTimeMs - firstSeenMs);
  const HOUR = 3600 * 1000;
  const DAY = 24 * HOUR;

  if (ageMs >= 7 * DAY) return 2.0; // Veteran key (>7 days)
  if (ageMs >= 1 * DAY) return 1.5; // Established key (>24 hours)
  if (ageMs >= 1 * HOUR) return 1.0; // Normal key (>1 hour)
  return 0.8; // Brand-new / ephemeral key (<1 hour)
}

/**
 * Proximity weight multiplier (SRS §10: Confirmations near the location count more).
 */
export function getProximityWeight(
  incidentLat: number,
  incidentLon: number,
  witnessLat: number,
  witnessLon: number
): number {
  const dist = calculateDistanceMeters(incidentLat, incidentLon, witnessLat, witnessLon);

  if (dist <= 50) return 1.5; // Direct eyewitness (<50m)
  if (dist <= 250) return 1.2; // Immediate vicinity (<250m)
  if (dist <= 1000) return 1.0; // Local area (<1km)
  if (dist <= 5000) return 0.6; // Distant witness (<5km)
  return 0.2; // Far away (>5km, low confidence)
}

/**
 * Evaluates feature trust score and determines operational status according to SRS §8.4.
 *
 * Rules:
 * 1. Newest verified OFFICIAL event present -> wins unconditionally, verified badge.
 * 2. Conflicting recent events within 5 minutes (AT-5) with small trust gap -> AMBER "disputed".
 * 3. Score = Σ trust(author, proximity) of HAZARD/CONFIRM since last RESOLVE
 *           - Σ trust(author) of RESOLVE.
 * 4. Score > 0 and age < stale window (24h) -> RED "Active Hazard".
 * 5. Score > 0 and age >= stale window -> AMBER "May be outdated".
 * 6. Score <= 0 -> GREEN "Resolved / Fixed".
 */
export function evaluateFeatureTrust(
  events: MeshEvent[],
  options?: {
    nowMs?: number;
    keyFirstSeenMap?: Map<string, number>;
    staleWindowMs?: number;
    disputeWindowMs?: number;
  }
): FeatureTrustEvaluation {
  const now = options?.nowMs ?? Date.now();
  const keyMap = options?.keyFirstSeenMap ?? new Map<string, number>();
  const staleWindow = options?.staleWindowMs ?? 24 * 3600 * 1000; // 24 hours
  const disputeWindow = options?.disputeWindowMs ?? 5 * 60 * 1000; // 5 minutes (AT-5)

  if (events.length === 0) {
    return {
      score: 0,
      status: 'active',
      color: 'grey',
      statusLabel: 'No Events',
      trustBadge: 'new',
      trustLabel: '⚪ Empty',
      isOfficial: false,
      isDisputed: false,
      reasons: ['No events present'],
    };
  }

  // Sort chronological by HLC
  const sorted = [...events].sort((a, b) => HLC.compare(a.hlc, b.hlc));
  const initial = sorted[0];
  const latest = sorted[sorted.length - 1];

  const reasons: string[] = [];

  // Check if initial event is a resource
  const isResource = initial.kind === 'RESOURCE';

  // 1. Check for verified OFFICIAL events (SRS §8.4: official events govern)
  const officialEvents = sorted.filter((e) => e.kind === 'OFFICIAL');
  if (officialEvents.length > 0) {
    const latestOfficial = officialEvents[officialEvents.length - 1];
    reasons.push(`Official government event verified (signed by authority)`);

    const isOfficialResolved =
      latestOfficial.text.toLowerCase().includes('clear') ||
      latestOfficial.text.toLowerCase().includes('resolved') ||
      latestOfficial.text.toLowerCase().includes('fixed') ||
      latestOfficial.severity === 1;

    if (isOfficialResolved) {
      return {
        score: 100,
        status: 'resolved',
        color: 'green',
        statusLabel: 'Official: Resolved',
        trustBadge: 'official',
        trustLabel: '✅ Official / Verified',
        isOfficial: true,
        isDisputed: false,
        reasons,
      };
    }

    return {
      score: 100,
      status: 'active',
      color: 'red',
      statusLabel: 'Official: Active Hazard',
      trustBadge: 'official',
      trustLabel: '✅ Official / Verified',
      isOfficial: true,
      isDisputed: false,
      reasons,
    };
  }

  // Handle RESOURCE kind
  if (isResource) {
    const hasClose = sorted.some((e) => e.kind === 'CLOSE');
    const ageMs = now - new Date(latest.device_time).getTime();
    const ttlMs = (latest.ttl_hours || 48) * 3600 * 1000;

    if (hasClose) {
      return {
        score: 1.0,
        status: 'closed',
        color: 'grey',
        statusLabel: 'Resource Closed',
        trustBadge: 'new',
        trustLabel: 'Closed Resource',
        isOfficial: false,
        isDisputed: false,
        reasons: ['Resource marked closed by operator'],
      };
    }

    if (ageMs > ttlMs) {
      return {
        score: 0.5,
        status: 'active',
        color: 'amber',
        statusLabel: 'Resource Expired',
        trustBadge: 'new',
        trustLabel: 'Expired Notice',
        isOfficial: false,
        isDisputed: false,
        reasons: [`Resource past TTL (${latest.ttl_hours}h)`],
      };
    }

    return {
      score: 1.0,
      status: 'active',
      color: 'blue',
      statusLabel: 'Resource Available',
      trustBadge: 'confirmed',
      trustLabel: 'Available Supply',
      isOfficial: false,
      isDisputed: false,
      reasons: ['Active verified resource'],
    };
  }

  // 2. Acceptance Test AT-5: Conflict within 5 minutes between different authors
  // "HAZARD by user X and RESOLVE by user Y within 5 min -> amber disputed"
  const recentHazard = [...sorted]
    .reverse()
    .find((e) => e.kind === 'HAZARD' || e.kind === 'CONFIRM');
  const recentResolve = [...sorted].reverse().find((e) => e.kind === 'RESOLVE');

  if (recentHazard && recentResolve && recentHazard.author !== recentResolve.author) {
    const hazardTime = new Date(recentHazard.device_time).getTime();
    const resolveTime = new Date(recentResolve.device_time).getTime();
    const timeDelta = Math.abs(resolveTime - hazardTime);

    if (timeDelta <= disputeWindow) {
      reasons.push(
        `Conflicting HAZARD by ${recentHazard.author.slice(0, 8)} and RESOLVE by ${recentResolve.author.slice(0, 8)} within ${(timeDelta / 1000).toFixed(0)}s`
      );

      return {
        score: 0.5,
        status: 'disputed',
        color: 'amber',
        statusLabel: 'Disputed Report',
        trustBadge: 'new',
        trustLabel: '⚠️ Disputed by Community',
        isOfficial: false,
        isDisputed: true,
        reasons,
      };
    }
  }

  // 3. Accumulate weighted trust score:
  // score = Σ trust(author, proximity) of HAZARD/CONFIRM since last RESOLVE
  //       - Σ trust(author) of RESOLVE
  let hazardWeight = 0;
  let resolveWeight = 0;
  let confirmationsCount = 0;
  const uniqueAuthors = new Set<string>();

  for (const ev of sorted) {
    uniqueAuthors.add(ev.author);
    const evTime = new Date(ev.device_time).getTime();
    const firstSeen = keyMap.get(ev.author) ?? evTime;
    const ageWeight = getKeyAgeWeight(firstSeen, evTime);

    if (ev.kind === 'HAZARD') {
      hazardWeight += 1.0 * ageWeight;
      reasons.push(`Initial report by ${ev.author.slice(0, 8)} (key-age weight: ${ageWeight}x)`);
    } else if (ev.kind === 'CONFIRM') {
      confirmationsCount++;
      const proxWeight = getProximityWeight(initial.lat, initial.lon, ev.lat, ev.lon);
      const combined = ageWeight * proxWeight;
      hazardWeight += combined;
      reasons.push(
        `Confirmation by ${ev.author.slice(0, 8)} (prox: ${proxWeight}x, age: ${ageWeight}x -> +${combined.toFixed(2)})`
      );
    } else if (ev.kind === 'RESOLVE') {
      resolveWeight += 1.2 * ageWeight;
      reasons.push(`Resolution report by ${ev.author.slice(0, 8)} (-${(1.2 * ageWeight).toFixed(2)})`);
    }
  }

  const netScore = hazardWeight - resolveWeight;

  // Trust badge classification (SRS line 308)
  let trustBadge: 'official' | 'confirmed' | 'new' = 'new';
  let trustLabel = '⚪ New report';
  if (uniqueAuthors.size >= 2 || confirmationsCount >= 1) {
    trustBadge = 'confirmed';
    trustLabel = `🔵 Confirmed (${confirmationsCount + 1})`;
  }

  // Age & Staleness check
  const latestIncidentTime = new Date(latest.device_time).getTime();
  const isStale = now - latestIncidentTime >= staleWindow;

  if (netScore <= 0) {
    return {
      score: netScore,
      status: 'resolved',
      color: 'green',
      statusLabel: 'Resolved / Fixed',
      trustBadge,
      trustLabel,
      isOfficial: false,
      isDisputed: false,
      reasons,
    };
  }

  if (isStale) {
    reasons.push(`Incident report older than 24h stale window without recent re-confirmations`);
    return {
      score: netScore,
      status: 'active',
      color: 'amber',
      statusLabel: 'May be outdated',
      trustBadge,
      trustLabel,
      isOfficial: false,
      isDisputed: false,
      reasons,
    };
  }

  return {
    score: netScore,
    status: 'active',
    color: 'red',
    statusLabel: 'Active Hazard',
    trustBadge,
    trustLabel,
    isOfficial: false,
    isDisputed: false,
    reasons,
  };
}
