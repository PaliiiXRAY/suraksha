import { describe, it, expect, beforeAll } from 'vitest';
import sodium from 'libsodium-wrappers';
import {
  GOV_ED25519_PK,
  GOV_CURVE25519_PK,
  encryptPrivateField,
  verifyGovSignature,
} from '../crypto/gov';
import { ensureSodium, generateKeyPair } from '../crypto/keys';
import { signEvent } from '../crypto/sign';
import {
  saveSosToOutbox,
  getSosFromOutbox,
  updateSosStatus,
  type SosOutboxEntry,
} from './indexedDbOutbox';
import { sosService, GOV_API_BASE } from './sosService';
import type { MeshEvent } from '../domain/types';

describe('SOS Flow & Government Signature Verification', () => {
  beforeAll(async () => {
    await ensureSodium();
  });

  // ─── 1. Sealed Box Encryption ─────────────────────────────
  it('encrypts private fields to Gov Curve25519 PK using sealed box', async () => {
    const sensitive = {
      contact: '+91-9876543210',
      medical: 'Asthma patient, low oxygen',
      note: 'Need evacuation for 2 seniors',
    };

    const cipherBase64 = await encryptPrivateField(sensitive);
    expect(typeof cipherBase64).toBe('string');
    expect(cipherBase64.length).toBeGreaterThan(30);

    // Verify gov can open it with its Curve25519 SK
    const GOV_SEED = new Uint8Array(32);
    GOV_SEED.fill(0x47); // 'G'
    const govKp = sodium.crypto_sign_seed_keypair(GOV_SEED);
    const govCurvePk = sodium.crypto_sign_ed25519_pk_to_curve25519(govKp.publicKey);
    const govCurveSk = sodium.crypto_sign_ed25519_sk_to_curve25519(govKp.privateKey);

    const cipherBytes = sodium.from_base64(cipherBase64);
    const decryptedBytes = sodium.crypto_box_seal_open(
      cipherBytes,
      govCurvePk,
      govCurveSk
    );
    const decrypted = JSON.parse(new TextDecoder().decode(decryptedBytes));
    expect(decrypted).toEqual(sensitive);
  });

  // ─── 2. Gov Signature Verification ────────────────────────
  it('verifies valid government Ed25519 signature on official events', async () => {
    const GOV_SEED = new Uint8Array(32);
    GOV_SEED.fill(0x47);
    const govKp = sodium.crypto_sign_seed_keypair(GOV_SEED);

    const unsignedAck: Omit<MeshEvent, 'sig'> = {
      id: '01TESTACK00000000000000000',
      v: 1,
      kind: 'SOS_ACK',
      type: 'sos_ack',
      feature_id: 'feat123',
      ref: '01TESTSOS0000000000000000',
      lat: 20.2961,
      lon: 85.8245,
      severity: 1,
      text: 'Government emergency responders dispatched.',
      qty: null,
      hlc: '1556712000000:0000:gov00001',
      device_time: '2026-10-30T12:00:00.000Z',
      author: GOV_ED25519_PK,
      ttl_hours: 48,
    };

    const signedAck = await signEvent(unsignedAck, sodium.to_hex(govKp.privateKey));

    const isValid = await verifyGovSignature(signedAck);
    expect(isValid).toBe(true);
  });

  it('rejects SOS_ACK if signed by non-gov key or tampered', async () => {
    const imposterKp = await generateKeyPair();

    const unsignedAck: Omit<MeshEvent, 'sig'> = {
      id: '01TESTACK00000000000000000',
      v: 1,
      kind: 'SOS_ACK',
      type: 'sos_ack',
      feature_id: 'feat123',
      ref: '01TESTSOS0000000000000000',
      lat: 20.2961,
      lon: 85.8245,
      severity: 1,
      text: 'Imposter fake acknowledgment.',
      qty: null,
      hlc: '1556712000000:0000:imposter',
      device_time: '2026-10-30T12:00:00.000Z',
      author: imposterKp.publicKey, // Not gov public key!
      ttl_hours: 48,
    };

    const signedAck = await signEvent(unsignedAck, imposterKp.secretKey);

    const isValid = await verifyGovSignature(signedAck);
    expect(isValid).toBe(false);
  });

  // ─── 3. Outbox Lifecycle ──────────────────────────────────
  it('manages SOS outbox entry transitions through all 4 stages', async () => {
    const mockEntry: SosOutboxEntry = {
      sos_id: '01TESTOUTBOX0000000000000',
      status: 'created',
      bundle: {} as any,
      retry_count: 0,
      next_retry_at: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await saveSosToOutbox(mockEntry);
    let retrieved = await getSosFromOutbox(mockEntry.sos_id);
    expect(retrieved?.status).toBe('created');

    await updateSosStatus(mockEntry.sos_id, 'relayed');
    retrieved = await getSosFromOutbox(mockEntry.sos_id);
    expect(retrieved?.status).toBe('relayed');

    await updateSosStatus(mockEntry.sos_id, 'received');
    retrieved = await getSosFromOutbox(mockEntry.sos_id);
    expect(retrieved?.status).toBe('received');

    await updateSosStatus(mockEntry.sos_id, 'acknowledged');
    retrieved = await getSosFromOutbox(mockEntry.sos_id);
    expect(retrieved?.status).toBe('acknowledged');
  });

  // ─── 4. End-to-End against Mock-Gov Server ────────────────
  it('creates SOS bundle, uploads to mock-gov (202), and verifies signed SOS_ACK', async () => {
    // Check if mock-gov server is running on port 4000
    try {
      await fetch(`${GOV_API_BASE}/v1/official`, { signal: AbortSignal.timeout(500) });
    } catch {
      console.warn(`[Integration] Mock-gov server not reachable at ${GOV_API_BASE} - skipping live integration test`);
      return;
    }

    // 1. Create SOS via sosService
    const sos = await sosService.createAndQueueSos({
      lat: 20.2961,
      lon: 85.8245,
      text: 'End-to-end integration test SOS',
      peopleCount: 4,
      injuryType: 'flooded',
      contactInfo: '+91-9999988888',
      medicalNotes: 'Diabetic infant',
    });

    expect(sos.sos_id).toBeDefined();
    expect(sos.status).toBe('created');
    expect(sos.bundle.private).toBeDefined();

    // 2. Direct upload to mock-gov server
    const postRes = await fetch(`${GOV_API_BASE}/v1/sos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sos.bundle),
    });

    expect(postRes.status).toBe(202);
    const postData = await postRes.json();
    expect(postData.sos_id).toBe(sos.sos_id);

    // 3. Test idempotency: sending again returns 202
    const dupRes = await fetch(`${GOV_API_BASE}/v1/sos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sos.bundle),
    });
    expect(dupRes.status).toBe(202);

    // 4. Fetch official events feed from mock-gov
    const officialRes = await fetch(`${GOV_API_BASE}/v1/official`);
    expect(officialRes.status).toBe(200);
    const officialData = await officialRes.json();

    const ackEvent = officialData.events.find(
      (e: MeshEvent) => e.kind === 'SOS_ACK' && e.ref === sos.sos_id
    );
    expect(ackEvent).toBeDefined();

    // 5. Verify the SOS_ACK signature using embedded Gov Public Key
    const isAckVerified = await verifyGovSignature(ackEvent);
    expect(isAckVerified).toBe(true);

    // 6. Test triggerUpload updates status to acknowledged
    await updateSosStatus(sos.sos_id, 'received');
    await sosService.triggerUpload();

    const finalOutbox = await getSosFromOutbox(sos.sos_id);
    expect(finalOutbox?.status).toBe('acknowledged');
    expect(finalOutbox?.ack_event).toBeDefined();
  });
});

