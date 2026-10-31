# MeshMap: Offline Citizen Disaster Map (Citizen App)
### Final SRS + Architecture + Implementation Plan
**Scope of this document:** the citizen-facing app only (web app + thin Android wrapper).
The government website/backend is built by another team and is touched only through the contract in **Appendix A**.

> **How to use with Antigravity:** save this file as `docs/SRS.md`, and save the block in Appendix C as `AGENTS.md` in the project root. Then use the prompts in §15 one at a time.

---

## 1. Introduction

### 1.1 Purpose
An app that works with **no internet and no cell network**. Every phone carries an offline map of the city. Citizens add **reports** to the map (road blocked, shelter has food, bridge broken, hazard fixed). When two phones come near each other they exchange reports, so the map gradually updates on every phone, like a decentralized database that spreads as people move around.

When a citizen sends an **SOS**, their phone's report data is forwarded to the government, which merges data from many SOS senders into a responder map (built by the gov team).

The app also ships with an offline **first-aid handbook**.

### 1.2 Scope
**In scope (this team):**
- Offline map with citizen reports and history
- Red / green / amber / blue status display
- Phone-to-phone sync (QR/file in browser, automatic via Nearby on Android)
- SOS creation, store-and-forward delivery, acknowledgement display
- Offline first-aid handbook
- Mock government endpoint for development

**Out of scope (this team):** government backend, operator dashboard, responder map generation, official-event signing server. (Owned by the gov team.)
**Out of scope (v1):** chat, voice, photos, turn-by-turn routing, iOS automatic sync.

### 1.3 Definitions
| Term | Meaning |
|---|---|
| Event | One immutable, signed record (hazard, resolve, SOS, etc.) |
| Feature | A place that events attach to (road segment, bridge, shelter, point) |
| Peer | Another phone running the app |
| Gateway | Any phone that currently has internet and uploads SOS data |
| Transport | A pluggable way of moving bytes between phones (QR, file, WebRTC, Nearby) |
| Official event | An event signed by the government key; overrides citizen conflicts |

### 1.4 Users
1. **Citizen** – creates/views reports, sends SOS, reads first aid.
2. **Responder** – same app, extra layers (read-only gov map import), can also add reports.

---

## 2. Technology Decisions (updated)

| Layer | Choice | Notes |
|---|---|---|
| App code | **TypeScript** web app (React or Svelte) as a **PWA** | One codebase for browser and Android |
| Android wrapper | **Capacitor** | Packages the same web code as an Android app |
| Native plugin | **Kotlin**, ~4 functions (see §7) | Nearby Connections, foreground service, SMS |
| Map | **MapLibre GL JS** + **PMTiles** (OpenStreetMap vector tiles) | Fully offline |
| Local DB | **IndexedDB** via Dexie (in Capacitor: optionally SQLite plugin) | Event store |
| Crypto | **libsodium.js** (Ed25519 signatures) | Small, audited |
| Serialization | **CBOR** (or JSON for v1; must match gov contract) | Compact |
| Handbook | Markdown bundled as assets, searched with FlexSearch/MiniSearch | Offline |
| Testing | Vitest (logic), Playwright (UI), custom simulator (sync) | |

**Why this split:** the PWA is about 80% of the product and runs anywhere. The browser cannot scan for nearby phones or run in the background, so a small native layer adds exactly that, and nothing else. All logic stays in TypeScript.

---

## 3. Core Design Idea (read first)

**The map is not a table of states. It is an append-only log of signed events.**

Each phone stores a set of events. Syncing means "give me the events you have that I don't." Events are never edited or deleted, so two phones can never conflict; they end up with the union. (This is a grow-only set CRDT, the simplest safe approach to a decentralized database.)

The **current status** of a place is **computed** from its events:

