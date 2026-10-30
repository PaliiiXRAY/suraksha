"""Additive Hazard Event Logs Audit Migration

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-10-30 19:15:00.000000

Creates:
- hazard_event_logs: append-only audit trail of cyclone status transitions and actions
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'hazard_event_logs',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('hazard_event_id', sa.String(length=64), nullable=False),
        sa.Column('old_status', sa.String(length=32), nullable=True),
        sa.Column('new_status', sa.String(length=32), nullable=False),
        sa.Column('action', sa.String(length=64), nullable=False),
        sa.Column('changed_by', sa.String(length=120), nullable=True),
        sa.Column('note', sa.String(length=255), nullable=True),
        sa.Column('changed_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('interlock_flags', postgresql.JSONB(astext_type=sa.Text()), server_default='[]', nullable=True),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['hazard_event_id'], ['hazard_events.id'], name='fk_hazard_event_logs_event_id', ondelete='CASCADE')
    )
    op.create_index(op.f('ix_hazard_event_logs_id'), 'hazard_event_logs', ['id'], unique=False)
    op.create_index(op.f('ix_hazard_event_logs_hazard_event_id'), 'hazard_event_logs', ['hazard_event_id'], unique=False)
    op.create_index(op.f('ix_hazard_event_logs_changed_at'), 'hazard_event_logs', ['changed_at'], unique=False)


def downgrade() -> None:
    op.drop_table('hazard_event_logs')

