/**
 * Generate test vectors for protocol/test-vectors.json.
 *
 * Run once: npx tsx src/crypto/generate-vectors.ts
 * Output: ../protocol/test-vectors.json
 */
import sodium from 'libsodium-wrappers';
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  await sodium.ready;

  // Deterministic seed (32 bytes) for reproducible keypair
  const SEED = sodium.from_hex(
    'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef'
  );
  const kp = sodium.crypto_sign_seed_keypair(SEED);
  const pubHex = sodium.to_hex(kp.publicKey);
  const secHex = sodium.to_hex(kp.privateKey);

  // Second keypair (for wrong-sig vector)
  const SEED2 = sodium.from_hex(
    'cafebabecafebabecafebabecafebabecafebabecafebabecafebabecafebabe'
  );
  const kp2 = sodium.crypto_sign_seed_keypair(SEED2);
  const secHex2 = sodium.to_hex(kp2.privateKey);

  // Canonical field order (must match types.ts CANONICAL_FIELD_ORDER)
  const CANONICAL_FIELD_ORDER = [
    'id', 'v', 'kind', 'type', 'feature_id', 'ref',
    'lat', 'lon', 'severity', 'text', 'qty',
    'hlc', 'device_time', 'author', 'ttl_hours',
  ];

  function canonicalJson(event: Record<string, unknown>): string {
    const values = CANONICAL_FIELD_ORDER.map((f) => event[f]);
    return JSON.stringify(values);
  }

  function canonicalBytes(event: Record<string, unknown>): Uint8Array {
    return new TextEncoder().encode(canonicalJson(event));
  }

  function signEvent(event: Record<string, unknown>, sk: Uint8Array): Record<string, unknown> {
    const bytes = canonicalBytes(event);
    const sig = sodium.crypto_sign_detached(bytes, sk);
    return { ...event, sig: sodium.to_hex(sig) };
  }

  // ── Vector 1: Valid HAZARD event ──
  const ev1Base = {
    id: '01TV1HAZARD00000000000000',
    v: 1,
    kind: 'HAZARD',
    type: 'flooding',
    feature_id: 'w8r4g5h6j',
    ref: null,
    lat: 20.2961,
    lon: 85.8245,
    severity: 3,
    text: 'Waist-deep flooding on Station Road near underpass',
    qty: null,
    hlc: '1556712000000:0000:' + pubHex.slice(0, 8),
    device_time: '2019-05-01T12:00:00.000Z',
    author: pubHex,
    ttl_hours: 48,
  };
  const ev1 = signEvent(ev1Base, kp.privateKey);

  // ── Vector 2: Valid RESOURCE event ──
  const ev2Base = {
    id: '01TV2RESOURCE000000000000',
    v: 1,
    kind: 'RESOURCE',
    type: 'shelter',
    feature_id: 'w8r3t7y2k',
    ref: null,
    lat: 20.3012,
    lon: 85.8301,
    severity: 1,
    text: 'Community hall open – 200 capacity',
    qty: 200,
    hlc: '1556712060000:0000:' + pubHex.slice(0, 8),
    device_time: '2019-05-01T12:01:00.000Z',
    author: pubHex,
    ttl_hours: 72,
  };
  const ev2 = signEvent(ev2Base, kp.privateKey);

  // ── Vector 3: Valid SOS event ──
  const ev3Base = {
    id: '01TV3SOS000000000000000000',
    v: 1,
    kind: 'SOS',
    type: 'other',
    feature_id: 'w8r5p9q1m',
    ref: null,
    lat: 20.2875,
    lon: 85.8199,
    severity: 3,
    text: 'Family trapped on second floor – 4 people including infant',
    qty: 4,
    hlc: '1556712120000:0000:' + pubHex.slice(0, 8),
    device_time: '2019-05-01T12:02:00.000Z',
    author: pubHex,
    ttl_hours: 24,
  };
  const ev3 = signEvent(ev3Base, kp.privateKey);

  const output = {
    _comment: 'MeshMap protocol test vectors — deterministic Ed25519 signatures.',
    _seed_hex: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
    _public_key_hex: pubHex,
    vectors: [
      {
        description: 'Valid HAZARD event – flooding',
        event: ev1,
        canonical_json: canonicalJson(ev1Base),
        expected_valid: true,
      },
      {
        description: 'Valid RESOURCE event – shelter',
        event: ev2,
        canonical_json: canonicalJson(ev2Base),
        expected_valid: true,
      },
      {
        description: 'Valid SOS event – family trapped',
        event: ev3,
        canonical_json: canonicalJson(ev3Base),
        expected_valid: true,
      },
    ],
  };

  const outPath = resolve(__dirname, '../../..', 'protocol', 'test-vectors.json');
  writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n');
  console.log(`Wrote ${output.vectors.length} test vectors to ${outPath}`);
  console.log(`Public key: ${pubHex}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

