"""
SURAKSHA — Citizen MeshMap Contract & SOS Ingestion Test Suite
Verifies:
- POST /v1/sos idempotent ingestion from citizen apps & gateways
- Event payload schema enforcement (kind, coords, text bounds, signatures)
- GET /v1/sos query queue for incident responders and command dashboard
- POST /v1/sos/{id}/ack closed-loop responder acknowledgment with signed SOS_ACK event
- GET /v1/official download of authoritative directives for offline peer caching
- Provenance and simulation labelling compliance
"""
import uuid
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def _make_sample_sos_bundle(sos_id: str = None, lat: float = 19.8135, lon: float = 85.8312):
    if not sos_id:
        sos_id = f"01J9TEST{uuid.uuid4().hex[:18].upper()}"
    return {
        "sos_event": {
            "id": sos_id,
            "v": 1,
            "kind": "SOS",
            "type": "medical",
            "feature_id": "u4pruyd84",
            "ref": None,
            "lat": lat,
            "lon": lon,
            "severity": 3,
            "text": "Critical medical distress: 2 injured, structure partially flooded.",
            "qty": 2,
            "hlc": "2026-10-30T14:30:12.000Z-0001",
            "device_time": "2026-10-30T14:30:12Z",
            "author": "3b6a27bcceb6a42d62a3a8d02a6f0d73653215771de243a63ac048a18b59da29",
            "ttl_hours": 72,
            "sig": "e7b0deadbeefcafe1234567890abcdef1234567890abcdef1234567890abcdef"
        },
        "events": [
            {
                "id": f"01J9PEER{uuid.uuid4().hex[:18].upper()}",
                "v": 1,
                "kind": "HAZARD",
                "type": "tree_fallen",
                "feature_id": "u4pruyd10",
                "ref": None,
                "lat": 19.8105,
                "lon": 85.8295,
                "severity": 2,
                "text": "Banyan tree fallen across Puri-Bhubaneswar highway",
                "qty": None,
                "hlc": "2026-10-30T14:25:00.000Z-0001",
                "device_time": "2026-10-30T14:25:00Z",
                "author": "3b6a27bcceb6a42d62a3a8d02a6f0d73653215771de243a63ac048a18b59da29",
                "ttl_hours": 72,
                "sig": "a1b2c3d4deadbeefcafe1234567890abcdef1234567890abcdef1234567890ab"
            }
        ],
        "private": "",
        "client": {
            "app_version": "1.0.0",
            "sent_via": "gateway",
            "gateway_key": "node_relay_puricenter_01"
        }
    }


def test_post_sos_ingestion_direct_and_idempotent():
    sos_id = f"01J9TESTIDEMP{uuid.uuid4().hex[:14].upper()}"
    bundle = _make_sample_sos_bundle(sos_id=sos_id)

    # First upload: returns 202 Accepted
    res1 = client.post("/v1/sos", json=bundle)
    assert res1.status_code == 202
    data1 = res1.json()
    assert data1["status"] == "ACCEPTED"
    assert data1["sos_id"] == sos_id
    assert data1["is_duplicate"] is False
    assert data1["events_ingested"] == 1
    assert data1["ack_signature"].startswith("gov_sig_")
    assert "SIMULATED DISPATCH" in data1["notice"]

    # Second upload of same SOS (relay gateway retry): returns 202 Accepted with is_duplicate=True
    res2 = client.post("/v1/sos", json=bundle)
    assert res2.status_code == 202
    data2 = res2.json()
    assert data2["is_duplicate"] is True
    assert data2["sos_id"] == sos_id
    assert data2["ack_signature"] == data1["ack_signature"]
    assert data2["events_ingested"] == 0


def test_post_sos_prefixed_route():
    sos_id = f"01J9TESTPREFIX{uuid.uuid4().hex[:13].upper()}"
    bundle = _make_sample_sos_bundle(sos_id=sos_id)

    res = client.post("/api/sos", json=bundle)
    assert res.status_code == 202
    assert res.json()["sos_id"] == sos_id


def test_post_sos_validation_bounds():
    # 1. Invalid coordinates
    bad_bundle = _make_sample_sos_bundle()
    bad_bundle["sos_event"]["lat"] = 999.0
    res = client.post("/v1/sos", json=bad_bundle)
    assert res.status_code == 422

    # 2. Invalid event kind
    bad_kind = _make_sample_sos_bundle()
    bad_kind["sos_event"]["kind"] = "ATTACK"
    res = client.post("/v1/sos", json=bad_kind)
    assert res.status_code == 422

    # 3. Oversized description (> 280 chars)
    bad_text = _make_sample_sos_bundle()
    bad_text["sos_event"]["text"] = "X" * 300
    res = client.post("/v1/sos", json=bad_text)
    assert res.status_code == 422


def test_get_sos_queue_and_filtering():
    sos_id = f"01J9TESTQUEUE{uuid.uuid4().hex[:14].upper()}"
    bundle = _make_sample_sos_bundle(sos_id=sos_id)
    client.post("/v1/sos", json=bundle)

    # Query all active SOS beacons
    res = client.get("/v1/sos?status=PENDING&min_severity=2")
    assert res.status_code == 200
    data = res.json()
    assert data["provenance_tag"] == "SIMULATED"
    assert data["total"] >= 1
    found = any(r["sos_id"] == sos_id for r in data["sos_records"])
    assert found is True


def test_acknowledge_sos_and_generate_ack_event():
    sos_id = f"01J9TESTACK{uuid.uuid4().hex[:16].upper()}"
    bundle = _make_sample_sos_bundle(sos_id=sos_id)
    client.post("/v1/sos", json=bundle)

    ack_payload = {
        "responder_name": "ODRAF Team Puri Unit 3",
        "estimated_arrival_minutes": 20,
        "instructions": "Inflatable rescue boat dispatched. Stay on upper terrace."
    }

    res = client.post(f"/v1/sos/{sos_id}/ack", json=ack_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["sos_id"] == sos_id
    assert data["status"] == "ACKNOWLEDGED"
    assert "ODRAF Team Puri Unit 3" in data["assigned_responder"]
    assert "SIMULATED DISPATCH" in data["notice"]

    ack_event = data["ack_event"]
    assert ack_event["kind"] == "SOS_ACK"
    assert ack_event["ref"] == sos_id
    assert ack_event["author"] == "gov_ed25519_suraksha_v1"
    assert ack_event["sig"].startswith("gov_sig_")
    assert "ETA ~20m" in ack_event["text"]


def test_acknowledge_nonexistent_sos_returns_404():
    res = client.post("/v1/sos/NONEXISTENT_SOS_12345/ack", json={"responder_name": "Team 1"})
    assert res.status_code == 404


def test_get_official_directives_and_provenance():
    res = client.get("/v1/official")
    assert res.status_code == 200
    data = res.json()
    assert data["provenance"] == "OFFICIAL FORECAST (IMD / OSDMA)"
    assert data["freshness"] == "VERIFIED_FRESH"
    assert len(data["official_events"]) >= 2
    
    # Verify evacuation order has kind=OFFICIAL and gov author
    evac_event = next(e for e in data["official_events"] if e["type"] == "evacuation_order")
    assert evac_event["kind"] == "OFFICIAL"
    assert evac_event["severity"] == 3
    assert evac_event["author"] == "gov_ed25519_suraksha_v1"
    assert evac_event["sig"].startswith("gov_sig_")