```
Feature "Bridge on 5th Ave"
  10:02  Rahul   HAZARD   "Bridge cracked, do not cross"      -> RED
  14:30  Meena   CONFIRM  "still there"                       -> RED (2 confirmations)
  18:45  Officer OFFICIAL RESOLVE "Reinforced, light vehicles"-> GREEN (verified)
```
The timeline shows every event with its timestamp, newest on top.

---

## 4. Functional Requirements

### 4.1 Offline map
- **FR-1** Bundle or download an offline vector map of the city (PMTiles).
- **FR-2** Render the map and the user's GPS position with no internet.
- **FR-3** Let users download/update a map region on Wi-Fi, showing size on disk.
- **FR-4** Request persistent storage (`navigator.storage.persist()`) so the browser does not delete map and event data.

### 4.2 Creating reports
- **FR-5** Long-press on the map, or "report at my location," to create a report.
- **FR-6** Report types (extensible):
  - Hazards: road blocked, tree fallen, bridge damaged, flooding, fire, power line down, landslide, building collapse, gas leak
  - Resources: shelter, food, water, medical aid, charging point, fuel
  - Status changes: **resolved/fixed**, **no longer functional**, **still there (confirm)**, **dispute**
- **FR-7** Fields: type, location, description (≤280 chars), severity (1–3), optional quantity/capacity, timestamp, author pseudonym, signature.
- **FR-8** Reports are immutable; "editing" posts a new event referencing the old one.
- **FR-9** Two-tap "Still there ✔" / "Fixed ✔" on any existing report.

### 4.3 Status display
- **FR-10** Colours **plus icons** (never colour alone):
  - Red: active hazard / non-functional
  - Green: previously a problem, now resolved (kept as history)
  - Amber: unverified, disputed, or stale
  - Blue: resource available
  - Grey: resource closed
- **FR-11** Tapping a feature shows the full timeline, newest first, with time, trust badge, and confirmations.
- **FR-12** Filters: type, severity, last 6h / 24h / all.
- **FR-13** Unconfirmed hazards older than a configurable window turn amber ("may be outdated"). Resource reports expire the same way.
- **FR-14** Conflicting reports from low-trust users within a short window show amber "disputed" instead of blindly showing the latest.

### 4.4 Peer-to-peer sync
- **FR-15** Sync goes through a `Transport` interface (see §7). The app works with any transport available.
- **FR-16** Exchange only events the other phone lacks (delta sync).
- **FR-17** Priority order: SOS > official events > severity 3 > recent > nearby.
- **FR-18** Sync is made of small, idempotent, acknowledged batches, so interrupted sessions are safe.
- **FR-19** Every received event is validated (signature, schema, size, timestamp sanity) before storing.
- **FR-20** Event storage is capped (default 50 MB). Eviction order: resolved and low-priority and old first. SOS and official events are evicted last.
- **FR-21** Show "last synced with N peers, X min ago" and a data-freshness overlay.
- **FR-22 (browser)** QR sync: one phone shows a QR, the other scans; small updates travel in QR frames, larger ones open a WebRTC data channel over a shared hotspot/LAN.
- **FR-23 (browser)** File sync: export/import a signed bundle (share via Nearby Share, Bluetooth, etc.).
- **FR-24 (Android)** Automatic discovery and sync through Nearby Connections, including with the screen off.

### 4.5 SOS
- **FR-25** Hold-to-send SOS (3 s) with optional injury type, number of people, short note.
- **FR-26** SOS packet = SOS event + compact **event-log snapshot** (events only, never map tiles) + private fields encrypted to the government public key.
- **FR-27** Delivery attempts, in order: direct internet upload → SMS (Android) → mesh relay. The SOS is always also added to the mesh as top-priority data.
- **FR-28** Spray-and-wait: the SOS is handed to the first N peers met; any phone that gains internet uploads it (gateway behaviour, automatic).
- **FR-29** Status shown to sender: created → relayed by N phones → received by authorities → acknowledged.
- **FR-30** `SOS_ACK` from the government is signed, verified against the embedded gov key, and spreads back through the mesh.
- **FR-31** Sender can cancel with "I'm safe."
- **FR-32** Outbox with retry and back-off; survives app restart.

