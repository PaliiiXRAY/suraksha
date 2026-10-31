import express from 'express';
import cors from 'cors';
import sodium from 'libsodium-wrappers';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 4000;

// Deterministic Gov Keys
const GOV_SEED = new Uint8Array(32);
GOV_SEED.fill(0x47); // 'G'

let govEd25519Kp;
let govCurve25519Pk;
let govCurve25519Sk;

const CANONICAL_FIELD_ORDER = [
  'id',
  'v',
  'kind',
  'type',
  'feature_id',
  'ref',
  'lat',
  'lon',
  'severity',
  'text',
  'qty',
  'hlc',
  'device_time',
  'author',
  'ttl_hours',
];

function canonicalBytes(event) {
  const values = CANONICAL_FIELD_ORDER.map((f) => event[f]);
  return new TextEncoder().encode(JSON.stringify(values));
}

function verifyEventSignature(event) {
  if (!event || !event.sig || !event.author) return false;
  try {
    const bytes = canonicalBytes(event);
    const sig = sodium.from_hex(event.sig);
    const pk = sodium.from_hex(event.author);
    return sodium.crypto_sign_verify_detached(sig, bytes, pk);
  } catch (err) {
    console.error('[MockGov] Signature verification error:', err);
    return false;
  }
}

function signEventAsGov(unsignedEvent) {
  const bytes = canonicalBytes(unsignedEvent);
  const sig = sodium.crypto_sign_detached(bytes, govEd25519Kp.privateKey);
  return { ...unsignedEvent, sig: sodium.to_hex(sig) };
}

// In-memory databases
const receivedSosBundles = new Map(); // sos_id -> bundle
const officialEvents = []; // MeshEvent[]

