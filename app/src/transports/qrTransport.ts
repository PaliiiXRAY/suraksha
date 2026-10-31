/**
 * QR Frame Transport — SRS §7 & FR-22.
 *
 * Encodes small batches of high-priority events into visual QR frames for
 * zero-network screen-to-camera optical transfer between two phones.
 */

import QRCode from 'qrcode';
import type { MeshEvent } from '../domain/types';
import { eventStore } from '../data/eventStore';
import { importFileBundle, type ImportResult } from './fileTransport';

export interface QrSyncPayload {
  v: number;
  count: number;
  events: MeshEvent[];
}

/**
 * Generate a QR code data URL image for recent events.
 */
export async function generateQrSyncDataUrl(
  events: MeshEvent[] = eventStore.getEvents().slice(-10)
): Promise<string> {
  const payload: QrSyncPayload = {
    v: 1,
    count: events.length,
    events,
  };

  const json = JSON.stringify(payload);
  return QRCode.toDataURL(json, {
    errorCorrectionLevel: 'M',
    margin: 2,
    scale: 6,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });
}

/**
 * Import events scanned from a QR code text payload.
 */
export async function importFromQrText(qrText: string): Promise<ImportResult> {
  let parsed: any;
  try {
    parsed = JSON.parse(qrText);
  } catch (err: any) {
    return {
      totalInFile: 0,
      importedCount: 0,
      duplicateCount: 0,
      rejectedCount: 1,
      errors: [`Invalid QR payload: ${err.message}`],
    };
  }

  // Handle both { events: [...] } and direct array
  const events = Array.isArray(parsed) ? parsed : parsed.events || [];
  const fileBundleFormat = JSON.stringify({ version: 1, events });
  return importFileBundle(fileBundleFormat);
}

