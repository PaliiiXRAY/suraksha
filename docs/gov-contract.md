# SURAKSHA ↔ MeshMap Government Contract
**Document Version:** 1.0.0  
**Status:** FROZEN FOR HACKATHON MVP  
**Classification:** Public / Inter-Team Interface Contract  
**Parties:** 
1. **SURAKSHA Government Platform & Responders (Backend/Admin Team)**
2. **MeshMap Offline Citizen Disaster App (Citizen Mobile/PWA Team)**

---

## 1. Executive Summary & Purpose

During major natural disasters (e.g. Cyclone Fani landfall, coastal tsunami, severe earthquake), terrestrial cellular infrastructure and power grids frequently fail. 

The **MeshMap Citizen App** allows citizens to navigate offline via pre-cached vector maps (PMTiles), record local hazard/resource reports, and broadcast **SOS distress signals** phone-to-phone using peer-to-peer gossip (QR codes, local hotspots, or Nearby Connections).

This document defines the strict, bi-directional API and data contract between the Citizen Mesh network and the central **SURAKSHA Government Decision-Support Platform**.

---

## 2. Cryptographic & Protocol Primitives

### 2.1 Keys & Signatures
- **Citizen Devices:** Generate an Ed25519 keypair on first install. The public key (hex or base64) acts as the citizen's pseudonymous author ID (`author`).
- **Government Authority:** SURAKSHA signs official alerts (`OFFICIAL`) and dispatch confirmations (`SOS_ACK`) with the official Ed25519 private key.
- **Official Public Key (Baked into Client App):**
  - Dev/Mock Key ID: `gov_ed25519_suraksha_v1`
  - Public Key (Hex): `3b6a27bcceb6a42d62a3a8d02a6f0d73653215771de243a63ac048a18b59da29`

### 2.2 Canonical Event Schema
Every record exchanged across the mesh is an immutable, signed Event:

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | String | Yes | ULID generated at creation (26 chars, time-sortable). |
| `v` | Integer | Yes | Schema version (always `1` for this release). |
| `kind` | String | Yes | `SOS`, `SOS_ACK`, `HAZARD`, `RESOURCE`, `RESOLVE`, `CONFIRM`, `DISPUTE`, `CLOSE`, `OFFICIAL`. |
| `type` | String | Yes | Specific tag: `medical`, `trapped`, `evacuation`, `tree_fallen`, `bridge_damaged`, `flooding`, `shelter`, `water`, `food`. |
| `feature_id` | String | Yes | Geohash precision 9 or place identifier. |
| `ref` | String / null | No | Reference to an earlier Event ID (used for RESOLVE or CONFIRM). |
| `lat` | Float | Yes | WGS84 latitude (`-90.0` to `90.0`). |
| `lon` | Float | Yes | WGS84 longitude (`-180.0` to `180.0`). |
| `severity` | Integer | Yes | 1 (Low / Info), 2 (Medium / Significant), 3 (Critical / Life-Safety). |
| `text` | String | Yes | Description (max 280 characters). |
| `qty` | Integer / null | No | Optional headcount or resource capacity. |
| `hlc` | String | Yes | Hybrid Logical Clock timestamp string (e.g. `2026-10-30T14:30:12.000Z-0001`). |
| `device_time`| String | Yes | ISO 8601 UTC timestamp of device creation. |
| `author` | String | Yes | Author's Ed25519 public key. |
| `ttl_hours` | Integer | Yes | Time-to-live in mesh cache (default `72`). |
| `sig` | String | Yes | Ed25519 signature over canonical payload string. |

---

## 3. Endpoints (SURAKSHA Platform)

### 3.1 `POST /api/v1/sos` (and `/api/v2/sos`) — Ingest SOS Distress Signal
Called by a citizen phone directly when cell/Wi-Fi is available, or by any **Gateway Phone** carrying relayed mesh packets.

#### Request Headers
- `Content-Type: application/json`

#### Request Payload
```json
{
  "sos_event": {
    "id": "01J9AZ77K8F03XQNM1C3KDJ48B",
    "v": 1,
    "kind": "SOS",
    "type": "medical",
    "feature_id": "u4pruyd84",
    "ref": null,
    "lat": 19.8135,
    "lon": 85.8312,
    "severity": 3,
    "text": "Elderly patient needing insulin, ground floor flooded 1.5m",
    "qty": 2,
    "hlc": "2026-10-30T14:30:12.000Z-0001",
    "device_time": "2026-10-30T14:30:12Z",
    "author": "3b6a27bcceb6a42d62a3a8d02a6f0d73653215771de243a63ac048a18b59da29",
    "ttl_hours": 72,
    "sig": "e7b0...9f2a"
  },
  "events": [
    {
      "id": "01J9AY00K8F03XQNM1C3KDJ48A",
      "v": 1,
      "kind": "HAZARD",
      "type": "bridge_damaged",
      "feature_id": "u4pruyd10",
      "ref": null,
      "lat": 19.8101,
      "lon": 85.8290,
      "severity": 3,
      "text": "Approach road submerged near Grand Road",
      "qty": null,
      "hlc": "2026-10-30T14:20:00.000Z-0001",
      "device_time": "2026-10-30T14:20:00Z",
      "author": "3b6a...da29",
      "ttl_hours": 72,
      "sig": "a1b2...c3d4"
    }
  ],
  "private": "",
  "client": {
    "app_version": "1.0.0",
    "sent_via": "direct",
    "gateway_key": null
  }
}
```