function createSosAck(sosId, originalEvent) {
  const now = Date.now();
  const ackEvent = signEventAsGov({
    id: `01ACK${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    v: 1,
    kind: 'SOS_ACK',
    type: 'sos_ack',
    feature_id: originalEvent ? originalEvent.feature_id : `ack_${sosId.slice(0, 8)}`,
    ref: sosId,
    lat: originalEvent ? originalEvent.lat : 20.2961,
    lon: originalEvent ? originalEvent.lon : 85.8245,
    severity: 1,
    text: `Government emergency dispatch acknowledged SOS ${sosId}. Responders alerted.`,
    qty: null,
    hlc: `${now}:0000:gov00001`,
    device_time: new Date(now).toISOString(),
    author: sodium.to_hex(govEd25519Kp.publicKey),
    ttl_hours: 72,
  });

  // Store in official events if not already present
  if (!officialEvents.some((e) => e.ref === sosId)) {
    officialEvents.push(ackEvent);
  }
  return ackEvent;
}

// ─────────────────────────────────────────────────────────────
// A.2 POST /v1/sos
// ─────────────────────────────────────────────────────────────
app.post('/v1/sos', (req, res) => {
  const { sos_event, events, private: encPrivate, client } = req.body;

  if (!sos_event || !sos_event.id) {
    return res.status(400).json({ error: 'Missing sos_event or sos_event.id' });
  }

  const sosId = sos_event.id;

  // Idempotency check: if already received, return 202 immediately
  if (receivedSosBundles.has(sosId)) {
    console.log(`[MockGov] Idempotent duplicate SOS received: ${sosId}`);
    const existing = receivedSosBundles.get(sosId);
    return res.status(202).json({
      sos_id: sosId,
      received_at: existing.received_at,
      status: 'duplicate_accepted',
    });
  }

  // Signature verification on the SOS event
  const isSigValid = verifyEventSignature(sos_event);
  if (!isSigValid) {
    console.warn(`[MockGov] REJECTED: Invalid Ed25519 signature on SOS ${sosId}`);
    return res.status(400).json({ error: 'Invalid Ed25519 signature on sos_event' });
  }

  // Attempt decrypting private sealed box if provided
  let decryptedPrivate = null;
  if (encPrivate) {
    try {
      const cipherBytes = sodium.from_base64(encPrivate);
      const plainBytes = sodium.crypto_box_seal_open(
        cipherBytes,
        govCurve25519Pk,
        govCurve25519Sk
      );
      decryptedPrivate = JSON.parse(new TextDecoder().decode(plainBytes));
      console.log(`[MockGov] Decrypted private info for ${sosId}:`, decryptedPrivate);
    } catch (e) {
      console.warn(`[MockGov] Note: could not open private sealed box (${e.message})`);
    }
  }

  const record = {
    sos_id: sosId,
    received_at: new Date().toISOString(),
    sos_event,
    eventsCount: Array.isArray(events) ? events.length : 0,
    client: client || null,
    decryptedPrivate,
  };

  receivedSosBundles.set(sosId, record);
  console.log(`[MockGov] Accepted SOS ${sosId} at ${record.received_at} from ${sos_event.author.slice(0, 8)}`);

  // Automatically generate and queue an official SOS_ACK for this SOS
  const ack = createSosAck(sosId, sos_event);
  console.log(`[MockGov] Generated signed SOS_ACK for ${sosId}: ${ack.id}`);

  return res.status(202).json({
    sos_id: sosId,
    received_at: record.received_at,
  });
});

// ─────────────────────────────────────────────────────────────
// A.4 GET /v1/official?since=<hlc>
// ─────────────────────────────────────────────────────────────
app.get('/v1/official', (req, res) => {
  const { since } = req.query;

  let filtered = officialEvents;
  if (since && typeof since === 'string') {
    filtered = officialEvents.filter((ev) => ev.hlc > since);
  }

  return res.json({
    gov_public_key: sodium.to_hex(govEd25519Kp.publicKey),
    events: filtered,
  });
});

// ─────────────────────────────────────────────────────────────
// Testing Endpoint: POST /v1/test/ack/:sos_id
// Explicitly create/return a signed SOS_ACK for testing
// ─────────────────────────────────────────────────────────────
app.post('/v1/test/ack/:sos_id', (req, res) => {
  const { sos_id } = req.params;
  const existingBundle = receivedSosBundles.get(sos_id);
  const ack = createSosAck(sos_id, existingBundle?.sos_event);
  return res.json({ status: 'acknowledged', ack_event: ack });
});

// GET /v1/sos - List all received SOS bundles
app.get('/v1/sos', (req, res) => {
  return res.json({
    count: receivedSosBundles.size,
    bundles: Array.from(receivedSosBundles.values()),
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    gov_public_key: sodium.to_hex(govEd25519Kp.publicKey),
    gov_curve25519_pk: sodium.to_hex(govCurve25519Pk),
  });
});

async function start() {
  await sodium.ready;

  govEd25519Kp = sodium.crypto_sign_seed_keypair(GOV_SEED);
  govCurve25519Pk = sodium.crypto_sign_ed25519_pk_to_curve25519(govEd25519Kp.publicKey);
  govCurve25519Sk = sodium.crypto_sign_ed25519_sk_to_curve25519(govEd25519Kp.privateKey);

  // Add one initial official advisory event
  const initialAdvisory = signEventAsGov({
    id: '01OFFICIAL0000000000000000',
    v: 1,
    kind: 'OFFICIAL',
    type: 'advisory',
    feature_id: 'sp3e8c1j4',
    ref: null,
    lat: 43.7696,
    lon: 11.2558,
    severity: 2,
    text: 'Official IMD Weather Warning: Heavy rain advisory in effect.',
    qty: null,
    hlc: '1556712000000:0000:gov00001',
    device_time: new Date().toISOString(),
    author: sodium.to_hex(govEd25519Kp.publicKey),
    ttl_hours: 48,
  });
  officialEvents.push(initialAdvisory);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[MockGov] Running at http://localhost:${PORT}`);
    console.log(`[MockGov] Gov Ed25519 Public Key: ${sodium.to_hex(govEd25519Kp.publicKey)}`);
    console.log(`[MockGov] Gov Curve25519 Public Key: ${sodium.to_hex(govCurve25519Pk)}`);
  });
}

start().catch(console.error);

