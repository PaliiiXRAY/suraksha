/**
 * Nearby Connections Transport for Android — SRS §7 & FR-24.
 *
 * Connects the TypeScript delta-sync engine to Android's Nearby Connections
 * subsystem via the Kotlin MeshNative Capacitor plugin.
 * Enables autonomous screen-off background discovery and peer-to-peer sync.
 */

import { registerPlugin, Capacitor, type PluginListenerHandle } from '@capacitor/core';
import type { Transport, Session, PeerInfo } from './types';
import { eventStore } from '../data/eventStore';
import { getDeviceIdentity } from '../data/identity';
import { runDeltaSync, type SyncResult } from '../sync/deltaSync';

export interface MeshPermissionsStatus {
  location: boolean;
  nearbyDevices: boolean;
  notifications: boolean;
  sms: boolean;
  allGranted: boolean;
}

export interface MeshNativePlugin {
  startForegroundService(): Promise<{ success: boolean; message?: string }>;
  stopForegroundService(): Promise<{ success: boolean; message?: string }>;
  startDiscovery(options?: { serviceId?: string; nodeId?: string }): Promise<{ success: boolean; serviceId?: string }>;
  stopDiscovery(): Promise<{ success: boolean }>;
  restartDiscovery(options?: { serviceId?: string }): Promise<{ success: boolean; error?: string }>;
  connect(options: { peerId: string }): Promise<{ success: boolean; peerId?: string }>;
  disconnect(options: { peerId: string }): Promise<{ success: boolean }>;
  send(options: { peerId: string; data: string }): Promise<{ success: boolean }>;
  logEventRejection(options: { eventId: string; reason: string; peerId?: string }): Promise<{ success: boolean }>;
  sendSms(options: { number: string; text: string }): Promise<{ success: boolean; number?: string }>;
  getCurrentLocation(): Promise<{ lat: number; lon: number; accuracy?: number }>;
  checkMeshPermissions(): Promise<MeshPermissionsStatus>;
  requestMeshPermissions(): Promise<MeshPermissionsStatus>;

  addListener(
    eventName: 'peerFound',
    listener: (data: { peerId: string; name: string }) => void
  ): Promise<PluginListenerHandle>;

  addListener(
    eventName: 'peerLost',
    listener: (data: { peerId: string }) => void
  ): Promise<PluginListenerHandle>;

  addListener(
    eventName: 'connected',
    listener: (data: { peerId: string }) => void
  ): Promise<PluginListenerHandle>;

  addListener(
    eventName: 'disconnected',
    listener: (data: { peerId: string }) => void
  ): Promise<PluginListenerHandle>;

  addListener(
    eventName: 'receive',
    listener: (data: { peerId: string; data: string }) => void
  ): Promise<PluginListenerHandle>;

  addListener(
    eventName: 'meshError',
    listener: (data: { message: string }) => void
  ): Promise<PluginListenerHandle>;
}

export const MeshNative = registerPlugin<MeshNativePlugin>('MeshNative');

/**
 * Base64 conversions for byte transport between JS and Kotlin in safe chunks (max 32 KB per chunk)
 * to avoid stack overflow or memory pressure during large transmissions.
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  const CHUNK_SIZE = 0x8000; // 32768
  let binary = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, len));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Connected Nearby Connections Session between this device and an Android peer.
 */
export class NearbySession implements Session {
  public readonly peerId: string;
  private receiveCallbacks: ((bytes: Uint8Array) => void)[] = [];
  private pendingQueue: Uint8Array[] = [];
  public isClosed = false;

  constructor(peerId: string) {
    this.peerId = peerId;
  }

