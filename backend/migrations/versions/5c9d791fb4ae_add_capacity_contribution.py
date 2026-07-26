"""add_capacity_contribution

Revision ID: 5c9d791fb4ae
Revises: 5bd6dc8d30e7
Create Date: 2026-07-05 16:53:14.247558

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5c9d791fb4ae'
down_revision: Union[str, None] = '5bd6dc8d30e7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('assignment_locations', sa.Column('capacity_contribution', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('assignment_locations', 'capacity_contribution')
