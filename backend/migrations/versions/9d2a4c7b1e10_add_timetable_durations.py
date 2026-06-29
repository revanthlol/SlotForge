"""add_timetable_durations

Revision ID: 9d2a4c7b1e10
Revises: 7f3d84b0a93a
Create Date: 2026-06-26 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "9d2a4c7b1e10"
down_revision: Union[str, None] = "7f3d84b0a93a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("subjects", sa.Column("session_length", sa.Integer(), server_default="1", nullable=False))
    op.add_column("timetable_slots", sa.Column("duration_periods", sa.Integer(), server_default="1", nullable=False))
    op.create_check_constraint(
        "ck_subjects_session_length_valid",
        "subjects",
        "session_length in (1, 2)",
    )
    op.create_check_constraint(
        "ck_timetable_slots_duration_periods_valid",
        "timetable_slots",
        "duration_periods in (1, 2)",
    )


def downgrade() -> None:
    op.drop_constraint("ck_timetable_slots_duration_periods_valid", "timetable_slots", type_="check")
    op.drop_constraint("ck_subjects_session_length_valid", "subjects", type_="check")
    op.drop_column("timetable_slots", "duration_periods")
    op.drop_column("subjects", "session_length")
