# MeshMap Sync Protocol (§9 of SRS)

### Protocol Steps:
1. **Discover:** advertise beacon `{app_id, protocol_version, summary_hash}`.
2. **Handshake:** exchange public keys + signed nonce.
3. **Compare summaries:** one summary per geohash-5 tile (count + hash of event IDs).
4. **Exchange IDs:** for differing tiles only.
5. **Request missing events:** in priority order (SOS > Official > Sev3 > Recent), batched (~50) and ACKed.
6. **Validate & store:** signature, timestamp bounds, rate-limits.
7. **Disconnect & cool-down.**

