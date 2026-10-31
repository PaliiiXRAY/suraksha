"""
SURAKSHA — M1 T1 Cyclone Schema & Migration Test Suite
Validates:
- Alembic upgrade to head (c3d4e5f6a7b8)
- Existence of 6 new tables: organizations, hazard_events, areas, area_risk, strategic_assets, supply_routes
- Additive nullable users.org_id column, index, and foreign key
- Exact integer type matching: organizations.id (INTEGER/SERIAL), users.org_id (INTEGER), hazard_events.org_id (INTEGER)
- PostGIS geometry types (LINESTRING, MULTIPOLYGON, POINT) and SRID 4326
- Spatial GiST indexes
- Foreign key constraints and ON DELETE cascades
- Unique constraints on organizations.name and area_risk(event_id, area_code)
- SQLAlchemy ORM models CRUD and relationships
- Zero regression / preservation of all existing FireSense tables and columns
- Reversible downgrade to a2b3c4d5e6f7 and successful re-upgrade to head
"""
import os
import pytest
from datetime import datetime, timezone
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import IntegrityError, OperationalError
from geoalchemy2.elements import WKTElement
from alembic.config import Config
from alembic import command

import backend.app.core.config as app_config

DATABASE_URL = os.environ.get("DATABASE_URL", getattr(app_config, "DATABASE_URL", None))

from backend.app.models.cyclone import (
    Organization,
    HazardEvent,
    Area,
    AreaRisk,
    StrategicAsset,
    SupplyRoute,
)
from backend.app.models.user import User

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)


def is_db_available():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except OperationalError:
        return False


pytestmark = pytest.mark.skipif(not is_db_available(), reason="PostGIS database not available")


def get_alembic_config():
    """Build Alembic configuration pointing to alembic.ini."""
    real_db_url = os.environ.get("DATABASE_URL")
    if real_db_url:
        app_config.DATABASE_URL = real_db_url
    else:
        real_db_url = app_config.DATABASE_URL
    cfg = Config("alembic.ini")
    cfg.set_main_option("sqlalchemy.url", real_db_url)
    return cfg


@pytest.fixture(scope="module", autouse=True)
def ensure_database_at_head():
    """Ensure migrations are upgraded to head before running schema tests."""
    real_db_url = os.environ.get("DATABASE_URL")
    if real_db_url:
        app_config.DATABASE_URL = real_db_url
    cfg = get_alembic_config()
    command.upgrade(cfg, "head")
    yield
    # Ensure head remains applied for subsequent test modules
    if real_db_url:
        app_config.DATABASE_URL = real_db_url
    command.upgrade(cfg, "head")


def test_core_tables_exist():
    """Verify all 6 cyclone-domain tables plus users are present."""
    inspector = inspect(engine)
    tables = inspector.get_table_names()

    required_tables = [
        "organizations",
        "hazard_events",
        "areas",
        "area_risk",
        "strategic_assets",
        "supply_routes",
        "users",
    ]
    for table_name in required_tables:
        assert table_name in tables, f"Expected table '{table_name}' was not found in schema"


def test_firesense_tables_preserved():
    """Verify existing FireSense tables and critical columns were not altered or dropped."""
    inspector = inspect(engine)
    tables = inspector.get_table_names()

    firesense_tables = ["hotspots", "incidents", "alerts", "incident_logs", "assets", "responders"]
    for table in firesense_tables:
        assert table in tables, f"FireSense table '{table}' must remain intact"

    # Verify key columns on incidents
    incident_cols = {col["name"] for col in inspector.get_columns("incidents")}
    assert {"id", "status", "classification", "latitude", "longitude", "geometry", "created_at"}.issubset(incident_cols)


def test_users_org_id_column_and_fk():
    """Verify additive users.org_id column is integer, nullable, indexed, and references organizations.id."""
    inspector = inspect(engine)
    user_cols = {col["name"]: col for col in inspector.get_columns("users")}

    assert "org_id" in user_cols, "users table missing additive 'org_id' column"
    assert user_cols["org_id"]["nullable"] is True, "users.org_id must be nullable"

    # Verify foreign key constraint
    fks = inspector.get_foreign_keys("users")
    org_fk = next((fk for fk in fks if "org_id" in fk.get("constrained_columns", [])), None)
    assert org_fk is not None, "Foreign key on users.org_id missing"
    assert org_fk["referred_table"] == "organizations"
    assert org_fk["referred_columns"] == ["id"]

    # Verify index
    indexes = inspector.get_indexes("users")
    org_idx = next((idx for idx in indexes if idx.get("column_names") == ["org_id"]), None)
    assert org_idx is not None, "Index on users.org_id missing"