  public onReceive(cb: (bytes: Uint8Array) => void): () => void {
    this.receiveCallbacks.push(cb);
    // Flush any incoming packets buffered before listener was attached
    while (this.pendingQueue.length > 0) {
      const pending = this.pendingQueue.shift();
      if (pending) {
        try {
          cb(pending);
        } catch (err) {
          console.error(`[NearbySession] Error in flushed receiver callback:`, err);
        }
      }
    }
    return () => {
      const idx = this.receiveCallbacks.indexOf(cb);
      if (idx !== -1) {
        this.receiveCallbacks.splice(idx, 1);
      }
      this.pendingQueue = [];
    };
  }

  public dispatchBytes(bytes: Uint8Array): void {
    if (this.isClosed) return;
    if (this.receiveCallbacks.length === 0) {
      // Buffer packet until onReceive is registered
      this.pendingQueue.push(bytes);
      return;
    }
    for (const cb of this.receiveCallbacks) {
      try {
        cb(bytes);
      } catch (err) {
        console.error(`[NearbySession] Error in receiver callback for ${this.peerId}:`, err);
      }
    }
  }

  public async send(bytes: Uint8Array): Promise<void> {
    if (this.isClosed) {
      throw new Error(`Cannot send on closed NearbySession to ${this.peerId}`);
    }
    const dataBase64 = uint8ArrayToBase64(bytes);
    await MeshNative.send({ peerId: this.peerId, data: dataBase64 });
  }

  public clearPendingQueue(): void {
    this.pendingQueue = [];
  }

  public async close(): Promise<void> {
    if (this.isClosed) return;
    this.isClosed = true;
    this.receiveCallbacks = [];
    this.pendingQueue = [];
    try {
      await MeshNative.disconnect({ peerId: this.peerId });
    } catch (err) {
      console.warn(`[NearbySession] Error disconnecting from ${this.peerId}:`, err);
    }
  }
}

/**
 * Nearby Transport implementation conforming to SRS §7.
 */
export class NearbyTransport implements Transport {
  public readonly id = 'nearby' as const;
  public isMeshRunning = false;

  private activeSessions = new Map<string, NearbySession>();
  private peerFoundCallbacks: ((peer: PeerInfo) => void)[] = [];
  private syncCallbacks: ((res: { peerId: string; result: SyncResult }) => void)[] = [];
  private syncingPeers = new Set<string>();
  private pendingResyncPeers = new Set<string>();
  private listenersRegistered = false;
  private backgroundSyncTimer: any = null;
  private eventStoreUnsubscribe: (() => void) | null = null;
  private lastEventCount = 0;

  public async isAvailable(): Promise<boolean> {
    // Only available when running on Android inside Capacitor
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  }

  public getActiveSessions(): NearbySession[] {
    return Array.from(this.activeSessions.values()).filter((s) => !s.isClosed);
  }

