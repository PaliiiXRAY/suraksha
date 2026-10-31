/**
 * Local device identity and HLC management.
 * Persists Ed25519 keypair in IndexedDB with fallback/migration from localStorage.
 * Ensures the device keeps its cryptographic identity across app restarts.
 */

import { generateKeyPair, type KeyPair, ensureSodium } from '../crypto/keys';
import { HLC } from '../domain/hlc';

const IDENTITY_KEY = 'meshmap_device_identity_v1';
const IDB_NAME = 'suraksha_events_db';
const IDB_STORE_IDENTITY = 'identity';
const IDB_VERSION = 3; // Version 3 ensures both events and identity stores coexist

export interface DeviceIdentity {
  keyPair: KeyPair;
  nodeId: string;
  hlc: HLC;
  tickHlc: () => string;
}

let _identityCache: DeviceIdentity | null = null;

function openIdentityDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB unavailable'));
    }
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('events')) {
        db.createObjectStore('events', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(IDB_STORE_IDENTITY)) {
        db.createObjectStore(IDB_STORE_IDENTITY, { keyPath: 'key' });
      }
    };
    req.onblocked = () => {
      console.warn('[Identity] IDB open blocked by pending connection');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getIdbIdentity(db: IDBDatabase): Promise<KeyPair | null> {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE_IDENTITY, 'readonly');
      const req = tx.objectStore(IDB_STORE_IDENTITY).get('device_keypair');
      req.onsuccess = () => resolve(req.result ? req.result.value : null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function putIdbIdentity(db: IDBDatabase, keyPair: KeyPair): Promise<void> {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE_IDENTITY, 'readwrite');
      tx.objectStore(IDB_STORE_IDENTITY).put({ key: 'device_keypair', value: keyPair });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function getDeviceIdentity(): Promise<DeviceIdentity> {
  if (_identityCache) {
    return _identityCache;
  }

  await ensureSodium();

  // Call navigator.storage.persist() per requirement 6
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(() => {});
  }

  let stored: KeyPair | null = null;
  let db: IDBDatabase | null = null;

  try {
    db = await openIdentityDB();
    stored = await getIdbIdentity(db);
  } catch (err) {
    console.warn('[Identity] IndexedDB not available for identity:', err);
  }

  // If not found in IndexedDB, check localStorage for migration
  if (!stored) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = localStorage.getItem(IDENTITY_KEY);
        if (raw) {
          stored = JSON.parse(raw);
          if (stored && db) {
            // Migrated from localStorage to IndexedDB!
            await putIdbIdentity(db, stored);
            console.info('[Identity] Successfully migrated identity keypair from localStorage to IndexedDB');
          }
        }
      }
    } catch (err) {
      console.warn('[Identity] Failed reading stored identity from localStorage:', err);
    }
  }

  // If still no stored identity, generate a new one
  if (!stored || !stored.publicKey || !stored.secretKey) {
    stored = await generateKeyPair();
    if (db) {
      await putIdbIdentity(db, stored);
    }
    // Also mirror to localStorage for extra resilience
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(IDENTITY_KEY, JSON.stringify(stored));
      }
    } catch (err) {
      console.warn('[Identity] Failed persisting fallback identity:', err);
    }
  }

  const nodeId = stored.publicKey.slice(0, 8);
  const hlc = new HLC(nodeId);

  _identityCache = {
    keyPair: stored,
    nodeId,
    hlc,
    tickHlc: () => hlc.tick(),
  };

  return _identityCache;
}
