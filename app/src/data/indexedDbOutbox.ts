import type { MeshEvent } from '../domain/types';

export type SosStatus = 'created' | 'relayed' | 'received' | 'acknowledged';

export interface SosBundle {
  sos_event: MeshEvent;
  events: MeshEvent[];
  private: string;
  client: {
    app_version: string;
    sent_via: string;
    gateway_key: string | null;
  };
}

export interface SosOutboxEntry {
  sos_id: string;
  status: SosStatus;
  bundle: SosBundle;
  retry_count: number;
  next_retry_at: number;
  created_at: string;
  updated_at: string;
  ack_event?: MeshEvent | null;
}

const DB_NAME = 'meshmap_sos_db';
const STORE_NAME = 'sos_outbox';
const DB_VERSION = 1;

// In-memory fallback if IndexedDB is unavailable (e.g. in certain Node environments)
const memoryStore = new Map<string, SosOutboxEntry>();

function isIndexedDbSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDbSupported()) {
      return reject(new Error('IndexedDB not supported in this environment'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'sos_id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveSosToOutbox(entry: SosOutboxEntry): Promise<void> {
  if (!isIndexedDbSupported()) {
    memoryStore.set(entry.sos_id, entry);
    return;
  }

  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(entry);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getSosFromOutbox(sosId: string): Promise<SosOutboxEntry | undefined> {
  if (!isIndexedDbSupported()) {
    return memoryStore.get(sosId);
  }

  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(sosId);

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllSosFromOutbox(): Promise<SosOutboxEntry[]> {
  if (!isIndexedDbSupported()) {
    return Array.from(memoryStore.values());
  }

  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();

    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function updateSosStatus(
  sosId: string,
  status: SosStatus,
  ackEvent?: MeshEvent | null
): Promise<void> {
  const existing = await getSosFromOutbox(sosId);
  if (!existing) return;

  existing.status = status;
  existing.updated_at = new Date().toISOString();
  if (ackEvent) {
    existing.ack_event = ackEvent;
  }

  await saveSosToOutbox(existing);
}

export async function updateSosRetry(
  sosId: string,
  retryCount: number,
  nextRetryAt: number
): Promise<void> {
  const existing = await getSosFromOutbox(sosId);
  if (!existing) return;

  existing.retry_count = retryCount;
  existing.next_retry_at = nextRetryAt;
  existing.updated_at = new Date().toISOString();

  await saveSosToOutbox(existing);
}

export async function deleteSosFromOutbox(sosId: string): Promise<void> {
  if (!isIndexedDbSupported()) {
    memoryStore.delete(sosId);
    return;
  }

  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(sosId);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

