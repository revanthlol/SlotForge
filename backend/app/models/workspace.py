import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.core.db import Base

class SchedulingWorkspace(Base):
    __tablename__ = "scheduling_workspaces"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    domain_preset: Mapped[str] = mapped_column(String, nullable=False)  # "academic" | "staff_roster" | "event" | "exam" | "facility"
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


def auto_populate_workspace_id_listener(mapper, connection, target):
    if not getattr(target, "workspace_id", None) and getattr(target, "organization_id", None):
        from sqlalchemy import select, insert
        result = connection.execute(
            select(SchedulingWorkspace.id).where(SchedulingWorkspace.organization_id == target.organization_id).limit(1)
        ).scalar()
        if not result:
            ws_id = uuid.uuid4()
            connection.execute(
                insert(SchedulingWorkspace).values(
                    id=ws_id,
                    organization_id=target.organization_id,
                    name="Default Workspace",
                    domain_preset="academic",
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
            )
            target.workspace_id = ws_id
        else:
            target.workspace_id = result
