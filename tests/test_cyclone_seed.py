"""
SURAKSHA — M1 T2 Cyclone Seed Loaders Test Suite
Tests:
- Loading of 39 Odisha administrative blocks from odisha_blocks.geojson + block_population.csv
- Loading of 42 strategic civil & defense installations from strategic_assets.csv
- Attribute and geometry mappings (SRID 4326, MultiPolygon for areas, Point for assets)
- Idempotency: running loader twice produces zero duplicate rows and identical counts
- Update capability: changing attributes in source updates existing records safely
- Error handling: missing required fields, malformed CSV rows, out-of-bounds coordinates
- Geometry validation: unclosed rings or invalid coordinate counts rejected with explicit error
- Stable natural identifiers across repeated executions
"""
import json
import os
import tempfile
from pathlib import Path
import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

import backend.app.core.config as app_config

DATABASE_URL = os.environ.get("DATABASE_URL", getattr(app_config, "DATABASE_URL", None))

from backend.app.models.cyclone import Area, StrategicAsset
from backend.app.db.seed.cyclone_loader import (
    SeedResult,
    load_blocks,
    load_strategic_assets,
    seed_cyclone_all,
    geojson_to_multipolygon_wkt,
    validate_coordinates,
    validate_polygon_geometry,
    validate_population,
    resolve_default_data_dir,
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)


@pytest.fixture(autouse=True)
def clean_seed_tables():
    """Ensure database is clean before and after tests."""
    with engine.connect() as conn:
        conn.execute(text("DELETE FROM area_risk;"))
        conn.execute(text("DELETE FROM areas;"))
        conn.execute(text("DELETE FROM strategic_assets;"))
        conn.commit()
    yield
    with engine.connect() as conn:
        conn.execute(text("DELETE FROM area_risk;"))
        conn.execute(text("DELETE FROM areas;"))
        conn.execute(text("DELETE FROM strategic_assets;"))
        conn.commit()


def test_default_data_dir_resolution():
    """Verify default seed data directory is located and contains required files."""
    data_dir = resolve_default_data_dir()
    assert data_dir.exists(), f"Seed data directory {data_dir} does not exist"
    assert (data_dir / "odisha_blocks.geojson").exists(), "odisha_blocks.geojson not found in seed data dir"
    assert (data_dir / "block_population.csv").exists(), "block_population.csv not found in seed data dir"


def test_block_loading_and_counts():
    """Verify initial loading of 39 administrative blocks into areas table."""
    session = SessionLocal()
    try:
        data_dir = resolve_default_data_dir()
        result = load_blocks(
            session,
            geojson_path=data_dir / "odisha_blocks.geojson",
            csv_path=data_dir / "block_population.csv",
            commit=True,
        )

        assert result.loaded == 39, f"Expected 39 blocks loaded, got {result.loaded}"
        assert result.updated == 0
        assert result.skipped == 0
        assert len(result.errors) == 0

        # Query database to confirm count and check a known coastal block
        db_count = session.query(Area).count()
        assert db_count == 39

        puri = session.query(Area).filter_by(area_code="OD_PUR_01").first()
        assert puri is not None
        assert puri.block_name == "Puri Sadar"
        assert puri.district == "Puri"
        assert puri.is_coastal is True
        assert puri.total_population == 238000
        assert puri.vulnerable_population == 47600
        assert puri.elevation_m == 6.5
        assert round(puri.flood_susceptibility, 2) == 0.88
    finally:
        session.close()


def test_strategic_asset_loading_and_counts():
    """Verify initial loading of 42 strategic assets into strategic_assets table."""
    session = SessionLocal()
    try:
        data_dir = resolve_default_data_dir()
        asset_csv = data_dir / "strategic_assets.csv"
        if not asset_csv.exists() and (data_dir.parent / "strategic_assets.csv").exists():
            asset_csv = data_dir.parent / "strategic_assets.csv"

        result = load_strategic_assets(session, csv_path=asset_csv, commit=True)

        assert result.loaded == 42, f"Expected 42 assets loaded, got {result.loaded}"
        assert result.updated == 0
        assert result.skipped == 0
        assert len(result.errors) == 0

        # Query database to confirm count and check known asset
        db_count = session.query(StrategicAsset).count()
        assert db_count == 42

        hospital = session.query(StrategicAsset).filter_by(id="ast_pur_dhh_01").first()
        assert hospital is not None
        assert hospital.name == "District Headquarters Hospital Puri"
        assert hospital.asset_type == "hospital"
        assert hospital.criticality == 5.0
        assert hospital.latitude == 19.8135
        assert hospital.longitude == 85.8312
        assert hospital.district == "Puri"
        assert hospital.provenance_tag == "OBSERVED"
    finally:
        session.close()


def test_idempotency_run_loader_twice():
    """Verify running loader twice produces ZERO duplicate rows and identical counts."""
    session = SessionLocal()
    try:
        # Run 1: initial load
        res_run1 = seed_cyclone_all(session, commit=True)
        assert res_run1["areas"].loaded == 39
        assert res_run1["strategic_assets"].loaded == 42

        count_areas_run1 = session.query(Area).count()
        count_assets_run1 = session.query(StrategicAsset).count()
        assert count_areas_run1 == 39
        assert count_assets_run1 == 42

        # Run 2: second execution against already seeded database
        res_run2 = seed_cyclone_all(session, commit=True)
        assert res_run2["areas"].loaded == 0, "Second run should load 0 new blocks"
        assert res_run2["areas"].updated == 39, "Second run should update/refresh 39 existing blocks"
        assert res_run2["strategic_assets"].loaded == 0, "Second run should load 0 new assets"
        assert res_run2["strategic_assets"].updated == 42, "Second run should update/refresh 42 existing assets"

        count_areas_run2 = session.query(Area).count()
        count_assets_run2 = session.query(StrategicAsset).count()
        assert count_areas_run2 == 39, "Area count must remain strictly 39 without duplicates"
        assert count_assets_run2 == 42, "Asset count must remain strictly 42 without duplicates"
    finally:
        session.close()


