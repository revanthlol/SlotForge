"""add_assignment_tables

Revision ID: 7f3d84b0a93a
Revises: 0591f3e6ceec
Create Date: 2026-06-26 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "7f3d84b0a93a"
down_revision: Union[str, None] = "0591f3e6ceec"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("sections", sa.Column("class_teacher_id", sa.Uuid(), nullable=True))
    op.create_foreign_key(
        "fk_sections_class_teacher_id_teachers",
        "sections",
        "teachers",
        ["class_teacher_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_table(
        "teacher_subject_assignments",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("teacher_id", sa.Uuid(), nullable=False),
        sa.Column("subject_id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["teacher_id"], ["teachers.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["subject_id"], ["subjects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "organization_id",
            "teacher_id",
            "subject_id",
            name="uq_teacher_subject_assignment_org_teacher_subject",
        ),
    )
    op.create_table(
        "section_subject_teacher_assignments",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("section_id", sa.Uuid(), nullable=False),
        sa.Column("subject_id", sa.Uuid(), nullable=False),
        sa.Column("teacher_id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["section_id"], ["sections.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["subject_id"], ["subjects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["teacher_id"], ["teachers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "organization_id",
            "section_id",
            "subject_id",
            name="uq_section_subject_teacher_assignment_org_section_subject",
        ),
    )


def downgrade() -> None:
    op.drop_table("section_subject_teacher_assignments")
    op.drop_table("teacher_subject_assignments")
    op.drop_constraint("fk_sections_class_teacher_id_teachers", "sections", type_="foreignkey")
    op.drop_column("sections", "class_teacher_id")
