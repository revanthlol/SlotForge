import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.core.db import Base

class TimetableVersion(Base):
    __tablename__ = "timetable_versions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String, default="draft", server_default="draft", nullable=False) # 'draft', 'published', 'archived'
    scores: Mapped[dict] = mapped_column(JSONB, default=dict, server_default='{}', nullable=False)
    created_by: Mapped[uuid.UUID] = mapped_column(nullable=True) # References auth.users(id)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("organization_id", "version_number", name="uq_org_version_num"),
    )
