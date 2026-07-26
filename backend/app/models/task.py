import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, ForeignKey, DateTime, Integer, Boolean
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, synonym
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy import event
from app.core.db import Base
from app.models.workspace import auto_populate_workspace_id_listener

class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("scheduling_workspaces.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    task_type: Mapped[str] = mapped_column(String, nullable=False)  # "subject" / "shift" / "session" / "exam"
    required_hours: Mapped[Optional[int]] = mapped_column("required_hours", Integer, nullable=True)
    weekly_hours = synonym("required_hours")
    requires_continuous_slots: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)
    task_metadata: Mapped[dict] = mapped_column("metadata", JSONB, default=dict, server_default='{}', nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    def __init__(self, **kwargs):
        color = kwargs.pop("color", None)
        session_length = kwargs.pop("session_length", None)
        super().__init__(**kwargs)
        if color is not None:
            self.color = color
        if session_length is not None:
            self.session_length = session_length

    __mapper_args__ = {
        "polymorphic_on": "task_type",
    }

    @hybrid_property
    def color(self):
        return self.task_metadata.get("color")

    @color.setter
    def color(self, value):
        if self.task_metadata is None:
            self.task_metadata = {}
        # Make a copy to trigger update detection
        meta = dict(self.task_metadata)
        meta["color"] = value
        self.task_metadata = meta

    @hybrid_property
    def session_length(self):
        return self.task_metadata.get("session_length", 1)

    @session_length.setter
    def session_length(self, value):
        if self.task_metadata is None:
            self.task_metadata = {}
        meta = dict(self.task_metadata)
        meta["session_length"] = value
        self.task_metadata = meta

event.listen(Task, "before_insert", auto_populate_workspace_id_listener, propagate=True)
