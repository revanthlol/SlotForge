"""phase 9 version lifecycle metadata

Revision ID: 8a1c2d3e4f50
Revises: fc1b2d3e4f50
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "8a1c2d3e4f50"
down_revision: Union[str, None] = "fc1b2d3e4f50"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("schedule_versions", sa.Column("branch_name", sa.String(), nullable=True))
    op.add_column("schedule_versions", sa.Column("published_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("schedule_versions", sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("schedule_versions", "archived_at")
    op.drop_column("schedule_versions", "published_at")
    op.drop_column("schedule_versions", "branch_name")
