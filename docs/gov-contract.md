# Contract with Government Team (Appendix A of SRS)

### A.1 Event format and signing
- Schema: §8.1 of SRS. Field names, types, and limits are frozen per `v` (schema version).
- Serialization: CBOR on the wire, JSON for debugging.
- Signature: Ed25519 over canonical encoding of all fields except `sig`.
- IDs: ULID generated on device.

### A.2 SOS upload
- `POST {GOV_BASE}/v1/sos`
```json
{
  "sos_event": { "...event with kind=SOS..." },
  "events": [ "...snapshot of events, max N events / M MB..." ],
  "private": "<base64 sealed box encrypted to gov public key: contact, medical, note>",
  "client": { "app_version": "1.0.0", "sent_via": "direct | gateway", "gateway_key": "<pubkey or null>" }
}
```
- Response: `202 Accepted {"sos_id": "...", "received_at": "..."}`.

### A.3 SMS fallback
- SMS short form: `SOS <sos_id> <lat>,<lon> <unix_time> <people>`.

### A.4 Acknowledgement and official events (gov → phones)
- Kind `SOS_ACK` and `OFFICIAL` events signed with government key spread through mesh gossip.

