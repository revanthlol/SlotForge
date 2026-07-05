import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, ForeignKey, DateTime, Integer
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import event
from app.core.db import Base
from app.models.workspace import auto_populate_workspace_id_listener

class Resource(Base):
    __tablename__ = "resources"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("scheduling_workspaces.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    resource_type: Mapped[str] = mapped_column(String, nullable=False)  # "teacher" / "employee" / "speaker" / "room"
    resource_metadata: Mapped[dict] = mapped_column("metadata", JSONB, default=dict, server_default='{}', nullable=False)
    availability: Mapped[dict] = mapped_column(JSONB, default=dict, server_default='{}', nullable=False)
    max_hours_per_week: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    __mapper_args__ = {
        "polymorphic_on": "resource_type",
    }

event.listen(Resource, "before_insert", auto_populate_workspace_id_listener, propagate=True)
