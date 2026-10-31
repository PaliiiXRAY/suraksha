"""Additive Cyclone & Multi-Hazard Schema Migration

Revision ID: c3d4e5f6a7b8
Revises: a2b3c4d5e6f7
Create Date: 2026-10-30 18:30:00.000000

Creates:
1. organizations (multi-tenant boundary with SERIAL / INTEGER id)
2. users.org_id (additive INTEGER foreign key)
3. hazard_events (cyclone lifecycle parent with INTEGER org_id)
4. areas (administrative blocks & vulnerability baseline)
5. area_risk (6-factor calculated risk prioritization)
6. strategic_assets (critical civil & defense infrastructure)
7. supply_routes (arterial road evacuation network)
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import geoalchemy2

# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, None] = 'a2b3c4d5e6f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create Organizations Table (SERIAL / INTEGER primary key)
    op.create_table(
        'organizations',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('org_type', sa.String(length=64), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index(op.f('ix_organizations_id'), 'organizations', ['id'], unique=False)
    op.create_index(op.f('ix_organizations_org_type'), 'organizations', ['org_type'], unique=False)

    # 2. Additive Column users.org_id (INTEGER foreign key)
    op.add_column('users', sa.Column('org_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_users_org_id',
        'users', 'organizations',
        ['org_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_index(op.f('ix_users_org_id'), 'users', ['org_id'], unique=False)

    # 3. Create Hazard Events Table (INTEGER org_id foreign key)
    op.create_table(
        'hazard_events',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('hazard_type', sa.String(length=32), server_default='cyclone', nullable=False),
        sa.Column('category', sa.String(length=32), nullable=False),
        sa.Column('status', sa.String(length=32), server_default='MONITORING', nullable=False),
        sa.Column('provenance_tag', sa.String(length=32), server_default='HISTORICAL_REPLAY', nullable=False),
        sa.Column('source_name', sa.String(length=64), server_default='IMD', nullable=False),
        sa.Column('source_published_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('source_timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('data_freshness', sa.String(length=32), server_default='VERIFIED_FRESH', nullable=False),
        sa.Column('max_wind_kmh', sa.Float(), nullable=False),
        sa.Column('forward_speed_kmh', sa.Float(), nullable=False),
        sa.Column('target_landfall', sa.String(length=120), nullable=True),
        sa.Column('track_geometry', geoalchemy2.types.Geometry(geometry_type='LINESTRING', srid=4326, from_text='ST_GeomFromEWKT', name='geometry'), nullable=True),
        sa.Column('org_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], name='fk_hazard_events_org_id', ondelete='RESTRICT')
    )
    op.create_index(op.f('ix_hazard_events_id'), 'hazard_events', ['id'], unique=False)
    op.create_index(op.f('ix_hazard_events_status'), 'hazard_events', ['status'], unique=False)
    op.create_index(op.f('ix_hazard_events_hazard_type'), 'hazard_events', ['hazard_type'], unique=False)
    op.create_index(op.f('ix_hazard_events_org_id'), 'hazard_events', ['org_id'], unique=False)

    # 4. Create Areas Table
    op.create_table(
        'areas',
        sa.Column('area_code', sa.String(length=32), nullable=False),
        sa.Column('block_name', sa.String(length=120), nullable=False),
        sa.Column('district', sa.String(length=64), nullable=False),
        sa.Column('lgd_code', sa.String(length=32), nullable=True),
        sa.Column('geom', geoalchemy2.types.Geometry(geometry_type='MULTIPOLYGON', srid=4326, from_text='ST_GeomFromEWKT', name='geometry'), nullable=False),
        sa.Column('total_population', sa.Integer(), server_default='0', nullable=False),
        sa.Column('vulnerable_population', sa.Integer(), server_default='0', nullable=False),
        sa.Column('elevation_m', sa.Float(), server_default='10.0', nullable=False),
        sa.Column('is_coastal', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('flood_susceptibility', sa.Float(), server_default='0.0', nullable=False),
        sa.PrimaryKeyConstraint('area_code')
    )
    op.create_index(op.f('ix_areas_area_code'), 'areas', ['area_code'], unique=False)
    op.create_index(op.f('ix_areas_district'), 'areas', ['district'], unique=False)
    op.create_index(op.f('ix_areas_block_name'), 'areas', ['block_name'], unique=False)

    # 5. Create Area Risk Table
    op.create_table(
        'area_risk',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('event_id', sa.String(length=64), nullable=False),
        sa.Column('area_code', sa.String(length=32), nullable=False),
        sa.Column('score', sa.Float(), nullable=False),
        sa.Column('rank', sa.Integer(), nullable=False),
        sa.Column('reasons', postgresql.JSONB(astext_type=sa.Text()), server_default='[]', nullable=False),
        sa.Column('interlock_flags', postgresql.JSONB(astext_type=sa.Text()), server_default='[]', nullable=False),
        sa.Column('provenance_tag', sa.String(length=32), server_default='MODEL_ESTIMATE', nullable=False),
        sa.Column('calculated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['event_id'], ['hazard_events.id'], name='fk_area_risk_event_id', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['area_code'], ['areas.area_code'], name='fk_area_risk_area_code', ondelete='CASCADE'),
        sa.UniqueConstraint('event_id', 'area_code', name='uq_area_risk_event_area')
    )
    op.create_index(op.f('ix_area_risk_id'), 'area_risk', ['id'], unique=False)
    op.create_index(op.f('ix_area_risk_event_id'), 'area_risk', ['event_id'], unique=False)
    op.create_index(op.f('ix_area_risk_area_code'), 'area_risk', ['area_code'], unique=False)
    op.create_index('ix_area_risk_event_score', 'area_risk', ['event_id', 'score'], unique=False)

    # 6. Create Strategic Assets Table
    op.create_table(
        'strategic_assets',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('asset_type', sa.String(length=64), nullable=False),
        sa.Column('category', sa.String(length=64), server_default='CIVIL', nullable=True),
        sa.Column('criticality', sa.Float(), server_default='1.0', nullable=False),
        sa.Column('geom', geoalchemy2.types.Geometry(geometry_type='POINT', srid=4326, from_text='ST_GeomFromEWKT', name='geometry'), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.Column('district', sa.String(length=64), nullable=False),
        sa.Column('block_name', sa.String(length=120), nullable=True),
        sa.Column('capacity', sa.String(length=120), nullable=True),
        sa.Column('contact_channel', sa.String(length=120), nullable=True),
        sa.Column('readiness', sa.Float(), server_default='1.0', nullable=True),
        sa.Column('provenance_tag', sa.String(length=32), server_default='OBSERVED', nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_strategic_assets_id'), 'strategic_assets', ['id'], unique=False)
    op.create_index(op.f('ix_strategic_assets_asset_type'), 'strategic_assets', ['asset_type'], unique=False)
    op.create_index(op.f('ix_strategic_assets_district'), 'strategic_assets', ['district'], unique=False)

    # 7. Create Supply Routes Table
    op.create_table(
        'supply_routes',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('osm_id', sa.String(length=64), nullable=True),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('route_type', sa.String(length=64), server_default='PRIMARY', nullable=False),
        sa.Column('geom', geoalchemy2.types.Geometry(geometry_type='LINESTRING', srid=4326, from_text='ST_GeomFromEWKT', name='geometry'), nullable=False),
        sa.Column('surface', sa.String(length=32), server_default='paved', nullable=True),
        sa.Column('bridge_count', sa.Integer(), server_default='0', nullable=True),
        sa.Column('districts', sa.String(length=120), nullable=True),
        sa.Column('lanes', sa.Integer(), server_default='2', nullable=True),
        sa.Column('length_km', sa.Float(), nullable=True),
        sa.Column('baseline_status', sa.String(length=32), server_default='PASSABLE_WITH_EVIDENCE', nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_supply_routes_id'), 'supply_routes', ['id'], unique=False)
    op.create_index(op.f('ix_supply_routes_route_type'), 'supply_routes', ['route_type'], unique=False)


def downgrade() -> None:
    # Reverse order: drop created tables and additive columns
    op.drop_table('supply_routes')
    op.drop_table('strategic_assets')
    op.drop_table('area_risk')
    op.drop_table('areas')
    op.drop_table('hazard_events')

    op.drop_index(op.f('ix_users_org_id'), table_name='users')
    op.drop_constraint('fk_users_org_id', 'users', type_='foreignkey')
    op.drop_column('users', 'org_id')

    op.drop_table('organizations')