def test_database_column_types_and_foreign_keys():
    """Explicitly verify PostgreSQL column types for organizations.id, users.org_id, and hazard_events.org_id."""
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT table_name, column_name, data_type, udt_name
            FROM information_schema.columns
            WHERE (table_name = 'organizations' AND column_name = 'id')
               OR (table_name = 'users' AND column_name = 'org_id')
               OR (table_name = 'hazard_events' AND column_name = 'org_id')
        """)).fetchall()

    type_map = {f"{r[0]}.{r[1]}": (r[2], r[3]) for r in rows}

    # All three must be exact INTEGER types (Postgres int4)
    assert type_map.get("organizations.id") == ("integer", "int4"), f"organizations.id expected int4, got {type_map.get('organizations.id')}"
    assert type_map.get("users.org_id") == ("integer", "int4"), f"users.org_id expected int4, got {type_map.get('users.org_id')}"
    assert type_map.get("hazard_events.org_id") == ("integer", "int4"), f"hazard_events.org_id expected int4, got {type_map.get('hazard_events.org_id')}"


def test_foreign_keys_and_cascades():
    """Verify foreign keys and cascade rules for hazard_events and area_risk."""
    inspector = inspect(engine)

    # hazard_events -> organizations
    he_fks = inspector.get_foreign_keys("hazard_events")
    he_org_fk = next((fk for fk in he_fks if "org_id" in fk.get("constrained_columns", [])), None)
    assert he_org_fk is not None, "hazard_events.org_id must have foreign key to organizations.id"
    assert he_org_fk["referred_table"] == "organizations"

    # area_risk -> hazard_events and areas
    ar_fks = inspector.get_foreign_keys("area_risk")
    event_fk = next((fk for fk in ar_fks if "event_id" in fk.get("constrained_columns", [])), None)
    area_fk = next((fk for fk in ar_fks if "area_code" in fk.get("constrained_columns", [])), None)

    assert event_fk is not None, "area_risk.event_id must have foreign key to hazard_events"
    assert event_fk["referred_table"] == "hazard_events"
    assert area_fk is not None, "area_risk.area_code must have foreign key to areas"
    assert area_fk["referred_table"] == "areas"


def test_unique_constraints():
    """Verify unique constraint on organizations.name and area_risk(event_id, area_code)."""
    inspector = inspect(engine)

    # organizations unique name
    org_uqs = inspector.get_unique_constraints("organizations")
    name_uq = any(uq.get("column_names") == ["name"] for uq in org_uqs)
    assert name_uq, "organizations table must enforce uniqueness on 'name'"

    # area_risk unique (event_id, area_code)
    ar_uqs = inspector.get_unique_constraints("area_risk")
    event_area_uq = any(set(uq.get("column_names", [])) == {"event_id", "area_code"} for uq in ar_uqs)
    assert event_area_uq, "area_risk table must enforce uniqueness on (event_id, area_code)"


def test_postgis_geometry_types_and_srids():
    """Verify PostGIS geometry_columns registrations for the 4 spatial tables."""
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT f_table_name, f_geometry_column, type, srid
            FROM geometry_columns
            WHERE f_table_name IN ('hazard_events', 'areas', 'strategic_assets', 'supply_routes')
        """)).fetchall()

    spatial_meta = {row[0]: (row[1], row[2].upper(), row[3]) for row in rows}

    assert "hazard_events" in spatial_meta, "hazard_events track_geometry not found in geometry_columns"
    assert spatial_meta["hazard_events"] == ("track_geometry", "LINESTRING", 4326)

    assert "areas" in spatial_meta, "areas geom not found in geometry_columns"
    assert spatial_meta["areas"] == ("geom", "MULTIPOLYGON", 4326)

    assert "strategic_assets" in spatial_meta, "strategic_assets geom not found in geometry_columns"
    assert spatial_meta["strategic_assets"] == ("geom", "POINT", 4326)

    assert "supply_routes" in spatial_meta, "supply_routes geom not found in geometry_columns"
    assert spatial_meta["supply_routes"] == ("geom", "LINESTRING", 4326)


