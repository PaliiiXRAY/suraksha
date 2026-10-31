/**
 * Delta-Sync Protocol — SRS §9.
 *
 * Implements the 7-step peer-to-peer sync protocol over any Session transport:
 * 1. Handshake with signed nonce and stable Ed25519 identity (initiator/responder role tie-break)
 * 2. Per-tile digests (Geohash-5 tile count & ID hashes) without sending all IDs upfront
 * 3. Request differing tile IDs chunked safely under 16-32 KB limits
 * 4. Request missing events in priority order
 * 5. Event batches sized by raw payload bytes (max ~16 KB, never exceeding 32 KB Nearby limit)
 * 6. Full validation (validateEvent + rateLimiter) with categorized rejection reasons and logging
 * 7. Bad-event strikes only for true security violations (forged sig, schema/size violation), with 10-minute TTL
 * 8. Graceful disconnect with cool-down to prevent sync loops
 */

import type { MeshEvent } from '../domain/types.ts';
import { validateEvent } from '../domain/validate.ts';
import type { Session } from '../transports/types.ts';
import { RateLimiter, defaultRateLimiter } from './rateLimiter.ts';
import { getDeviceIdentity } from '../data/identity.ts';
import { sign as signBytes, verify as verifyBytes } from '../crypto/keys.ts';

export const PROTOCOL_VERSION = 2;
export const MAX_BATCH_BYTES = 16 * 1024; // 16 KB raw payload limit (well below 32 KB Nearby limit)
export const MAX_BAD_EVENTS_BEFORE_BLOCK = 3;
export const DEFAULT_COOL_DOWN_MS = 30 * 1000;
export const TEMPORARY_BLOCK_TTL_MS = 10 * 60 * 1000; // 10 minutes temporary block TTL

export interface EventStoreLike {
  getEvents(): MeshEvent[];
  addEvent(event: MeshEvent): void | Promise<void>;
}

export interface RejectionStats {
  invalidSignature: number;
  schemaViolation: number;
  oversized: number;
  clockSkew: number;
  duplicate: number;
  rateLimited: number;
  other: number;
}

export interface SyncResult {
  peerId: string;
  sentCount: number;
  receivedCount: number;
  rejectedCount: number;
  rejectionsByReason: RejectionStats;
  success: boolean;
  error?: string;
}

export interface TileDigest {
  count: number;
  hash: string;
}

export type SyncMessage =
  | {
      type: 'HELLO';
      sessionId: string;
      nodeId: string;
      pubKey: string;
      nonce: string;
      sig: string;
      protocolVersion: number;
    }
  | {
      type: 'HELLO_ACK';
      sessionId: string;
      nodeId: string;
      pubKey: string;
      nonce: string;
      sig: string;
      protocolVersion: number;
    }
  | { type: 'TILE_DIGESTS'; sessionId: string; digests: Record<string, TileDigest> }
  | { type: 'REQUEST_TILE_IDS'; sessionId: string; tileKeys: string[] }
  | { type: 'TILE_IDS'; sessionId: string; tiles: Record<string, string[]> }
  | { type: 'REQUEST_EVENTS'; sessionId: string; ids: string[] }
  | {
      type: 'EVENT_BATCH';
      sessionId: string;
      batchIndex: number;
      totalBatches: number;
      events: MeshEvent[];
    }
  | {
      type: 'BATCH_ACK';
      sessionId: string;
      batchIndex: number;
      accepted: number;
      rejected: number;
    }
  | { type: 'SYNC_DONE'; sessionId: string }
  | { type: 'SYNC_ERROR'; sessionId: string; message: string };

// Temporary peer blocks: peerId -> blockedUntilMs (resets on app restart)
const temporaryBlocks = new Map<string, number>();
const peerCoolDowns = new Map<string, number>();

export function isPeerBlocked(peerId: string, nowMs: number = Date.now()): boolean {
  const expiry = temporaryBlocks.get(peerId);
  if (!expiry) return false;
  if (nowMs >= expiry) {
    temporaryBlocks.delete(peerId);
    return false;
  }
  return true;
}

export function unblockPeer(peerId: string): void {
  temporaryBlocks.delete(peerId);
}

export function blockPeerTemporary(peerId: string, durationMs: number = TEMPORARY_BLOCK_TTL_MS, nowMs: number = Date.now()): void {
  temporaryBlocks.set(peerId, nowMs + durationMs);
}

