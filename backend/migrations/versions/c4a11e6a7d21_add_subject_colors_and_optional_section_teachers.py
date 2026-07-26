"""add_subject_colors_and_optional_section_teachers

Revision ID: c4a11e6a7d21
Revises: 9d2a4c7b1e10
Create Date: 2026-06-29 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c4a11e6a7d21"
down_revision: Union[str, None] = "9d2a4c7b1e10"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("subjects", sa.Column("color", sa.String(length=7), nullable=True))
    op.alter_column("section_subject_teacher_assignments", "teacher_id", nullable=True)


def downgrade() -> None:
    op.execute("delete from section_subject_teacher_assignments where teacher_id is null")
    op.alter_column("section_subject_teacher_assignments", "teacher_id", nullable=False)
    op.drop_column("subjects", "color")