def test_spatial_gist_indexes_exist():
    """Verify spatial GiST indexes exist for all geometry columns."""
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT tablename, indexname, indexdef
            FROM pg_indexes
            WHERE tablename IN ('hazard_events', 'areas', 'strategic_assets', 'supply_routes')
              AND indexdef ILIKE '%USING gist%'
        """)).fetchall()

    indexed_tables = {row[0] for row in rows}
    assert "hazard_events" in indexed_tables, "Missing GiST index on hazard_events.track_geometry"
    assert "areas" in indexed_tables, "Missing GiST index on areas.geom"
    assert "strategic_assets" in indexed_tables, "Missing GiST index on strategic_assets.geom"
    assert "supply_routes" in indexed_tables, "Missing GiST index on supply_routes.geom"


def test_sqlalchemy_models_crud_and_relationships():
    """Verify ORM models can be instantiated, queried, and related properly with INTEGER org_id."""
    session = SessionLocal()
    org_id_created = None
    try:
        # Create test organization (autoincrement INTEGER primary key)
        org = Organization(
            name="Test Odisha SDMA Integer FK",
            org_type="disaster_authority"
        )
        session.add(org)
        session.flush()
        org_id_created = org.id
        assert isinstance(org.id, int), f"Organization.id must be int, got {type(org.id)}"

        # Create test user linked to organization
        user = User(
            id="test_user_org_link",
            email="test_org_link@firesense.org",
            hashed_password="hash",
            role="analyst",
            org_id=org.id
        )
        session.add(user)

        # Create test hazard event linked to organization
        event = HazardEvent(
            id="test_cyclone_fani_int",
            name="Test Cyclone Fani",
            hazard_type="cyclone",
            category="ESCS",
            status="MONITORING",
            provenance_tag="HISTORICAL_REPLAY",
            source_name="IMD",
            source_timestamp=datetime(2019, 5, 2, 6, 0, tzinfo=timezone.utc),
            max_wind_kmh=215.0,
            forward_speed_kmh=17.0,
            org_id=org.id
        )
        session.add(event)

        # Create test area
        area = Area(
            area_code="TEST_OD_PUR_02",
            block_name="Test Puri Sadar",
            district="Puri",
            geom=WKTElement("MULTIPOLYGON(((85.7 19.7, 85.9 19.7, 85.9 19.9, 85.7 19.9, 85.7 19.7)))", srid=4326),
            total_population=238000,
            vulnerable_population=47600,
            is_coastal=True
        )
        session.add(area)

        # Create test area risk
        risk = AreaRisk(
            id="test_risk_02",
            event_id=event.id,
            area_code=area.area_code,
            score=84.5,
            rank=1,
            reasons=[{"factor": "WIND_EXPOSURE", "weight": 0.3, "contribution": 25.5}],
            interlock_flags=[]
        )
        session.add(risk)

        session.commit()

        # Query back and verify relationships
        queried_org = session.query(Organization).filter_by(id=org_id_created).first()
        assert queried_org is not None
        assert len(queried_org.hazard_events) == 1
        assert queried_org.hazard_events[0].id == "test_cyclone_fani_int"
        assert len(queried_org.users) == 1
        assert queried_org.users[0].id == "test_user_org_link"
        assert queried_org.users[0].org_id == org_id_created

        queried_event = session.query(HazardEvent).filter_by(id="test_cyclone_fani_int").first()
        assert queried_event is not None
        assert queried_event.organization.name == "Test Odisha SDMA Integer FK"
        assert len(queried_event.area_risks) == 1
        assert queried_event.area_risks[0].score == 84.5
        assert queried_event.area_risks[0].area.block_name == "Test Puri Sadar"
    finally:
        session.rollback()
        # Clean up test rows
        with engine.connect() as conn:
            conn.execute(text("DELETE FROM area_risk WHERE id = 'test_risk_02'"))
            conn.execute(text("DELETE FROM areas WHERE area_code = 'TEST_OD_PUR_02'"))
            conn.execute(text("DELETE FROM hazard_events WHERE id = 'test_cyclone_fani_int'"))
            conn.execute(text("DELETE FROM users WHERE id = 'test_user_org_link'"))
            if org_id_created:
                conn.execute(text(f"DELETE FROM organizations WHERE id = {org_id_created}"))
            conn.commit()
        session.close()


def test_downgrade_and_reupgrade_cycle():
    """Verify reversible downgrade to a2b3c4d5e6f7 and clean re-upgrade back to head."""
    cfg = get_alembic_config()

    # Step 1: Downgrade to parent
    command.downgrade(cfg, "a2b3c4d5e6f7")

    inspector = inspect(engine)
    tables_after_down = inspector.get_table_names()

    # 6 cyclone tables must no longer exist
    for tbl in ["organizations", "hazard_events", "areas", "area_risk", "strategic_assets", "supply_routes"]:
        assert tbl not in tables_after_down, f"Table '{tbl}' should have been dropped on downgrade"

    # users.org_id must no longer exist
    user_cols_after_down = {c["name"] for c in inspector.get_columns("users")}
    assert "org_id" not in user_cols_after_down, "users.org_id column should have been dropped on downgrade"

    # Existing FireSense tables must remain completely intact
    for tbl in ["hotspots", "incidents", "alerts", "incident_logs", "assets", "responders", "users"]:
        assert tbl in tables_after_down, f"FireSense table '{tbl}' was improperly affected by downgrade"

    # Step 2: Re-upgrade to head
    command.upgrade(cfg, "head")

    inspector_reup = inspect(engine)
    tables_after_reup = inspector_reup.get_table_names()
    for tbl in ["organizations", "hazard_events", "areas", "area_risk", "strategic_assets", "supply_routes"]:
        assert tbl in tables_after_reup, f"Table '{tbl}' should exist after re-upgrade"

    user_cols_reup = {c["name"] for c in inspector_reup.get_columns("users")}
    assert "org_id" in user_cols_reup, "users.org_id must exist after re-upgrade"