  private async setupListeners(): Promise<void> {
    if (this.listenersRegistered) return;
    this.listenersRegistered = true;

    await MeshNative.addListener('peerFound', (data) => {
      console.info(`[NearbyTransport] Peer found: ${data.peerId} (${data.name})`);
      const peerInfo: PeerInfo = {
        id: data.peerId,
        name: data.name,
        transportId: 'nearby',
      };
      for (const cb of this.peerFoundCallbacks) {
        cb(peerInfo);
      }
      // Proactively ensure connection is requested whenever any phone appears in range
      if (!this.activeSessions.has(data.peerId)) {
        MeshNative.connect({ peerId: data.peerId }).catch(() => {});
      }
    });

    await MeshNative.addListener('peerLost', (data) => {
      console.info(`[NearbyTransport] Peer lost: ${data.peerId}`);
      const session = this.activeSessions.get(data.peerId);
      if (session) {
        session.isClosed = true;
        this.activeSessions.delete(data.peerId);
      }
      this.syncingPeers.delete(data.peerId);
      this.pendingResyncPeers.delete(data.peerId);
    });

    await MeshNative.addListener('connected', async (data) => {
      console.info(`[NearbyTransport] Connected to peer: ${data.peerId}`);
      let session = this.activeSessions.get(data.peerId);
      if (!session || session.isClosed) {
        session = new NearbySession(data.peerId);
        this.activeSessions.set(data.peerId, session);
      }
      // Autonomous mesh: allow Bluetooth RFCOMM socket 350ms to stabilize, then trigger delta-sync!
      setTimeout(() => {
        if (!session?.isClosed) {
          this.triggerAutoSync(session!);
        }
      }, 350);
    });

    await MeshNative.addListener('disconnected', (data) => {
      console.info(`[NearbyTransport] Disconnected from peer: ${data.peerId}`);
      const session = this.activeSessions.get(data.peerId);
      if (session) {
        session.isClosed = true;
        this.activeSessions.delete(data.peerId);
      }
      this.syncingPeers.delete(data.peerId);
      this.pendingResyncPeers.delete(data.peerId);
    });

    await MeshNative.addListener('receive', (data) => {
      let session = this.activeSessions.get(data.peerId);
      if (!session || session.isClosed) {
        session = new NearbySession(data.peerId);
        this.activeSessions.set(data.peerId, session);
      }
      try {
        const bytes = base64ToUint8Array(data.data);
        if (!this.syncingPeers.has(data.peerId)) {
          // Remote peer initiated delta sync; trigger auto sync to process
          this.triggerAutoSync(session);
        }
        session.dispatchBytes(bytes);
      } catch (err) {
        console.error(`[NearbyTransport] Failed to decode incoming payload from ${data.peerId}:`, err);
      }
    });
  }

  /**
   * Execute delta-sync between local eventStore and connected peer session.
   * Keeps session alive for continuous persistent background syncing.
   */
  public async triggerAutoSync(session: NearbySession): Promise<SyncResult | null> {
    const peerId = session.peerId;
    if (session.isClosed) return null;

    if (this.syncingPeers.has(peerId)) {
      return null;
    }
    this.syncingPeers.add(peerId);

    console.info(`[NearbyTransport] Starting autonomous delta-sync with peer ${peerId}...`);
    try {
      let identityOptions: { nodeId?: string; pubKey?: string } = {};
      try {
        const id = await getDeviceIdentity();
        identityOptions = { nodeId: id.nodeId, pubKey: id.keyPair.publicKey };
      } catch {}

      const result = await runDeltaSync(session, eventStore, {
        timeoutMs: 15000,
        skipCoolDown: true,
        keepSessionOpen: true,
        ...identityOptions,
      });
      console.info(
        `[NearbyTransport] DeltaSync complete with ${peerId}: sent=${result.sentCount}, received=${result.receivedCount}`
      );

      this.lastEventCount = eventStore.getEvents().length;

      for (const cb of this.syncCallbacks) {
        try {
          cb({ peerId, result });
        } catch (err) {
          console.error('[NearbyTransport] Error in sync callback:', err);
        }
      }
      return result;
    } catch (err) {
      console.error(`[NearbyTransport] Error during delta-sync with ${peerId}:`, err);
      return null;
    } finally {
      this.syncingPeers.delete(peerId);
      if (this.pendingResyncPeers.has(peerId)) {
        this.pendingResyncPeers.delete(peerId);
        if (!session.isClosed) {
          queueMicrotask(() => {
            this.triggerAutoSync(session);
          });
        }
      }
    }
  }

  /**
   * Trigger delta-sync across all active connected mesh peers.
   */
  public broadcastDeltaSync(): void {
    for (const session of this.activeSessions.values()) {
      if (!session.isClosed) {
        if (this.syncingPeers.has(session.peerId)) {
          this.pendingResyncPeers.add(session.peerId);
        } else {
          this.triggerAutoSync(session);
        }
      }
    }
  }

  private startBackgroundSyncLoop(): void {
    if (this.backgroundSyncTimer) return;
    this.backgroundSyncTimer = setInterval(() => {
      if (this.activeSessions.size === 0) return;
      for (const session of this.activeSessions.values()) {
        if (!session.isClosed && !this.syncingPeers.has(session.peerId)) {
          this.triggerAutoSync(session);
        }
      }
    }, 5000);
  }