### 4.6 First-aid handbook
- **FR-33** Offline, searchable: bleeding control, tourniquet use, CPR, burns, fractures, shock, choking, drowning, heat/cold, basic medicines (ORS, painkiller cautions, antiseptics), water purification, structure safety after earthquake/flood.
- **FR-34** Content reviewed by a medical authority; show version and review date; clear "call emergency services" prompts.
- **FR-35** Local languages, large pictograms, low-literacy mode.
- **FR-36** Emergency quick-actions screen ("Severe bleeding", "Not breathing", "Burn").
- **FR-37** Handbook updates arrive as signed packages through mesh or online.

### 4.7 Onboarding and settings
- **FR-38** First launch generates a device keypair. No account, phone number, or email.
- **FR-39** Onboarding guides the user to download the map and handbook and explains permissions (location, nearby devices, SMS, notifications).
- **FR-40** Battery-saver mode (less frequent scanning).
- **FR-41** Drill mode with fake data for training.

---

## 5. Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-1 | Offline-first: everything except gov upload works in airplane mode |
| NFR-2 | Android background mesh ≤ 5% battery/hour on a mid-range phone |
| NFR-3 | Sync of 1,000 new events between two phones < 20 s |
| NFR-4 | Cold start < 3 s; map interactive < 2 s |
| NFR-5 | 100k events stored with smooth map rendering |
| NFR-6 | All events Ed25519-signed; private key stored in secure storage (Android Keystore via Capacitor when available) |
| NFR-7 | Privacy: no real identity; rotating pseudonyms; SOS contact data encrypted to gov key |
| NFR-8 | Malformed/malicious peer data never crashes the app or corrupts the DB |
| NFR-9 | Accessibility: large touch targets, high contrast, screen-reader labels, colour-blind-safe icons |
| NFR-10 | Runs on 2 GB RAM / Android 8 / recent mobile browsers |
| NFR-11 | Compact protocol messages (works over slow links) |
| NFR-12 | Installed app size (excluding map) < 30 MB |

---

## 6. Architecture

```
┌───────────────────────────── CITIZEN DEVICE ─────────────────────────────┐
│ UI (React/Svelte)  Map │ Report form │ Timeline │ SOS │ Handbook          │
│ ──────────────────────────────────────────────────────────────────────── │
│ Domain (pure TS)   StatusEngine │ TrustEngine │ SosManager │ HLC          │
│ ──────────────────────────────────────────────────────────────────────── │
│ Data               EventStore (IndexedDB) │ TileStore (PMTiles) │ Handbook │
│ ──────────────────────────────────────────────────────────────────────── │
│ Sync               Session │ DeltaSync │ PriorityQueue │ RateLimiter       │
│ ──────────────────────────────────────────────────────────────────────── │
│ Transport interface                                                       │
│    ├─ Web:     QR frames │ File bundle │ WebRTC (hotspot/LAN)             │
│    └─ Android: Nearby Connections │ Foreground service │ SMS  (Kotlin)    │
│ Gateway        HTTPS upload to gov API (when internet exists)             │
└───────────────────────────────────────────────────────────────────────────┘
        ▲▼ peer sync                                  │ SOS bundle
   other phones / relay nodes                         ▼
                                           GOVERNMENT PLATFORM (other team)
```

**Rule:** UI → Domain → Data/Sync. Domain code has no dependency on the browser or Capacitor, so it is fast to unit test and can run inside the simulator.

---

## 7. Transport Interface and Native Plugin

```ts
interface Transport {
  id: 'qr' | 'file' | 'webrtc' | 'nearby';
  isAvailable(): Promise<boolean>;
  startDiscovery(): Promise<void>;
  stopDiscovery(): Promise<void>;
  onPeerFound(cb: (peer: PeerInfo) => void): void;
  connect(peerId: string): Promise<Session>;
}
interface Session {
  send(bytes: Uint8Array): Promise<void>;
  onReceive(cb: (bytes: Uint8Array) => void): void;
  close(): Promise<void>;
}
```

