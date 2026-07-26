"""add_organization_memberships

Revision ID: e2f3b9d48c10
Revises: c4a11e6a7d21
Create Date: 2026-06-29 00:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e2f3b9d48c10"
down_revision: Union[str, None] = "c4a11e6a7d21"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "organization_memberships",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("role", sa.String(), server_default="org_admin", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["profiles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "organization_id", name="uq_org_membership_user_org"),
    )
    op.execute(
        """
        insert into organization_memberships (id, user_id, organization_id, role, created_at)
        select gen_random_uuid(), id, organization_id, role, now()
        from profiles
        on conflict do nothing
        """
    )


def downgrade() -> None:
    op.drop_table("organization_memberships")