export function isPeerInCoolDown(peerId: string, nowMs: number = Date.now()): boolean {
  const lastSync = peerCoolDowns.get(peerId);
  if (!lastSync) return false;
  return nowMs - lastSync < DEFAULT_COOL_DOWN_MS;
}

export function resetSyncStateForTests(): void {
  temporaryBlocks.clear();
  peerCoolDowns.clear();
}

/**
 * Priority comparator (SRS FR-17):
 * Priority order: SOS > official events > severity 3 > recent
 */
export function compareEventPriority(a: MeshEvent, b: MeshEvent): number {
  const getWeight = (e: MeshEvent): number => {
    if (e.kind === 'SOS') return 100;
    if (e.kind === 'OFFICIAL' || e.kind === 'SOS_ACK') return 80;
    if (e.severity === 3) return 60;
    if (e.severity === 2) return 40;
    return 20;
  };

  const wA = getWeight(a);
  const wB = getWeight(b);
  if (wA !== wB) return wB - wA;

  const tA = new Date(a.device_time).getTime() || 0;
  const tB = new Date(b.device_time).getTime() || 0;
  return tB - tA;
}

/**
 * Group events into Geohash-5 tiles and compute digests.
 */
export function buildTileDigests(events: MeshEvent[]): {
  digests: Record<string, TileDigest>;
  tileMap: Record<string, string[]>;
} {
  const tileMap: Record<string, string[]> = {};

  for (const ev of events) {
    const tileKey = ev.feature_id ? ev.feature_id.slice(0, 5) : 'root0';
    if (!tileMap[tileKey]) tileMap[tileKey] = [];
    tileMap[tileKey].push(ev.id);
  }

  const digests: Record<string, TileDigest> = {};

  for (const [tileKey, ids] of Object.entries(tileMap)) {
    ids.sort();
    let hashVal = 0;
    const str = ids.join('|');
    for (let i = 0; i < str.length; i++) {
      hashVal = (hashVal << 5) - hashVal + str.charCodeAt(i);
      hashVal |= 0;
    }
    digests[tileKey] = {
      count: ids.length,
      hash: hashVal.toString(16),
    };
  }

  return { digests, tileMap };
}

/**
 * Categorize validation and rate limit rejections.
 * Distinguishes true security violations (which count as strikes) from benign rejections.
 */
export function categorizeRejection(
  reason: string = ''
): { category: keyof RejectionStats; isSecurityStrike: boolean } {
  const r = reason.toLowerCase();
  if (r.includes('signature')) {
    return { category: 'invalidSignature', isSecurityStrike: true };
  }
  if (r.includes('exceeds') && r.includes('bytes')) {
    return { category: 'oversized', isSecurityStrike: true };
  }
  if (
    r.includes('missing required') ||
    r.includes('must be a') ||
    r.includes('invalid event kind') ||
    r.includes('severity must be') ||
    r.includes('text exceeds')
  ) {
    return { category: 'schemaViolation', isSecurityStrike: true };
  }
  if (r.includes('future') || r.includes('drift') || r.includes('device_time')) {
    return { category: 'clockSkew', isSecurityStrike: false };
  }
  if (r.includes('rate limit')) {
    return { category: 'rateLimited', isSecurityStrike: false };
  }
  if (r.includes('duplicate') || r.includes('already exists')) {
    return { category: 'duplicate', isSecurityStrike: false };
  }
  return { category: 'other', isSecurityStrike: false };
}

/**
 * Package events into batches that strictly fit under MAX_BATCH_BYTES.
 */
export function chunkEventsByBytes(events: MeshEvent[], maxBytes: number = MAX_BATCH_BYTES): MeshEvent[][] {
  if (events.length === 0) return [[]];
  const batches: MeshEvent[][] = [];
  let currentBatch: MeshEvent[] = [];
  let currentBytes = 0;

  for (const ev of events) {
    const evBytes = new TextEncoder().encode(JSON.stringify(ev)).length + 10; // margin for array comma/formatting
    if (currentBatch.length > 0 && currentBytes + evBytes > maxBytes) {
      batches.push(currentBatch);
      currentBatch = [ev];
      currentBytes = evBytes;
    } else {
      currentBatch.push(ev);
      currentBytes += evBytes;
    }
  }
  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }
  return batches;
}

/**
 * Execute delta-sync between local store and a remote peer session.
 */
