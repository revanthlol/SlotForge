import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, ForeignKey, DateTime, Boolean, UniqueConstraint, Integer
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import event
from app.core.db import Base
from app.models.workspace import auto_populate_workspace_id_listener

class ScheduleVersion(Base):
    __tablename__ = "schedule_versions"
    __table_args__ = (
        UniqueConstraint("workspace_id", "version_label", name="uq_workspace_version_label"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("scheduling_workspaces.id", ondelete="CASCADE"), nullable=False)
    version_label: Mapped[str] = mapped_column(String, nullable=False)  # "v1", "v2", "Draft A"
    version_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String, default="draft", server_default="draft", nullable=False)  # "draft", "published", "archived"
    scores: Mapped[dict] = mapped_column(JSONB, default=dict, server_default='{}', nullable=False)
    explanation: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    parent_version_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("schedule_versions.id", ondelete="SET NULL"), nullable=True)
    branch_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    is_manual_override: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)
    version_metadata: Mapped[dict] = mapped_column("metadata", JSONB, default=dict, server_default='{}', nullable=False)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    archived_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

event.listen(ScheduleVersion, "before_insert", auto_populate_workspace_id_listener, propagate=True)

@event.listens_for(ScheduleVersion, "before_insert", propagate=True)
def auto_populate_version_label(mapper, connection, target):
    if not getattr(target, "version_label", None):
        if getattr(target, "version_number", None) is not None:
            target.version_label = f"v{target.version_number}"
        else:
            target.version_label = f"Draft {uuid.uuid4().hex[:8]}"