  private stopBackgroundSyncLoop(): void {
    if (this.backgroundSyncTimer) {
      clearInterval(this.backgroundSyncTimer);
      this.backgroundSyncTimer = null;
    }
  }

  private startEventStoreSubscription(): void {
    if (this.eventStoreUnsubscribe) return;
    this.lastEventCount = eventStore.getEvents().length;
    this.eventStoreUnsubscribe = eventStore.subscribe((events) => {
      if (events.length > this.lastEventCount) {
        this.lastEventCount = events.length;
        this.broadcastDeltaSync();
      }
    });
  }

  public onSyncCompleted(cb: (res: { peerId: string; result: SyncResult }) => void): void {
    this.syncCallbacks.push(cb);
  }

  public async syncWithPeer(peerId: string): Promise<SyncResult | null> {
    const session = await this.connect(peerId);
    return await this.triggerAutoSync(session as NearbySession);
  }

  public async startDiscovery(): Promise<void> {
    if (this.isMeshRunning) return;
    this.isMeshRunning = true;

    if (!(await this.isAvailable())) {
      console.warn('[NearbyTransport] Not on native Android; Nearby discovery unavailable');
      return;
    }

    await this.setupListeners();

    // 1. Start foreground service to keep CPU alive with screen off (SRS §7 & FR-24)
    try {
      await MeshNative.startForegroundService();
    } catch (err) {
      console.warn('[NearbyTransport] Foreground service warning:', err);
    }

    // 2. Start Nearby Connections advertise + scan with persistent stable node ID
    let nodeId: string | undefined;
    try {
      const identity = await getDeviceIdentity();
      nodeId = `SUR_${identity.nodeId}`;
    } catch (e) {
      console.warn('[NearbyTransport] Could not retrieve device identity for discovery:', e);
    }
    await MeshNative.startDiscovery({ nodeId });

    // 3. Start background periodic refresh loop and eventStore change triggers
    this.startBackgroundSyncLoop();
    this.startEventStoreSubscription();
  }

  public async stopDiscovery(): Promise<void> {
    this.isMeshRunning = false;
    this.stopBackgroundSyncLoop();
    if (this.eventStoreUnsubscribe) {
      this.eventStoreUnsubscribe();
      this.eventStoreUnsubscribe = null;
    }

    for (const session of this.activeSessions.values()) {
      session.close().catch(() => {});
    }
    this.activeSessions.clear();
    this.syncingPeers.clear();
    this.pendingResyncPeers.clear();

    if (!(await this.isAvailable())) return;

    try {
      await MeshNative.stopDiscovery();
    } catch (err) {
      console.warn('[NearbyTransport] Error stopping discovery:', err);
    }

    try {
      await MeshNative.stopForegroundService();
    } catch (err) {
      console.warn('[NearbyTransport] Error stopping foreground service:', err);
    }
  }

  public async restartDiscovery(): Promise<void> {
    if (!(await this.isAvailable())) return;
    try {
      await MeshNative.restartDiscovery();
    } catch (err) {
      console.warn('[NearbyTransport] Error restarting discovery cycle:', err);
    }
  }

  public onPeerFound(cb: (peer: PeerInfo) => void): void {
    this.peerFoundCallbacks.push(cb);
  }

  public async connect(peerId: string): Promise<Session> {
    if (!(await this.isAvailable())) {
      throw new Error('Nearby transport is only available on native Android devices');
    }

    await this.setupListeners();

    let session = this.activeSessions.get(peerId);
    if (!session || session.isClosed) {
      session = new NearbySession(peerId);
      this.activeSessions.set(peerId, session);
    }

    await MeshNative.connect({ peerId });
    return session;
  }
}

export const nearbyTransport = new NearbyTransport();
