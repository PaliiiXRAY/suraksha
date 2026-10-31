import { World2D } from './world.ts';
import { VirtualPhone } from './phone.ts';
import { ensureSodium } from '../../../app/src/crypto/keys.ts';
import { signEvent } from '../../../app/src/crypto/sign.ts';
import { runDeltaSync } from '../../../app/src/sync/deltaSync.ts';
import type { MeshEvent } from '../../../app/src/domain/types.ts';
import type { Session } from '../../../app/src/transports/types.ts';

class SimSession implements Session {
  public peerId: string;
  public peerSession: SimSession | null = null;
  private receiver: ((bytes: Uint8Array) => void) | null = null;
  public isClosed = false;

  constructor(peerId: string) {
    this.peerId = peerId;
  }

  public onReceive(cb: (bytes: Uint8Array) => void): void {
    this.receiver = cb;
  }

  public async send(bytes: Uint8Array): Promise<void> {
    if (this.peerSession && this.peerSession.receiver) {
      const copy = new Uint8Array(bytes);
      queueMicrotask(() => {
        if (this.peerSession && this.peerSession.receiver) {
          this.peerSession.receiver(copy);
        }
      });
    }
  }

  public async close(): Promise<void> {
    this.isClosed = true;
  }
}

function createSimSessionPair(idA: string, idB: string): [SimSession, SimSession] {
  const sA = new SimSession(idB);
  const sB = new SimSession(idA);
  sA.peerSession = sB;
  sB.peerSession = sA;
  return [sA, sB];
}

export interface SimConfig {
  numPhones: number;
  worldSizeMeters?: number; // default 5000m (5km)
  radioRangeMeters?: number; // default 50m
  dtSeconds?: number; // step size in seconds (default 10s)
  coolDownSec?: number; // min seconds between repeat syncs (default 30s)
  spammerRatio?: number; // fraction of spamming phones (0 to 1)
  badClockRatio?: number; // fraction of phones with clocks 3 days ahead (0 to 1)
  maxSimMinutes?: number; // max simulation limit (default 300 min)
}

export interface SimResult {
  numPhones: number;
  targetEventId: string;
  reached95: boolean;
  timeTo95Minutes: number;
  totalSimMinutes: number;
  finalInfectedCount: number;
  finalPercentage: number;
  totalEncounters: number;
  totalSyncSessions: number;
  spamEventsBlocked: number;
  badClockEventsRejected: number;
  milestones: { percentage: number; minutes: number }[];
}

export class SimulationEngine {
  private config: Required<SimConfig>;
  private world: World2D;
  private phones: VirtualPhone[] = [];
  private targetEvent!: MeshEvent;

  constructor(cfg: SimConfig) {
    this.config = {
      numPhones: cfg.numPhones,
      worldSizeMeters: cfg.worldSizeMeters ?? 5000,
      radioRangeMeters: cfg.radioRangeMeters ?? 50,
      dtSeconds: cfg.dtSeconds ?? 10,
      coolDownSec: cfg.coolDownSec ?? 30,
      spammerRatio: cfg.spammerRatio ?? 0,
      badClockRatio: cfg.badClockRatio ?? 0,
      maxSimMinutes: cfg.maxSimMinutes ?? 300,
    };

    this.world = new World2D(this.config.worldSizeMeters, this.config.radioRangeMeters);
  }

  public async initialize(): Promise<void> {
    await ensureSodium();

    const { numPhones, worldSizeMeters, spammerRatio, badClockRatio } = this.config;
    this.phones = [];

    const numSpammers = Math.floor(numPhones * spammerRatio);
    const numBadClocks = Math.floor(numPhones * badClockRatio);

    // 1. Create all phones distributed uniformly across 5x5 km
    for (let i = 0; i < numPhones; i++) {
      const isSpammer = i < numSpammers;
      // Assign bad clocks (+3 days = 259,200,000 ms ahead)
      const isBadClock = !isSpammer && i < numSpammers + numBadClocks;
      const clockOffsetMs = isBadClock ? 3 * 24 * 3600 * 1000 : 0;

      const p = new VirtualPhone({
        id: `phone_${String(i).padStart(3, '0')}`,
        x: Math.random() * worldSizeMeters,
        y: Math.random() * worldSizeMeters,
        clockOffsetMs,
        isSpammer,
      });

      await p.initKeys();
      this.phones.push(p);
    }

    // 2. Generate initial target event at phone 0 (source node)
    const sourcePhone = this.phones[0];
    const unsigned: Omit<MeshEvent, 'sig'> = {
      id: '01SIMTARGET00000000000000',
      v: 1,
      kind: 'HAZARD',
      type: 'flooding',
      feature_id: 'sp3e8c1j4',
      ref: null,
      lat: 43.7696,
      lon: 11.2558,
      severity: 3,
      text: 'CRITICAL ALERT: Flash flood breach at East Embankment.',
      qty: null,
      hlc: sourcePhone.hlc.tick(),
      device_time: new Date().toISOString(),
      author: sourcePhone.keyPair.publicKey,
      ttl_hours: 72,
    };

    this.targetEvent = await signEvent(unsigned, sourcePhone.keyPair.secretKey);
    sourcePhone.store.addEvent(this.targetEvent);

    // 3. If spammer scenario: create spam flood reports
    for (const p of this.phones) {
      if (p.isSpammer) {
        // Generate 30 spam events from this author (rate limit is 10/hr)
        for (let s = 0; s < 30; s++) {
          const spamUnsigned: Omit<MeshEvent, 'sig'> = {
            id: `01SPAM${p.id}${String(s).padStart(3, '0')}`,
            v: 1,
            kind: 'HAZARD',
            type: 'other',
            feature_id: 'sp3e8c1j4',
            ref: null,
            lat: 43.77,
            lon: 11.25,
            severity: 1,
            text: `SPAM ADVERTISEMENT #${s} from ${p.id}`,
            qty: null,
            hlc: p.hlc.tick(),
            device_time: new Date().toISOString(),
            author: p.keyPair.publicKey,
            ttl_hours: 24,
          };
          const signed = await signEvent(spamUnsigned, p.keyPair.secretKey);
          p.store.addEvent(signed);
        }
      }
    }
  }

