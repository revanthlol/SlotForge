import uuid
from datetime import datetime, time
from typing import Optional
from sqlalchemy import String, ForeignKey, DateTime, Integer, Time
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import event
from app.core.db import Base
from app.models.workspace import auto_populate_workspace_id_listener

class TimeSlot(Base):
    __tablename__ = "timeslots"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("scheduling_workspaces.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)  # "Period 1" / "Morning Shift" / "9:00-10:00"
    day: Mapped[str] = mapped_column(String, nullable=False)  # "Monday" / "2024-06-10"
    start_time: Mapped[Optional[time]] = mapped_column(Time, nullable=True)
    end_time: Mapped[Optional[time]] = mapped_column(Time, nullable=True)
    slot_index: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

event.listen(TimeSlot, "before_insert", auto_populate_workspace_id_listener, propagate=True)