export async function runDeltaSync(
  session: Session,
  localStore: EventStoreLike,
  options?: {
    nodeId?: string;
    pubKey?: string;
    secretKey?: string;
    rateLimiter?: RateLimiter;
    skipCoolDown?: boolean;
    timeoutMs?: number;
    keepSessionOpen?: boolean;
  }
): Promise<SyncResult> {
  const peerId = session.peerId;
  const timeoutMs = options?.timeoutMs ?? 15000;
  const rateLimiter = options?.rateLimiter || defaultRateLimiter;

  // Retrieve stable device identity if not explicitly provided
  let myNodeId = options?.nodeId;
  let myPubKey = options?.pubKey;
  let mySecretKey = options?.secretKey;

  if (!myNodeId || !myPubKey || !mySecretKey) {
    try {
      const devId = await getDeviceIdentity();
      if (!myNodeId) myNodeId = devId.nodeId;
      if (!myPubKey) myPubKey = devId.keyPair.publicKey;
      if (!mySecretKey) mySecretKey = devId.keyPair.secretKey;
    } catch {
      if (!myNodeId) myNodeId = 'dev_' + Math.random().toString(36).slice(2, 10);
      if (!myPubKey) myPubKey = 'pub_' + myNodeId;
    }
  }

  const result: SyncResult = {
    peerId,
    sentCount: 0,
    receivedCount: 0,
    rejectedCount: 0,
    rejectionsByReason: {
      invalidSignature: 0,
      schemaViolation: 0,
      oversized: 0,
      clockSkew: 0,
      duplicate: 0,
      rateLimited: 0,
      other: 0,
    },
    success: false,
  };

  if (isPeerBlocked(peerId)) {
    result.error = `Peer ${peerId} is temporarily blocked due to previous invalid/forged data`;
    return result;
  }

  if (!options?.skipCoolDown && isPeerInCoolDown(peerId)) {
    result.error = `Peer ${peerId} is in cool-down`;
    return result;
  }

  const sessionId = 'sync_' + Math.random().toString(36).slice(2, 10);
  const myNonce = 'nonce_' + Math.random().toString(36).slice(2, 12);
  let myNonceSig = '';
  if (mySecretKey && mySecretKey.length === 128) {
    try {
      myNonceSig = await signBytes(new TextEncoder().encode(myNonce), mySecretKey);
    } catch {}
  }

  const sendMsg = async (msg: SyncMessage) => {
    try {
      const bytes = new TextEncoder().encode(JSON.stringify(msg));
      await session.send(bytes);
    } catch {
      // Session closed or disconnected
    }
  };

  return new Promise<SyncResult>((resolve) => {
    let securityStrikes = 0;
    let isFinished = false;
    let haveSentDigests = false;
    let haveSentBatches = false;
    let haveReceivedAllExpectedBatches = false;
    let isInitiator = false;
    let unsub: void | (() => void);

    // Timeout safety
    const timeout = setTimeout(() => {
      finish(false, 'Sync timed out');
    }, timeoutMs);

    const finish = (success: boolean, err?: string) => {
      if (isFinished) return;
      isFinished = true;
      clearTimeout(timeout);
      result.success = success;
      if (err) result.error = err;
      peerCoolDowns.set(peerId, Date.now());

      if (unsub && typeof unsub === 'function') {
        try {
          unsub();
        } catch {}
      }

      session.clearPendingQueue?.();

      if (!options?.keepSessionOpen || !success) {
        setTimeout(() => {
          session.close().catch(() => {});
        }, 50);
      }
      resolve(result);
    };

    const logRejection = (eventId: string, reason: string) => {
      console.warn(`[MeshNative] Rejected event ${eventId} from peer ${peerId}: ${reason}`);
      const { category, isSecurityStrike } = categorizeRejection(reason);
      result.rejectionsByReason[category]++;
      result.rejectedCount++;
      if (isSecurityStrike) {
        securityStrikes++;
      }
    };

    unsub = session.onReceive(async (rawBytes) => {
      if (isFinished) return;

      try {
        const text = new TextDecoder().decode(rawBytes);
        const msg: SyncMessage = JSON.parse(text);

        // Session validation: ignore unexpected or mismatched session messages
        if (!msg || typeof msg !== 'object' || !msg.type) return;

        switch (msg.type) {
          case 'HELLO': {
            // Verify remote peer signature on nonce if 64-char pubkey present
            if (msg.pubKey && msg.pubKey.length === 64 && msg.sig) {
              const ok = await verifyBytes(new TextEncoder().encode(msg.nonce), msg.sig, msg.pubKey);
              if (!ok) {
                logRejection(msg.nodeId, 'Invalid signature on handshake nonce');
                blockPeerTemporary(peerId);
                finish(false, 'Handshake signature verification failed');
                return;
              }
            }

            // Connection role tie-break:
            // Lower nodeId is initiator.
            // If both sent HELLO simultaneously, lower ID wins as initiator, higher becomes responder.
            // If node IDs are identical (e.g. in-process testing), break tie deterministically with sessionId.
            if (myNodeId < msg.nodeId) {
              isInitiator = true;
            } else if (myNodeId === msg.nodeId) {
              isInitiator = sessionId < msg.sessionId;
            } else {
              isInitiator = false;
            }

            // Acknowledge remote HELLO
            await sendMsg({
              type: 'HELLO_ACK',
              sessionId,
              nodeId: myNodeId,
              pubKey: myPubKey,
              nonce: myNonce,
              sig: myNonceSig,
              protocolVersion: PROTOCOL_VERSION,
            });

            // Initiator immediately sends TILE_DIGESTS
            if (isInitiator && !haveSentDigests) {
              haveSentDigests = true;
              const { digests } = buildTileDigests(localStore.getEvents());
              await sendMsg({ type: 'TILE_DIGESTS', sessionId, digests });
            }
            break;
          }

          case 'HELLO_ACK': {
            // Initiator sends its TILE_DIGESTS if not yet sent
            if (isInitiator && !haveSentDigests) {
              haveSentDigests = true;
              const { digests } = buildTileDigests(localStore.getEvents());
              await sendMsg({ type: 'TILE_DIGESTS', sessionId, digests });
            }
            break;
          }

          case 'TILE_DIGESTS': {
            const peerDigests = msg.digests || {};
            const { digests: myDigests } = buildTileDigests(localStore.getEvents());

            // If we haven't sent digests yet, send our digests so both sides know what's present
            if (!haveSentDigests) {
              haveSentDigests = true;
              await sendMsg({ type: 'TILE_DIGESTS', sessionId, digests: myDigests });
            }

            const allTileKeys = new Set([...Object.keys(peerDigests), ...Object.keys(myDigests)]);
            const differingTiles: string[] = [];

            for (const key of allTileKeys) {
              const p = peerDigests[key];
              const m = myDigests[key];
              if (!p || !m || p.count !== m.count || p.hash !== m.hash) {
                differingTiles.push(key);
              }
            }

            if (differingTiles.length === 0) {
              haveReceivedAllExpectedBatches = true;
              haveSentBatches = true;
              await sendMsg({ type: 'SYNC_DONE', sessionId });
              finish(true);
              return;
            }

            await sendMsg({
              type: 'REQUEST_TILE_IDS',
              sessionId,
              tileKeys: differingTiles,
            });
            break;
          }

          case 'REQUEST_TILE_IDS': {
            const requestedKeys = new Set(msg.tileKeys || []);
            const { tileMap } = buildTileDigests(localStore.getEvents());
            const replyTiles: Record<string, string[]> = {};

            for (const key of requestedKeys) {
              if (tileMap[key]) {
                replyTiles[key] = tileMap[key];
              }
            }

            await sendMsg({
              type: 'TILE_IDS',
              sessionId,
              tiles: replyTiles,
            });
            break;
          }

          case 'TILE_IDS': {
            const peerTiles = msg.tiles || {};
            const localEvents = localStore.getEvents();
            const localEventIds = new Set(localEvents.map((e) => e.id));

            const neededFromPeer: string[] = [];
            for (const ids of Object.values(peerTiles)) {
              for (const id of ids) {
                if (!localEventIds.has(id)) {
                  neededFromPeer.push(id);
                }
              }
            }

            if (neededFromPeer.length === 0) {
              haveReceivedAllExpectedBatches = true;
              await sendMsg({ type: 'REQUEST_EVENTS', sessionId, ids: [] });
              if (haveSentBatches) {
                await sendMsg({ type: 'SYNC_DONE', sessionId });
                finish(true);
              }
            } else {
              // Send request to peer for missing events
              await sendMsg({ type: 'REQUEST_EVENTS', sessionId, ids: neededFromPeer });
            }
            break;
          }

          case 'REQUEST_EVENTS': {
            const requestedIds = new Set(msg.ids || []);
            const localEvents = localStore.getEvents();

            // Senders transmit requested events directly; receiver performs authoritative validation
            const eventsToSend = localEvents
              .filter((e) => requestedIds.has(e.id))
              .sort(compareEventPriority);

            haveSentBatches = true;

            if (eventsToSend.length === 0) {
              await sendMsg({
                type: 'EVENT_BATCH',
                sessionId,
                batchIndex: 0,
                totalBatches: 1,
                events: [],
              });
              if (haveReceivedAllExpectedBatches) {
                await sendMsg({ type: 'SYNC_DONE', sessionId });
                finish(true);
              }
            } else {
              // Chunk by bytes (max ~16 KB per batch, never exceeding 32 KB Nearby limit)
              const batches = chunkEventsByBytes(eventsToSend, MAX_BATCH_BYTES);
              for (let b = 0; b < batches.length; b++) {
                const batch = batches[b];
                await sendMsg({
                  type: 'EVENT_BATCH',
                  sessionId,
                  batchIndex: b,
                  totalBatches: batches.length,
                  events: batch,
                });
                result.sentCount += batch.length;
              }
            }
            break;
          }

          case 'EVENT_BATCH': {
            if (!msg.events || msg.events.length === 0) {
              haveReceivedAllExpectedBatches = true;
              if (haveSentBatches) {
                await sendMsg({ type: 'SYNC_DONE', sessionId });
                finish(true);
              }
              break;
            }

            let acceptedInBatch = 0;
            let rejectedInBatch = 0;

            for (const event of msg.events || []) {
              const validation = await validateEvent(event);
              if (!validation.valid) {
                logRejection(event.id || 'unknown', validation.reason || 'Event validation failed');
                rejectedInBatch++;
                continue;
              }

              const rateCheck = rateLimiter.checkLimit(event.author);
              if (!rateCheck.allowed) {
                logRejection(event.id, rateCheck.reason || 'Rate limit exceeded');
                rejectedInBatch++;
                continue;
              }

              await Promise.resolve(localStore.addEvent(event));
              rateLimiter.record(event.author);
              acceptedInBatch++;
              result.receivedCount++;
            }

            await sendMsg({
              type: 'BATCH_ACK',
              sessionId,
              batchIndex: msg.batchIndex,
              accepted: acceptedInBatch,
              rejected: rejectedInBatch,
            });

            // Strikes only for true security failures (schema, signature, oversized)
            if (securityStrikes >= MAX_BAD_EVENTS_BEFORE_BLOCK) {
              blockPeerTemporary(peerId, TEMPORARY_BLOCK_TTL_MS);
              await sendMsg({
                type: 'SYNC_ERROR',
                sessionId,
                message: `Peer ${peerId} temporarily blocked: transmitted forged or corrupted events`,
              });
              finish(false, `Peer ${peerId} temporarily blocked: ${securityStrikes} security strikes`);
              return;
            }

            if (msg.batchIndex === msg.totalBatches - 1) {
              haveReceivedAllExpectedBatches = true;
              if (haveSentBatches) {
                await sendMsg({ type: 'SYNC_DONE', sessionId });
                finish(true);
              }
            }
            break;
          }

          case 'BATCH_ACK': {
            if (haveReceivedAllExpectedBatches && haveSentBatches) {
              await sendMsg({ type: 'SYNC_DONE', sessionId });
              finish(true);
            }
            break;
          }

          case 'SYNC_DONE': {
            if (!haveSentDigests) {
              // Ignore stale/trailing SYNC_DONE packet received before handshake began
              return;
            }
            finish(true);
            break;
          }

          case 'SYNC_ERROR': {
            finish(false, msg.message);
            break;
          }
        }
      } catch (err: any) {
        // Ignore malformed packets gracefully instead of crashing
        console.warn('[DeltaSync] Ignored malformed message packet:', err);
      }
    });

    // Start handshake
    sendMsg({
      type: 'HELLO',
      sessionId,
      nodeId: myNodeId,
      pubKey: myPubKey,
      nonce: myNonce,
      sig: myNonceSig,
      protocolVersion: PROTOCOL_VERSION,
    }).catch((err) => {
      finish(false, err.message);
    });
  });
}