**Kotlin Capacitor plugin (`MeshNative`), the only native code:**
| Method | Purpose |
|---|---|
| `startForegroundService()` / `stop...()` | Keeps discovery alive with the screen off (persistent notification required) |
| `startDiscovery()` / `stopDiscovery()` | Nearby Connections advertise + scan |
| `connect(peerId)`, `send(bytes)`, `onReceive` | Byte pipe to a peer |
| `sendSms(number, text)` | SOS fallback |

Everything above this line (events, signing, status, sync protocol, UI) stays in TypeScript.

---

## 8. Data Design

### 8.1 Event (the only thing that spreads)
```json
{
  "id": "01J9...ULID",
  "v": 1,
  "kind": "HAZARD | RESOURCE | RESOLVE | CONFIRM | DISPUTE | CLOSE | SOS | SOS_CANCEL | OFFICIAL | SOS_ACK",
  "type": "tree_fallen | bridge_damaged | shelter | water | ...",
  "feature_id": "geohash9:u4pruyd...",
  "ref": "01J9... | null",
  "lat": 30.7333, "lon": 76.7794,
  "severity": 2,
  "text": "Tree blocking both lanes",
  "qty": null,
  "hlc": "<hybrid logical clock string>",
  "device_time": "2026-10-30T14:30:12Z",
  "author": "<ed25519 public key>",
  "ttl_hours": 72,
  "sig": "<ed25519 signature>"
}
```
The exact canonical bytes that are signed are defined in **Appendix A** (shared with the gov team).

### 8.2 Hybrid Logical Clock
Phone clocks may be wrong. An HLC = wall time + counter, and always advances to the maximum time seen from peers. "Later" stays later even with drifting clocks. Events with timestamps too far in the future compared with what peers report are discounted.

### 8.3 Grouping events into features
1. **MVP:** geohash precision 9 (~5 m) + compatible type.
2. **v2 (recommended):** snap to OSM way/node ID (a road report applies to the whole segment). Requires OSM IDs in the tile data.

### 8.4 Status engine (pure function)
```
for each feature, order events by HLC
  newest OFFICIAL event present        -> wins, show "verified" badge
  else
    score = Σ trust(author) of HAZARD/CONFIRM since last RESOLVE
          − Σ trust(author) of RESOLVE
    conflicting recent events with small trust gap -> AMBER "disputed"
    score > 0 and age < stale window               -> RED
    score > 0 and age ≥ stale window               -> AMBER "may be outdated"
    had hazard and now resolved                    -> GREEN
  resources: available -> BLUE, CLOSE event -> GREY, expired -> AMBER
```
Keep it in one module with table-driven tests. **This must match the rules used by the gov side** (Appendix A, §A.6).

### 8.5 Local stores
- `events(id, kind, type, feature_id, ref, lat, lon, hlc, author, payload, sig, received_from, received_at, priority)`
- `features_cache(feature_id, status, summary, last_hlc, confidence)`
- `peers(device_hash, last_seen, last_sync_hlc, trust)`
- `sos_outbox(sos_id, state, attempts, last_attempt, relayed_count)`
- `handbook` with search index

---

## 9. Sync Protocol (phone ↔ phone)

1. **Discover:** advertise a small beacon `{app_id, protocol_version, summary_hash}`.
2. **Handshake:** exchange public keys + signed nonce.
3. **Compare summaries:** one summary per **geohash-5 tile** (count + hash of event IDs); only differing tiles are drilled into.
4. **Exchange IDs** for differing tiles (Bloom filter or plain ID list).
5. **Request missing events** in priority order, in batches of ~50, each batch acknowledged.
6. **Validate and store** each event; drop invalid ones; temporarily block peers that repeatedly send bad data.
7. **Disconnect** and apply a cool-down for that peer.