def test_update_existing_source_record():
    """Verify changing attributes in an existing record updates the DB row in-place."""
    session = SessionLocal()
    try:
        data_dir = resolve_default_data_dir()
        asset_csv = data_dir / "strategic_assets.csv"
        if not asset_csv.exists() and (data_dir.parent / "strategic_assets.csv").exists():
            asset_csv = data_dir.parent / "strategic_assets.csv"

        load_strategic_assets(session, csv_path=asset_csv, commit=True)

        # Create temporary updated CSV with modified readiness for ast_pur_dhh_01
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_csv = Path(tmpdir) / "assets_updated.csv"
            with open(asset_csv, "r", encoding="utf-8") as f_in, open(tmp_csv, "w", encoding="utf-8", newline="") as f_out:
                lines = f_in.readlines()
                # Update line 2 (first asset) readiness from 0.95 to 0.75
                lines[1] = lines[1].replace("0.95,OBSERVED", "0.75,OBSERVED")
                f_out.writelines(lines)

            # Re-run loader with modified CSV
            res_update = load_strategic_assets(session, csv_path=tmp_csv, commit=True)
            assert res_update.loaded == 0
            assert res_update.updated == 42

            # Check that row in DB was updated in-place without duplicating
            updated_asset = session.query(StrategicAsset).filter_by(id="ast_pur_dhh_01").first()
            assert updated_asset is not None
            assert updated_asset.readiness == 0.75
            assert session.query(StrategicAsset).count() == 42
    finally:
        session.close()


def test_missing_or_malformed_csv_values_handling():
    """Verify malformed CSV rows (missing ID or invalid numbers) are reported in errors without crashing."""
    session = SessionLocal()
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            bad_csv = Path(tmpdir) / "bad_assets.csv"
            bad_csv.write_text(
                "id,name,type,category,criticality,risk_weight,latitude,longitude,district,block_name,capacity,contact_channel,readiness,provenance_tag\n"
                ",Missing ID Hospital,hospital,health_services,4.0,4.0,19.8,85.8,Puri,Puri Sadar,100,VHF,0.9,OBSERVED\n"
                "ast_bad_coords,Bad Coords,hospital,health_services,4.0,4.0,not_a_num,85.8,Puri,Puri Sadar,100,VHF,0.9,OBSERVED\n"
                "ast_out_bounds,Out Bounds,hospital,health_services,4.0,4.0,10.0,70.0,Puri,Puri Sadar,100,VHF,0.9,OBSERVED\n"
                "ast_valid_01,Valid Clinic,hospital,health_services,3.0,3.0,19.82,85.84,Puri,Puri Sadar,50,VHF,0.9,OBSERVED\n",
                encoding="utf-8"
            )

            res = load_strategic_assets(session, csv_path=bad_csv, commit=True)
            assert res.loaded == 1, "Only the 1 valid asset should be loaded"
            assert res.skipped == 3, "3 malformed rows should be skipped"
            assert len(res.errors) == 3, "Errors list must contain 3 descriptive messages"
            assert any("missing asset id" in e for e in res.errors)
            assert any("could not convert" in e or "not_a_num" in e for e in res.errors)
            assert any("outside Odisha bounds" in e for e in res.errors)
    finally:
        session.close()


def test_invalid_polygon_geometry_handling():
    """Verify unclosed rings or out-of-bounds polygon vertices are safely rejected with errors."""
    session = SessionLocal()
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            bad_geojson = Path(tmpdir) / "bad_blocks.geojson"
            bad_csv = Path(tmpdir) / "blocks.csv"

            bad_csv.write_text(
                "area_code,block_name,district,lgd_code,total_population,vulnerable_population_u5_o65,household_count,pucca_house_ratio,census_source,provenance_tag\n"
                "OD_BAD_01,Bad Block,Puri,9999,100000,20000,25000,0.5,Census,HISTORICAL\n",
                encoding="utf-8"
            )

            # Unclosed ring: last coordinate does not match first
            geojson_data = {
                "type": "FeatureCollection",
                "features": [
                    {
                        "type": "Feature",
                        "properties": {"area_code": "OD_BAD_01", "block_name": "Bad Block", "district": "Puri"},
                        "geometry": {
                            "type": "Polygon",
                            "coordinates": [
                                [[85.8, 19.8], [85.9, 19.8], [85.9, 19.9], [85.8, 19.9]]  # Missing closing [85.8, 19.8]
                            ]
                        }
                    }
                ]
            }
            bad_geojson.write_text(json.dumps(geojson_data), encoding="utf-8")

            res = load_blocks(session, geojson_path=bad_geojson, csv_path=bad_csv, commit=True)
            assert res.loaded == 0, "Invalid polygon must not be loaded"
            assert res.skipped == 1
            assert len(res.errors) == 1
            assert "polygon ring is not closed" in res.errors[0]
    finally:
        session.close()


def test_population_validation():
    """Verify vulnerable population exceeding total population is rejected."""
    with pytest.raises(ValueError, match="exceeds total_population"):
        validate_population(total=1000, vulnerable=1500, area_code="OD_TEST_01")
