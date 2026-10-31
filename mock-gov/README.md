# Mock Government API

This directory contains the mock government server for citizen app development and testing.

### Endpoints (Appendix A):
- `POST /v1/sos`: Receives citizen SOS bundles and event log snapshots, returning `202 Accepted` and `sos_id`.
- `GET /v1/official?since=<hlc>`: Serves official advisories and signed `SOS_ACK` events.

