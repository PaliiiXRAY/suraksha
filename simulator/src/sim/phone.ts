import type { MeshEvent } from '../../../app/src/domain/types.ts';
import { HLC } from '../../../app/src/domain/hlc.ts';
import { RateLimiter } from '../../../app/src/sync/rateLimiter.ts';
import { generateKeyPair, type KeyPair } from '../../../app/src/crypto/keys.ts';
import type { EventStoreLike } from '../../../app/src/sync/deltaSync.ts';

export class SimEventStore implements EventStoreLike {
  public events: MeshEvent[] = [];
  private eventIds = new Set<string>();

  constructor(initial: MeshEvent[] = []) {
    for (const ev of initial) {
      this.addEvent(ev);
    }
  }

  public getEvents(): MeshEvent[] {
    return this.events;
  }

  public addEvent(event: MeshEvent): void {
    if (!this.eventIds.has(event.id)) {
      this.eventIds.add(event.id);
      this.events.push(event);
    }
  }

  public has(id: string): boolean {
    return this.eventIds.has(id);
  }
}

export interface PhoneOptions {
  id: string;
  x: number;
  y: number;
  speedMps?: number; // meters per second (~1.4 m/s walking speed)
  clockOffsetMs?: number; // for bad clock scenario (e.g. +3 days)
  isSpammer?: boolean; // for spam scenario
}

export class VirtualPhone {
  public readonly id: string;
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public readonly speed: number;
  public keyPair!: KeyPair;
  public hlc!: HLC;
  public readonly store: SimEventStore;
  public readonly rateLimiter: RateLimiter;
  public clockOffsetMs: number;
  public isSpammer: boolean;
  public coolDowns = new Map<string, number>(); // peerId -> timestampMs

  constructor(opts: PhoneOptions) {
    this.id = opts.id;
    this.x = opts.x;
    this.y = opts.y;
    this.speed = opts.speedMps ?? (1.0 + Math.random() * 0.8); // 1.0 - 1.8 m/s
    this.clockOffsetMs = opts.clockOffsetMs ?? 0;
    this.isSpammer = opts.isSpammer ?? false;

    // Random initial heading
    const angle = Math.random() * 2 * Math.PI;
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;

    this.store = new SimEventStore();
    this.rateLimiter = new RateLimiter(10, 3600 * 1000);
  }

  public async initKeys(): Promise<void> {
    this.keyPair = await generateKeyPair();
    const nodeId = this.keyPair.publicKey.slice(0, 8);
    this.hlc = new HLC(nodeId, Date.now() + this.clockOffsetMs);
  }

  public getEffectiveTime(simWallMs: number): number {
    return simWallMs + this.clockOffsetMs;
  }

  public hasEvent(id: string): boolean {
    return this.store.has(id);
  }

  public canSyncWith(peerId: string, currentSimTimeSeconds: number, coolDownSec: number = 30): boolean {
    const lastSync = this.coolDowns.get(peerId);
    if (!lastSync) return true;
    return currentSimTimeSeconds - lastSync >= coolDownSec;
  }

  public markSynced(peerId: string, currentSimTimeSeconds: number): void {
    this.coolDowns.set(peerId, currentSimTimeSeconds);
  }

  /**
   * Move phone according to velocity. Reflect off 5x5 km boundaries.
   * Occasionally perturb heading (random walk).
   */
  public stepMovement(dtSeconds: number, worldSizeMeters: number): void {
    // 5% chance per step to slightly change direction
    if (Math.random() < 0.05) {
      const angleDelta = (Math.random() - 0.5) * (Math.PI / 2);
      const curAngle = Math.atan2(this.vy, this.vx);
      const newAngle = curAngle + angleDelta;
      this.vx = Math.cos(newAngle) * this.speed;
      this.vy = Math.sin(newAngle) * this.speed;
    }

    this.x += this.vx * dtSeconds;
    this.y += this.vy * dtSeconds;

    // Bounce off world borders [0, worldSizeMeters]
    if (this.x < 0) {
      this.x = 0;
      this.vx = -this.vx;
    } else if (this.x > worldSizeMeters) {
      this.x = worldSizeMeters;
      this.vx = -this.vx;
    }

    if (this.y < 0) {
      this.y = 0;
      this.vy = -this.vy;
    } else if (this.y > worldSizeMeters) {
      this.y = worldSizeMeters;
      this.vy = -this.vy;
    }
  }
}
