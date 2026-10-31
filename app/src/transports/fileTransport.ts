/**
 * File Bundle Transport — SRS §7 & FR-23.
 *
 * Exports and imports signed event bundles as .json files for physical or
 * offline sharing between devices (Nearby Share, Bluetooth file transfer, SD card, or USB).
 */

import type { MeshEvent } from '../domain/types';
import { validateEvent } from '../domain/validate';
import { eventStore } from '../data/eventStore';
import { defaultRateLimiter } from '../sync/rateLimiter';

export interface FileBundle {
  version: number;
  app_id: string;
  exported_at: string;
  count: number;
  events: MeshEvent[];
}

export interface ImportResult {
  totalInFile: number;
  importedCount: number;
  duplicateCount: number;
  rejectedCount: number;
  errors: string[];
}

/**
 * Serialize an array of events into a downloadable FileBundle JSON string.
 */
export function createFileBundle(events: MeshEvent[] = eventStore.getEvents()): string {
  const bundle: FileBundle = {
    version: 1,
    app_id: 'meshmap-citizen-app',
    exported_at: new Date().toISOString(),
    count: events.length,
    events,
  };
  return JSON.stringify(bundle, null, 2);
}

/**
 * Browser helper: trigger a file download of the sync bundle.
 */
export function downloadFileBundle(events?: MeshEvent[]): void {
  const json = createFileBundle(events);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `meshmap-sync-${new Date().toISOString().slice(0, 19).replace(/[:]/g, '-')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Import a file bundle: verifies schema, validates every event signature and rate limits,
 * and adds new valid events to the event store.
 */
export async function importFileBundle(
  jsonText: string,
  targetStore = eventStore,
  rateLimiter = defaultRateLimiter
): Promise<ImportResult> {
  const result: ImportResult = {
    totalInFile: 0,
    importedCount: 0,
    duplicateCount: 0,
    rejectedCount: 0,
    errors: [],
  };

  let bundle: FileBundle;
  try {
    bundle = JSON.parse(jsonText);
  } catch (err: any) {
    result.errors.push(`Invalid JSON format: ${err.message}`);
    return result;
  }

  if (!bundle || !Array.isArray(bundle.events)) {
    result.errors.push('Bundle missing required "events" array');
    return result;
  }

  result.totalInFile = bundle.events.length;
  const existingIds = new Set(targetStore.getEvents().map((e) => e.id));

  for (const event of bundle.events) {
    // 1. Skip duplicates
    if (existingIds.has(event.id)) {
      result.duplicateCount++;
      continue;
    }

    // 2. Full cryptographic and schema validation
    const val = await validateEvent(event);
    if (!val.valid) {
      result.rejectedCount++;
      result.errors.push(`Event ${event.id || 'unknown'} rejected: ${val.reason}`);
      continue;
    }

    // 3. Rate limiter check (max 10 events/author/hr)
    const rateCheck = rateLimiter.checkLimit(event.author);
    if (!rateCheck.allowed) {
      result.rejectedCount++;
      result.errors.push(`Event ${event.id} rate limited: ${rateCheck.reason}`);
      continue;
    }

    // 4. Store event
    await Promise.resolve(targetStore.addEvent(event));
    rateLimiter.record(event.author);
    existingIds.add(event.id);
    result.importedCount++;
  }

  return result;
}

