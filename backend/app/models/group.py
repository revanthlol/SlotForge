import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, ForeignKey, DateTime, Integer
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import event
from app.core.db import Base
from app.models.workspace import auto_populate_workspace_id_listener

class Group(Base):
    __tablename__ = "groups"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("scheduling_workspaces.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    group_type: Mapped[str] = mapped_column(String, nullable=False)  # "section" / "department" / "team"
    size: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    group_metadata: Mapped[dict] = mapped_column("metadata", JSONB, default=dict, server_default='{}', nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    def __init__(self, **kwargs):
        class_teacher_id = kwargs.pop("class_teacher_id", None)
        super().__init__(**kwargs)
        if class_teacher_id is not None:
            self.class_teacher_id = class_teacher_id

    __mapper_args__ = {
        "polymorphic_on": "group_type",
    }

event.listen(Group, "before_insert", auto_populate_workspace_id_listener, propagate=True)