Gossip controls: TTL/hop budget for low-priority data; spray-and-wait for SOS; per-author rate limit (default 10 events/hour) enforced by receivers.

For the **browser QR/file transports**, the same protocol runs, but steps 1–2 are replaced by scanning/importing and the transfer is one bundle in each direction.

---

## 10. Trust, Abuse and Safety (client side)

| Threat | Mitigation |
|---|---|
| Fake hazards / fake "fixed" | Signatures; independent confirmations; trust score; official events override |
| Many fake keys (Sybil) | Per-device rate limits; weight by key age and past confirmed accuracy; confirmations near the location count more |
| Far-future timestamps | HLC sanity bounds |
| Oversized/garbage payloads | Strict schema, max sizes, drop on violation |
| Reporter privacy | Pseudonymous rotating keys; no phone number; SOS private fields encrypted to the gov key |
| Fake gov alerts | Gov public keys embedded in the app; key-rotation list distributed as a signed update |
| Medical content misuse | Reviewed, versioned content, disclaimers, "call emergency services" prompts |

Trust badges: ⚪ new anonymous • 🔵 confirmed by several • ✅ official/verified.

---

## 11. SOS Flow (citizen side)

```
User holds SOS
 ├─ build SOS event + event-log snapshot; encrypt private fields to gov key
 ├─ write to sos_outbox + insert into mesh as top-priority event
 ├─ internet?  → POST bundle to gov API (Appendix A)
 ├─ else Android + SIM? → SMS short form (id + lat/lon)
 └─ any peer who gets internet uploads it for us (gateway behaviour)
Gov returns SOS_ACK (signed) → spreads back through mesh → status "acknowledged"
```
Send only the **event log**, not map tiles. The government already has the base map.

---

## 12. Improvements Included / Recommended

1. **Fixed relay nodes** (solar Raspberry Pi/ESP32 at shelters, hospitals, police stations) that always sync.
2. **LoRa bridge** for SOS and official alerts across kilometres (later).
3. **Data-mule / sync-mode UI** that encourages standing together 30 s.
4. **"I'm safe" check-ins** with a family code (opt-in).
5. **Resource expiry** so "shelter has food" does not stay true forever.
6. **Safe-route hint:** grey out roads that intersect red features; offline routing later.
7. **Simulator** of hundreds of virtual phones to test sync speed and conflicts before any field test.
8. **Drill mode** for training and awareness.
9. **Daily-use features** (planned closures) so people already have the map when disaster hits.
10. **Mesh-delivered content updates** (handbook, map patches), signed.
11. **Voice/pictogram first aid.**
12. **Battery-aware scanning.**

### Risks
- **iOS:** no background BLE and no interoperable Nearby. Use PWA with QR/file sync on iOS; revisit later.
- **Browser storage eviction:** call `storage.persist()`, prompt "Add to Home Screen," keep export/backup.
- **Critical mass:** mesh needs enough installs; use relays, pre-disaster use, and gov/NGO distribution.
- **Android background limits:** foreground service + notification is mandatory; battery optimisation exemptions may be needed.
- **Medical/legal liability:** reviewed content and clear disclaimers.

---

## 13. Repository Structure
```
meshmap/
├─ AGENTS.md              (Appendix C)
├─ docs/
│  ├─ SRS.md              (this file)
│  ├─ gov-contract.md     (Appendix A, agreed with gov team)
│  └─ protocol.md         (sync details)
├─ app/                   TypeScript PWA
│  ├─ src/ui/             map, report, timeline, sos, handbook
│  ├─ src/domain/         statusEngine, trustEngine, sosManager, hlc
│  ├─ src/data/           eventStore, tileStore, handbookStore
│  ├─ src/sync/           session, deltaSync, rateLimiter
│  ├─ src/transports/     qr.ts, file.ts, webrtc.ts, nearby.ts
│  └─ src/crypto/         keys, sign, verify
├─ android/               Capacitor project + Kotlin MeshNative plugin
├─ protocol/              event schema + test vectors (shared with gov team)
├─ mock-gov/              fake gov API for development
├─ simulator/             virtual-phones gossip simulator
├─ content/handbook/      markdown first-aid content per language
└─ tools/                 tile builder, key generator
```

