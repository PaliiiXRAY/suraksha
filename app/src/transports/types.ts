/**
 * Transport and Session interfaces — SRS §7.
 *
 * Pluggable transport abstraction decoupling the sync protocol from the underlying
 * radio/bearer (QR, file bundle, WebRTC, Nearby Connections, or in-memory test mocks).
 */

export type TransportId = 'qr' | 'file' | 'webrtc' | 'nearby' | 'fake';

export interface PeerInfo {
  id: string;
  name?: string;
  transportId: TransportId;
  metadata?: Record<string, unknown>;
}

export interface Session {
  peerId: string;
  send(bytes: Uint8Array): Promise<void>;
  onReceive(cb: (bytes: Uint8Array) => void): void | (() => void);
  close(): Promise<void>;
  clearPendingQueue?(): void;
}

export interface Transport {
  id: TransportId;
  isAvailable(): Promise<boolean>;
  startDiscovery(): Promise<void>;
  stopDiscovery(): Promise<void>;
  onPeerFound(cb: (peer: PeerInfo) => void): void;
  connect(peerId: string): Promise<Session>;
}