  public async run(): Promise<SimResult> {
    const { numPhones, dtSeconds, coolDownSec, maxSimMinutes, worldSizeMeters } = this.config;
    let simTimeSeconds = 0;
    const maxSeconds = maxSimMinutes * 60;
    const targetThreshold = Math.ceil(numPhones * 0.95);

    let totalEncounters = 0;
    let totalSyncSessions = 0;
    let spamEventsBlocked = 0;
    let badClockEventsRejected = 0;

    const milestones: { percentage: number; minutes: number }[] = [];
    const recordedMilestones = new Set<number>();

    const checkMilestone = (count: number) => {
      const pct = Math.floor((count / numPhones) * 100);
      const targets = [25, 50, 75, 90, 95];
      for (const t of targets) {
        if (pct >= t && !recordedMilestones.has(t)) {
          recordedMilestones.add(t);
          milestones.push({ percentage: t, minutes: Number((simTimeSeconds / 60).toFixed(1)) });
        }
      }
    };

    let reached95 = false;
    let timeTo95Minutes = 0;

    // Initial count
    let currentCount = this.phones.filter((p) => p.hasEvent(this.targetEvent.id)).length;
    checkMilestone(currentCount);

    while (simTimeSeconds < maxSeconds) {
      simTimeSeconds += dtSeconds;

      // 1. Move all phones
      for (const p of this.phones) {
        p.stepMovement(dtSeconds, worldSizeMeters);
      }

      // 2. Discover neighbors within 50m
      const meetingPairs = this.world.findMeetingPairs(this.phones);
      totalEncounters += meetingPairs.length;

      // 3. Execute sync for meeting pairs that are not in cool-down
      for (const [pA, pB] of meetingPairs) {
        if (!pA.canSyncWith(pB.id, simTimeSeconds, coolDownSec)) continue;
        if (!pB.canSyncWith(pA.id, simTimeSeconds, coolDownSec)) continue;

        pA.markSynced(pB.id, simTimeSeconds);
        pB.markSynced(pA.id, simTimeSeconds);
        totalSyncSessions++;

        // Run real DeltaSync over connected in-memory sessions
        const [sessionA, sessionB] = createSimSessionPair(pA.id, pB.id);

        const syncA = runDeltaSync(sessionA, pA.store, {
          nodeId: pA.id,
          pubKey: pA.keyPair.publicKey,
          rateLimiter: pA.rateLimiter,
          skipCoolDown: true,
          timeoutMs: 300,
        });

        const syncB = runDeltaSync(sessionB, pB.store, {
          nodeId: pB.id,
          pubKey: pB.keyPair.publicKey,
          rateLimiter: pB.rateLimiter,
          skipCoolDown: true,
          timeoutMs: 300,
        });

        const [resA, resB] = await Promise.all([syncA, syncB]);

        if (resA.rejectedCount > 0) {
          spamEventsBlocked += resA.rejectedCount;
        }
        if (resB.rejectedCount > 0) {
          spamEventsBlocked += resB.rejectedCount;
        }
      }

      // 4. Check convergence progress
      currentCount = this.phones.filter((p) => p.hasEvent(this.targetEvent.id)).length;
      checkMilestone(currentCount);

      if (currentCount >= targetThreshold && !reached95) {
        reached95 = true;
        timeTo95Minutes = Number((simTimeSeconds / 60).toFixed(1));
        break;
      }
    }

    const finalPercentage = Number(((currentCount / numPhones) * 100).toFixed(1));

    return {
      numPhones,
      targetEventId: this.targetEvent.id,
      reached95,
      timeTo95Minutes: reached95 ? timeTo95Minutes : Number((simTimeSeconds / 60).toFixed(1)),
      totalSimMinutes: Number((simTimeSeconds / 60).toFixed(1)),
      finalInfectedCount: currentCount,
      finalPercentage,
      totalEncounters,
      totalSyncSessions,
      spamEventsBlocked,
      badClockEventsRejected,
      milestones,
    };
  }
}