---

## 14. Roadmap

| Phase | Goal | Done when |
|---|---|---|
| 0 | Contract agreed with gov team (Appendix A) | Both teams sign off event + SOS formats |
| 1 | Offline map + local reports | Create/view reports in airplane mode |
| 2 | Event model, signing, HLC, status engine + tests | Same events → same status everywhere |
| 3 | Timeline UI + red/green/amber/blue layers | AT-1, AT-5 pass |
| 4 | Handbook + emergency screen | Searchable offline |
| 5 | SOS outbox + upload to mock gov + ACK handling | AT-6 against mock |
| 6 | Browser transports (QR/file) + simulator | AT-2, simulator convergence |
| 7 | Capacitor + Kotlin plugin + Nearby auto-sync | Two Android phones sync with screen off |
| 8 | Trust engine, rate limits, eviction, hardening | AT-3, AT-4 pass |
| 9 | Integration with the real gov platform + pilot | Real SOS reaches gov and ACK returns |

### Acceptance tests
- **AT-1** Airplane mode: create, view, resolve a hazard; red → green.
- **AT-2** Two phones with different events converge to the union after syncing.
- **AT-3** A phone with a clock 3 days ahead cannot permanently outrank others.
- **AT-4** A tampered event (changed text) is rejected.
- **AT-5** HAZARD by user X and RESOLVE by user Y within 5 min → amber "disputed."
- **AT-6** SOS made offline reaches the server after a third phone with internet passes by.
- **AT-7** Duplicate events from two sources are stored once.
- **AT-8** Handbook search works offline in two languages.
- **AT-9** App data survives restart and browser close (persisted storage).

---

## 15. Antigravity Task Prompts (use in order)

1. *"Read AGENTS.md and docs/SRS.md. Create the repo structure in §13 and a TypeScript PWA skeleton with MapLibre showing an offline PMTiles map of a bundled sample region."*
2. *"Implement the Event model (§8.1), Ed25519 signing with libsodium.js, and an HLC class. Add unit tests including tampered-event rejection and clock-skew cases."*
3. *"Implement the IndexedDB EventStore and the pure-function StatusEngine from §8.4 with table-driven tests for AT-1, AT-3, AT-5."*
4. *"Build the report creation UI (§4.2), the feature timeline sheet (newest first), and red/green/amber/blue map layers with icons."*
5. *"Add the offline handbook: markdown loader, search, emergency quick-action screen."*
6. *"Build mock-gov (small Node/Express server) implementing Appendix A, then implement the SOS outbox, upload with retry, and SOS_ACK verification."*
7. *"Define the Transport interface (§7). Implement QR and file-bundle transports and the delta-sync protocol (§9) on top of it."*
8. *"Build a simulator that runs the real sync code for N virtual phones moving randomly and reports convergence time."*
9. *"Add the Capacitor Android project and a Kotlin MeshNative plugin (foreground service, Nearby Connections, SMS) matching the §7 table, plus a nearby.ts transport."*
10. *"Add rate limiting, trust scores, storage eviction, and official-event verification with the embedded gov public key."*

---

# Appendix A: Contract with the Government Team (`docs/gov-contract.md`)

**Both teams must agree on this before Phase 5. Items marked ❓ are open and need a decision.**

### A.1 Event format and signing
- Schema: §8.1 of this document. Field names, types, and limits are frozen per `v` (schema version).
- Serialization: ❓ JSON (human-friendly) or CBOR (smaller). Recommendation: **CBOR on the wire, JSON for debugging.**
- Signature: Ed25519 over the **canonical encoding of all fields except `sig`**, with fields in a fixed order (or RFC 8785 JSON canonicalization if JSON). Shared test vectors live in `protocol/`; both teams' code must pass them.
- IDs: ULID, generated on device.

