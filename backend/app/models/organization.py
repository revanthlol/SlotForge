import uuid
from datetime import datetime
from sqlalchemy import String, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.core.db import Base

class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, nullable=False)
    scheduling_mode: Mapped[str] = mapped_column(String, default="fixed_weekday", server_default="fixed_weekday", nullable=False)
    cycle_length: Mapped[int] = mapped_column(Integer, default=6, server_default="6", nullable=False)
    periods_per_day: Mapped[int] = mapped_column(Integer, default=5, server_default="5", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
