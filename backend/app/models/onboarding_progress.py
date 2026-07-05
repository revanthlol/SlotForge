import uuid
from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class OnboardingProgress(Base):
    __tablename__ = "onboarding_progress"
    __table_args__ = (
        UniqueConstraint("workspace_id", name="uq_onboarding_progress_workspace"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("scheduling_workspaces.id", ondelete="CASCADE"), nullable=False)
    current_step: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    completed_steps: Mapped[list[str]] = mapped_column(JSONB, default=list, server_default="[]", nullable=False)
    skipped: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
