import os
import json
import csv

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEED_DATA_DIR = os.path.join(BASE_DIR, "db", "seed", "data")

ODISHA_BBOX = {
    "min_lat": 17.78,
    "max_lat": 22.73,
    "min_lon": 81.37,
    "max_lon": 87.53
}

def test_fani_track_valid():
    path = os.path.join(SEED_DATA_DIR, "fani_2019_track.geojson")
    assert os.path.exists(path)
    with open(path) as f:
        data = json.load(f)
    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) >= 20
    assert data["metadata"]["provenance_tag"] == "REPLAY"
    assert data["metadata"]["is_simulated"] is False

    for feat in data["features"]:
        tag = feat["properties"]["provenance_tag"]
        assert tag == "REPLAY"
        assert tag != "LIVE"

def test_fani_warnings_valid():
    path = os.path.join(SEED_DATA_DIR, "fani_2019_warnings.json")
    assert os.path.exists(path)
    with open(path) as f:
        data = json.load(f)
    assert len(data["bulletins"]) >= 4
    assert data["provenance_tag"] == "REPLAY"
    for b in data["bulletins"]:
        assert b["provenance_tag"] == "REPLAY"
        assert "LIVE" not in b["provenance_tag"]

def test_odisha_blocks_valid():
    path = os.path.join(SEED_DATA_DIR, "odisha_blocks.geojson")
    assert os.path.exists(path)
    with open(path) as f:
        data = json.load(f)
    assert len(data["features"]) >= 35
    for feat in data["features"]:
        props = feat["properties"]
        assert props["provenance_tag"] == "HISTORICAL"
        assert ODISHA_BBOX["min_lat"] <= props["center_latitude"] <= ODISHA_BBOX["max_lat"]
        assert ODISHA_BBOX["min_lon"] <= props["center_longitude"] <= ODISHA_BBOX["max_lon"]

def test_block_population_valid():
    path = os.path.join(SEED_DATA_DIR, "block_population.csv")
    assert os.path.exists(path)
    with open(path) as f:
        reader = list(csv.DictReader(f))
    assert len(reader) >= 35
    for row in reader:
        assert int(row["total_population"]) > 50000
        assert row["provenance_tag"] == "HISTORICAL"

def test_osm_roads_valid():
    path = os.path.join(SEED_DATA_DIR, "osm_roads_coastal_odisha.geojson")
    assert os.path.exists(path)
    with open(path) as f:
        data = json.load(f)
    assert len(data["features"]) >= 10
    for feat in data["features"]:
        assert feat["properties"]["provenance_tag"] == "OBSERVED"
        coords = feat["geometry"]["coordinates"]
        for pt in coords:
            assert ODISHA_BBOX["min_lon"] <= pt[0] <= ODISHA_BBOX["max_lon"]
            assert ODISHA_BBOX["min_lat"] <= pt[1] <= ODISHA_BBOX["max_lat"]

def test_strategic_assets_odisha_bbox_and_criticality():
    for p in [os.path.join(SEED_DATA_DIR, "strategic_assets.csv"), os.path.join(BASE_DIR, "db", "seed", "strategic_assets.csv")]:
        assert os.path.exists(p)
        with open(p) as f:
            rows = list(csv.DictReader(f))
        assert len(rows) >= 40, f"Expected ~40 rows, got {len(rows)}"
        types = set(r["type"] for r in rows)
        assert {"hospital", "shelter", "ndrf_base", "relief_depot", "port", "fuel_depot"}.issubset(types)
        
        for r in rows:
            lat = float(r["latitude"])
            lon = float(r["longitude"])
            crit = float(r["criticality"])
            assert 1.0 <= crit <= 5.0
            assert ODISHA_BBOX["min_lat"] <= lat <= ODISHA_BBOX["max_lat"], f"{r['name']} lat {lat} outside Odisha bbox"
            assert ODISHA_BBOX["min_lon"] <= lon <= ODISHA_BBOX["max_lon"], f"{r['name']} lon {lon} outside Odisha bbox"
            assert r["provenance_tag"] == "OBSERVED"
            assert "LIVE" not in r["provenance_tag"]

def test_total_pack_size_under_50mb():
    total_bytes = 0
    for root, dirs, files in os.walk(SEED_DATA_DIR):
        for f in files:
            total_bytes += os.path.getsize(os.path.join(root, f))
    total_mb = total_bytes / (1024 * 1024)
    assert total_mb < 50.0, f"Pack size {total_mb} MB exceeds 50 MB limit!"