### A.2 SOS upload
- `POST {GOV_BASE}/v1/sos` with a bundle:
```json
{
  "sos_event": { "...event with kind=SOS..." },
  "events": [ "...snapshot of events, max N events / M MB..." ],
  "private": "<base64 sealed box encrypted to gov public key: contact, medical, note>",
  "client": { "app_version": "1.0.0", "sent_via": "direct | gateway", "gateway_key": "<pubkey or null>" }
}
```
- Auth: none required; the signature is the proof. ❓ Gov may add rate limiting or a proof-of-work token.
- Response: `202 Accepted {"sos_id": "...", "received_at": "..."}`. The call is **idempotent** on `sos_id`.
- Size limit: ❓ propose 2 MB per bundle, with chunked upload if larger.
- Retry: client retries with exponential back-off until it gets 2xx.

### A.3 SMS fallback
- ❓ Gov SMS number and short format, e.g. `SOS <sos_id> <lat>,<lon> <unix_time> <people>`.
- Gov replies by SMS (optional) with `ACK <sos_id>`.

### A.4 Acknowledgement and official events (gov → phones)
- Gov produces events of kind `SOS_ACK` and `OFFICIAL`, signed with a **government key**.
- Distribution: they spread through the mesh like any event; gateway phones also fetch `GET {GOV_BASE}/v1/official?since=<hlc>` when online.
- Verification: the app embeds the list of trusted gov public keys at build time.
- Key rotation: ❓ a signed `KEY_LIST` event, signed by a long-lived root key, that adds/revokes keys.

### A.5 Gateway behaviour
- Any phone may upload another person's SOS bundle (it is signed by the original sender). Gov must accept and deduplicate on `sos_id` and event `id`.

### A.6 Shared status rules
- The status engine in §8.4 is the reference. ❓ Decide whether gov team (a) reimplements it from the spec using shared test vectors, or (b) reuses the same TypeScript module (`protocol/` package). Recommendation: **(b)**, to avoid drift.

### A.7 Responder map import (optional, later)
- Gov exports GeoJSON + signed manifest; the app can import it in Responder mode.

---

# Appendix B: Open Questions
1. Who owns the gov signing keys and their rotation process?
2. SMS fallback allowed? Number? Cost?
3. Is Android-first (with PWA elsewhere) acceptable for the pilot?
4. Medical content reviewer and required languages?
5. Event TTL and per-phone storage cap?
6. Do citizens see other people's SOS pins, or only the government?
7. Which city map extent and zoom levels (tile size per region)?

---

# Appendix C: `AGENTS.md` (copy to project root)

```
# MeshMap: Agent instructions

## Scope: CITIZEN APP ONLY
Read docs/SRS.md for full context. Build only the citizen app:
- TypeScript PWA (MapLibre + PMTiles, IndexedDB, libsodium.js)
- Capacitor Android wrapper with a small Kotlin plugin (Nearby Connections,
  foreground service, SMS)
- Offline handbook, SOS flow, P2P sync

Do NOT build the government backend or dashboard. Another team owns it.
Integrate only through docs/gov-contract.md (Appendix A of SRS.md).
Use mock-gov/ for development.

## Rules
- Events are immutable and signed. Never mutate or delete an event.
- Status is always computed from events by domain/statusEngine.ts.
- domain/ must not import browser, Capacitor, or UI code.
- All peer input is untrusted: validate schema, size, signature, timestamp.
- All transports implement the Transport interface; no transport-specific code in sync/ or domain/.
- Never rely on colour alone in the UI; add icons/labels.
- Every domain function needs unit tests; follow acceptance tests AT-1..AT-9.
- Ask before changing the event schema; it is shared with the gov team.
```
