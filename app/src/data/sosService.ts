import type { MeshEvent } from '../domain/types';
import { generateUlid } from '../domain/ulid';
import { encodeGeohash } from '../domain/geohash';
import { getDeviceIdentity } from './identity';
import { signEvent } from '../crypto/sign';
import { validateEvent } from '../domain/validate';
import { encryptPrivateField, verifyGovSignature } from '../crypto/gov';
import { eventStore } from './eventStore';
import {
  saveSosToOutbox,
  getAllSosFromOutbox,
  updateSosStatus,
  updateSosRetry,
  type SosOutboxEntry,
  type SosStatus,
  type SosBundle,
} from './indexedDbOutbox';

export const GOV_API_BASE =
  typeof window !== 'undefined' && (window as any).__GOV_API_BASE__
    ? (window as any).__GOV_API_BASE__
    : 'http://localhost:4000';

type SosListener = (entries: SosOutboxEntry[]) => void;

class SosService {
  private listeners: Set<SosListener> = new Set();
  private inFlightUpload: Promise<void> | null = null;
  private hasQueuedRun = false;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.triggerUpload();
      });
      // Start background poll / retry loop every 3 seconds
      this.timer = setInterval(() => {
        this.triggerUpload();
      }, 3000);
    }
  }

  public subscribe(listener: SosListener): () => void {
    this.listeners.add(listener);
    this.refresh();
    return () => {
      this.listeners.delete(listener);
    };
  }

  public async refresh() {
    const list = await getAllSosFromOutbox();
    this.notify(list);
  }

  private notify(list: SosOutboxEntry[]) {
    this.listeners.forEach((fn) => {
      try {
        fn(list);
      } catch (err) {
        console.error('[SosService] Listener error:', err);
      }
    });
  }

  /**
   * Create an emergency SOS bundle, queue in IndexedDB outbox, and attempt delivery.
   */
  public async createAndQueueSos(params: {
    lat: number;
    lon: number;
    text: string;
    peopleCount: number;
    injuryType?: string;
    contactInfo?: string;
    medicalNotes?: string;
  }): Promise<SosOutboxEntry> {
    const identity = await getDeviceIdentity();
    const hlcStr = identity.tickHlc();
    const sosId = generateUlid();
    const featureId = encodeGeohash(params.lat, params.lon, 9);

    // 1. Build signed SOS event (SRS §8.1)
    const unsigned: Omit<MeshEvent, 'sig'> = {
      id: sosId,
      v: 1,
      kind: 'SOS',
      type: params.injuryType || 'other',
      feature_id: featureId,
      ref: null,
      lat: Number(params.lat.toFixed(6)),
      lon: Number(params.lon.toFixed(6)),
      severity: 3, // SOS is always critical severity
      text: params.text.trim() || 'EMERGENCY SOS: Immediate assistance requested.',
      qty: params.peopleCount,
      hlc: hlcStr,
      device_time: new Date().toISOString(),
      author: identity.keyPair.publicKey,
      ttl_hours: 48,
    };

    const signedSos = await signEvent(unsigned, identity.keyPair.secretKey);
    const validCheck = await validateEvent(signedSos);
    if (!validCheck.valid) {
      throw new Error(`Failed to validate SOS event: ${validCheck.reason}`);
    }

    // 2. Encrypt private sensitive data to Gov Public Key using sealed box
    const encryptedPrivate = await encryptPrivateField({
      contact: params.contactInfo || '',
      medical: params.medicalNotes || '',
      note: params.text,
      timestamp: new Date().toISOString(),
    });

    // 3. Compact snapshot of local event store (excluding large binary tiles)
    const eventsSnapshot = eventStore.getEvents().slice(-50); // latest 50 events

    // 4. Construct SOS bundle (Appendix A.2)
    const bundle: SosBundle = {
      sos_event: signedSos,
      events: eventsSnapshot,
      private: encryptedPrivate,
      client: {
        app_version: '1.0.0',
        sent_via: 'direct',
        gateway_key: null,
      },
    };

    // 5. Store in IndexedDB outbox with status 'created'
    const entry: SosOutboxEntry = {
      sos_id: sosId,
      status: 'created',
      bundle,
      retry_count: 0,
      next_retry_at: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ack_event: null,
    };

    await saveSosToOutbox(entry);

    // 6. Also add SOS event to local eventStore so it is visible locally
    await eventStore.addEvent(signedSos);

    await this.refresh();

    // 7. Immediate delivery attempt if online
    this.triggerUpload();

    return entry;
  }

  /**
   * Main upload worker: handles direct upload with exponential back-off
   * and polls for official government SOS_ACK.
   */
  public async triggerUpload(): Promise<void> {
    if (this.inFlightUpload) {
      this.hasQueuedRun = true;
      return this.inFlightUpload;
    }

    this.inFlightUpload = (async () => {
      try {
        let shouldRun = true;
        while (shouldRun) {
          this.hasQueuedRun = false;
          await this.processOutbox();
          shouldRun = this.hasQueuedRun;
        }
      } finally {
        this.inFlightUpload = null;
      }
    })();

    return this.inFlightUpload;
  }

  private async processOutbox(): Promise<void> {
    const outbox = await getAllSosFromOutbox();
    const now = Date.now();

    for (const item of outbox) {
      if (item.status === 'acknowledged') continue;

      // If 'created' or 'relayed', attempt direct upload
      if (item.status === 'created' || item.status === 'relayed') {
        if (now < item.next_retry_at) continue;

        try {
          const res = await fetch(`${GOV_API_BASE}/v1/sos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.bundle),
          });

          if (res.status === 202) {
            // Successfully received by authorities!
            await updateSosStatus(item.sos_id, 'received');
            console.info(`[SosService] SOS ${item.sos_id} uploaded successfully -> RECEIVED`);
          } else {
            // Retry with exponential back-off
            const nextRetry = this.calcBackoff(item.retry_count);
            await updateSosRetry(item.sos_id, item.retry_count + 1, now + nextRetry);
          }
        } catch (err) {
          // Offline / network failure -> schedule back-off retry
          const nextRetry = this.calcBackoff(item.retry_count);
          await updateSosRetry(item.sos_id, item.retry_count + 1, now + nextRetry);
        }
      }

      // If 'received', check for official government ACK
      if (item.status === 'received') {
        try {
          const res = await fetch(`${GOV_API_BASE}/v1/official`);
          if (res.ok) {
            const data = await res.json();
            const events: MeshEvent[] = data.events || [];

            // Find matching ACK
            const ack = events.find(
              (ev) => ev.kind === 'SOS_ACK' && ev.ref === item.sos_id
            );

            if (ack) {
              // Verify signature against embedded Gov Public Key
              const isValidGovSig = await verifyGovSignature(ack);
              if (isValidGovSig) {
                await updateSosStatus(item.sos_id, 'acknowledged', ack);
                await eventStore.addEvent(ack);
                console.info(`[SosService] SOS ${item.sos_id} ACK verified -> ACKNOWLEDGED!`);
              } else {
                console.warn(`[SosService] Rejected forged/invalid SOS_ACK for ${item.sos_id}`);
              }
            }
          }
        } catch (err) {
          // Network still down or server unreachable, will retry next tick
        }
      }
    }

    await this.refresh();
  }

  private calcBackoff(retryCount: number): number {
    // 2s, 4s, 8s, 16s, max 60s
    const delaySec = Math.min(2 * Math.pow(2, retryCount), 60);
    return delaySec * 1000;
  }
}

export const sosService = new SosService();

