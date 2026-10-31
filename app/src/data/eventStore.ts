/**
 * Persistent local event store.
 * Stores validated, signed MeshEvents in IndexedDB (reliable on Android WebView
 * even when the OS kills the process) with a localStorage fallback for plain browsers.
 * Notifies subscribers synchronously after every mutation.
 */

import type { MeshEvent } from '../domain/types';
import { evictOldEvents, DEFAULT_MAX_EVENTS_STORAGE, type EvictionResult } from './eviction';

const IDB_NAME    = 'suraksha_events_db';
const IDB_STORE   = 'events';
const IDB_VERSION = 3; // Version 3 aligns events and identity stores

// Persistent localStorage keys — dual storage ensures data is NEVER lost even if WebView clears IDB
const PERSISTENT_STORAGE_KEY = 'suraksha_events_persistent_v1';
const LEGACY_KEY             = 'meshmap_events_store_v1';

type Listener = (events: MeshEvent[]) => void;

// ─────────────────────────────────────────────────────────────────────────────
// IndexedDB helpers
// ─────────────────────────────────────────────────────────────────────────────

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB unavailable'));
    }
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('identity')) {
        db.createObjectStore('identity', { keyPath: 'key' });
      }
    };
    req.onblocked = () => {
      console.warn('[EventStore] IDB upgrade blocked by another connection');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function idbGetAll(db: IDBDatabase): Promise<MeshEvent[]> {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).getAll();
    req.onsuccess = () => resolve(req.result as MeshEvent[]);
    req.onerror   = () => reject(req.error);
  });
}

async function idbPut(db: IDBDatabase, event: MeshEvent): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(event);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

async function idbPutMany(db: IDBDatabase, events: MeshEvent[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    for (const ev of events) store.put(ev);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

async function idbDelete(db: IDBDatabase, ids: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    for (const id of ids) store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// EventStore
// ─────────────────────────────────────────────────────────────────────────────

class EventStore {
  private events: MeshEvent[]      = [];
  private listeners: Set<Listener> = new Set();
  private db: IDBDatabase | null   = null;
  private _ready: Promise<void>;

  constructor() {
    this._ready = this.init();
  }

  /** Resolves when the store has loaded from IndexedDB and localStorage. */
  public get ready(): Promise<void> {
    return this._ready;
  }

  private async init(): Promise<void> {
    // Request persistent storage quota from Android / browser to prevent eviction
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().catch(() => {});
    }

    let idbEvents: MeshEvent[] = [];
    try {
      this.db = await openIDB();
      idbEvents = await idbGetAll(this.db);
    } catch (err) {
      console.warn('[EventStore] IDB unavailable or failed to open:', err);
    }

    // Always load local backup
    const localEvents = this.loadLocalStorage();

    // Take union by id so no event is lost regardless of which storage survived
    const eventMap = new Map<string, MeshEvent>();

    for (const ev of idbEvents) {
      if (ev && ev.id && !ev.sig?.startsWith('mock_sig')) {
        eventMap.set(ev.id, ev);
      }
    }
    for (const ev of localEvents) {
      if (ev && ev.id && !eventMap.has(ev.id) && !ev.sig?.startsWith('mock_sig')) {
        eventMap.set(ev.id, ev);
      }
    }

    this.events = Array.from(eventMap.values());

    // Synchronize both stores so both contain the complete set of events
    if (this.db && this.events.length > 0) {
      try {
        await idbPutMany(this.db, this.events);
      } catch (e) {
        console.warn('[EventStore] Failed syncing events to IDB:', e);
      }
    }
    this.saveToLocalStorage(this.events);

    this.notify();
  }

  private loadLocalStorage(): MeshEvent[] {
    try {
      if (typeof localStorage === 'undefined') return [];
      const primary = localStorage.getItem(PERSISTENT_STORAGE_KEY);
      if (primary) {
        return JSON.parse(primary) as MeshEvent[];
      }
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        return JSON.parse(legacy) as MeshEvent[];
      }
      return [];
    } catch {
      return [];
    }
  }

  private saveToLocalStorage(events: MeshEvent[]): void {
    try {
      if (typeof localStorage === 'undefined') return;
      const json = JSON.stringify(events);
      localStorage.setItem(PERSISTENT_STORAGE_KEY, json);
      localStorage.setItem(LEGACY_KEY, json);
    } catch (e) {
      console.warn('[EventStore] localStorage save failed:', e);
    }
  }

  public getEvents(): MeshEvent[] {
    return [...this.events];
  }

  public async addEvent(event: MeshEvent): Promise<void> {
    // Idempotent: ignore duplicate IDs (AT-7)
    if (this.events.some((e) => e.id === event.id)) return;

    this.events.push(event);

    // 1. Persist to IDB immediately if available
    if (this.db) {
      try {
        await idbPut(this.db, event);
      } catch (e) {
        console.warn('[EventStore] IDB write failed:', e);
      }
    }

    // 2. ALWAYS persist to localStorage synchronously (guaranteed to survive app swipe-kill)
    this.saveToLocalStorage(this.events);

    // Evict if over quota
    if (this.events.length > DEFAULT_MAX_EVENTS_STORAGE) {
      await this.enforceEviction();
    } else {
      this.notify();
    }
  }

  public async enforceEviction(maxLimit: number = DEFAULT_MAX_EVENTS_STORAGE): Promise<EvictionResult> {
    const res = evictOldEvents(this.events, maxLimit);
    if (res.evictedCount > 0) {
      const evictedIds = this.events
        .filter((e) => !res.remaining.some((r) => r.id === e.id))
        .map((e) => e.id);

      this.events = res.remaining;

      if (this.db) {
        try {
          await idbDelete(this.db, evictedIds);
        } catch (e) {
          console.warn('[EventStore] IDB delete failed during eviction:', e);
        }
      }
      this.saveToLocalStorage(this.events);
      this.notify();
    }
    return res;
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    // Fire immediately with current state (even if init is still running)
    listener([...this.events]);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const snapshot = [...this.events];
    this.listeners.forEach((fn) => {
      try { fn(snapshot); } catch (e) { console.error('[EventStore] listener error:', e); }
    });
  }
}

export const eventStore = new EventStore();
