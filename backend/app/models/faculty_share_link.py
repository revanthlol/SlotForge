import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class FacultyShareLink(Base):
    __tablename__ = "faculty_share_links"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    token: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    organization_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("scheduling_workspaces.id", ondelete="CASCADE"), nullable=False)
    resource_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("resources.id", ondelete="CASCADE"), nullable=False)
    schedule_run_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("schedule_runs.id", ondelete="CASCADE"), nullable=False)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