#### Response (`202 Accepted`)
```json
{
  "status": "ACCEPTED",
  "sos_id": "01J9AZ77K8F03XQNM1C3KDJ48B",
  "received_at": "2026-10-30T17:15:29Z",
  "is_duplicate": false,
  "events_ingested": 1,
  "ack_signature": "gov_sig_7f8a9b0c...",
  "notice": "SIMULATED DISPATCH: In demo/prototype mode, real emergency services are NOT contacted."
}
```

#### Idempotency & Gateway Rule
- Calls with the same `sos_event.id` are **strictly idempotent**: the server returns `202 Accepted` with `"is_duplicate": true` and the existing `ack_signature`.
- Any citizen phone acting as a gateway may forward bundles on behalf of another citizen without authentication.

---

### 3.2 `GET /api/v1/sos` — View Active Citizen Distress Beacons
Called by the SURAKSHA Command Dashboard, ODRAF Responders, and Police District HQ.

#### Query Parameters
- `status`: `PENDING | DISPATCHED | ACKNOWLEDGED | RESOLVED | ALL` (default `ALL`)
- `min_severity`: `1 | 2 | 3` (default `1`)
- `limit`: `1 - 100` (default `50`)

#### Response (`200 OK`)
```json
{
  "total": 1,
  "sos_records": [
    {
      "sos_id": "01J9AZ77K8F03XQNM1C3KDJ48B",
      "status": "ACKNOWLEDGED",
      "type": "medical",
      "severity": 3,
      "headcount": 2,
      "text": "Elderly patient needing insulin, ground floor flooded 1.5m",
      "location": {
        "latitude": 19.8135,
        "longitude": 85.8312,
        "feature_id": "u4pruyd84"
      },
      "sent_via": "direct",
      "created_at": "2026-10-30T14:30:12Z",
      "received_at": "2026-10-30T17:15:29Z",
      "assigned_responder": "ODRAF Team Puri Unit 3 (Simulated)"
    }
  ],
  "provenance_tag": "SIMULATED"
}
```

---

### 3.3 `POST /api/v1/sos/{sos_id}/ack` — Responder Acknowledgment
Triggered when an emergency dispatcher or responder acknowledges the SOS distress signal.

#### Request Payload
```json
{
  "responder_name": "ODRAF Team Puri-1",
  "estimated_arrival_minutes": 25,
  "instructions": "Move to upper level. Rescue boat dispatched."
}
```

#### Response (`200 OK`)
```json
{
  "sos_id": "01J9AZ77K8F03XQNM1C3KDJ48B",
  "status": "ACKNOWLEDGED",
  "ack_event": {
    "id": "01J9B000K8F03XQNM1C3KDJ499",
    "v": 1,
    "kind": "SOS_ACK",
    "type": "rescue_dispatched",
    "feature_id": "u4pruyd84",
    "ref": "01J9AZ77K8F03XQNM1C3KDJ48B",
    "lat": 19.8135,
    "lon": 85.8312,
    "severity": 1,
    "text": "Rescue boat dispatched by ODRAF Team Puri-1. ETA ~25m.",
    "qty": null,
    "hlc": "2026-10-30T17:20:00.000Z-0001",
    "device_time": "2026-10-30T17:20:00Z",
    "author": "gov_ed25519_suraksha_v1",
    "ttl_hours": 72,
    "sig": "gov_sig_9901..."
  }
}
```
*Note: This `ack_event` spreads through the peer-to-peer mesh so the sender's phone receives confirmation even while offline.*

---

### 3.4 `GET /api/v1/official` — Download Official Bulletins & Hazard States
Called by citizen apps upon internet connectivity to refresh official government directives.

#### Query Parameters
- `since_hlc`: Optional HLC timestamp filter.

#### Response (`200 OK`)
```json
{
  "official_events": [
    {
      "id": "01J9OFFICIAL001FANI2019",
      "v": 1,
      "kind": "OFFICIAL",
      "type": "evacuation_order",
      "feature_id": "u4pru",
      "ref": null,
      "lat": 19.8135,
      "lon": 85.8312,
      "severity": 3,
      "text": "IMD Red Alert: Landfall expected at Puri coast within 4h. Immediate evacuation to designated cyclone shelters.",
      "qty": null,
      "hlc": "2026-10-30T15:00:00.000Z-0000",
      "device_time": "2026-10-30T15:00:00Z",
      "author": "gov_ed25519_suraksha_v1",
      "ttl_hours": 120,
      "sig": "gov_sig_4431..."
    }
  ],
  "provenance": "OFFICIAL FORECAST (IMD / OSDMA)",
  "freshness": "VERIFIED_FRESH"
}
```

---

## 4. Safety & Provenance Rules (Mandatory)
1. **Simulation Labelling:** All automated or operator dispatch responses must include `notice: "SIMULATED DISPATCH"`.
2. **Authority Precedence:** When the Citizen App computes feature status, any event with `kind: "OFFICIAL"` signed by `gov_ed25519_suraksha_v1` strictly overrides conflicting citizen reports.
3. **Stale Data Interlock:** SOS beacons older than `ttl_hours` are flagged as `STALE_PENDING` on the dashboard rather than silently dismissed.
