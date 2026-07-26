"""add editable profile job title

Revision ID: c7d4e5f6a7b8
Revises: 8a1c2d3e4f50
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c7d4e5f6a7b8"
down_revision: Union[str, None] = "8a1c2d3e4f50"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("profiles", sa.Column("job_title", sa.String(length=80), nullable=True))


def downgrade() -> None:
    op.drop_column("profiles", "job_title")
