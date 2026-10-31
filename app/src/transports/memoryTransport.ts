/**
 * In-memory Transport and Session pair for unit testing and simulator runs.
 */

import type { Session, Transport, PeerInfo } from './types';

export class MemorySession implements Session {
  public peerId: string;
  private receiver: ((bytes: Uint8Array) => void) | null = null;
  private pendingQueue: Uint8Array[] = [];
  public peerSession: MemorySession | null = null;
  public isClosed = false;

  constructor(peerId: string) {
    this.peerId = peerId;
  }

  public onReceive(cb: (bytes: Uint8Array) => void): () => void {
    this.receiver = cb;
    while (this.pendingQueue.length > 0) {
      const p = this.pendingQueue.shift();
      if (p) {
        try {
          cb(p);
        } catch {}
      }
    }
    return () => {
      if (this.receiver === cb) {
        this.receiver = null;
      }
      this.pendingQueue = [];
    };
  }

  public async send(bytes: Uint8Array): Promise<void> {
    if (this.isClosed) {
      return;
    }
    const copy = new Uint8Array(bytes);
    if (this.peerSession) {
      if (this.peerSession.receiver) {
        queueMicrotask(() => {
          if (this.peerSession?.receiver) {
            this.peerSession.receiver(copy);
          }
        });
      } else {
        this.peerSession.pendingQueue.push(copy);
      }
    }
  }

  public clearPendingQueue(): void {
    this.pendingQueue = [];
  }

  public async close(): Promise<void> {
    this.isClosed = true;
  }
}

/**
 * Creates a connected pair of in-memory sessions for testing A <-> B.
 */
export function createMemorySessionPair(
  idA: string = 'peerA',
  idB: string = 'peerB'
): [MemorySession, MemorySession] {
  const sessionA = new MemorySession(idB);
  const sessionB = new MemorySession(idA);
  sessionA.peerSession = sessionB;
  sessionB.peerSession = sessionA;
  return [sessionA, sessionB];
}

export class MemoryTransport implements Transport {
  public id = 'fake' as const;
  private peerCallbacks: ((peer: PeerInfo) => void)[] = [];
  private sessionMap = new Map<string, MemorySession>();

  public async isAvailable(): Promise<boolean> {
    return true;
  }

  public async startDiscovery(): Promise<void> {}

  public async stopDiscovery(): Promise<void> {}

  public onPeerFound(cb: (peer: PeerInfo) => void): void {
    this.peerCallbacks.push(cb);
  }

  public registerSession(peerId: string, session: MemorySession): void {
    this.sessionMap.set(peerId, session);
  }

  public async connect(peerId: string): Promise<Session> {
    const existing = this.sessionMap.get(peerId);
    if (!existing) {
      throw new Error(`No memory session registered for ${peerId}`);
    }
    return existing;
  }
}
