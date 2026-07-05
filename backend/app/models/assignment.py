import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import ForeignKey, DateTime, Boolean, Integer, String, select, insert, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, synonym
from sqlalchemy import event
from app.core.db import Base
from app.models.workspace import auto_populate_workspace_id_listener

class Assignment(Base):
    __tablename__ = "assignments"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("scheduling_workspaces.id", ondelete="CASCADE"), nullable=False)
    schedule_version_id: Mapped[uuid.UUID] = mapped_column("schedule_version_id", ForeignKey("schedule_versions.id", ondelete="CASCADE"), nullable=False)
    timetable_version_id = synonym("schedule_version_id")
    task_id: Mapped[uuid.UUID] = mapped_column("task_id", ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    subject_id = synonym("task_id")
    group_id: Mapped[Optional[uuid.UUID]] = mapped_column("group_id", ForeignKey("groups.id", ondelete="CASCADE"), nullable=True)
    section_id = synonym("group_id")
    timeslot_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("timeslots.id", ondelete="CASCADE"), nullable=True)
    duration_slots: Mapped[int] = mapped_column("duration_slots", Integer, default=1, server_default="1", nullable=False)
    duration_periods = synonym("duration_slots")
    is_manual_override: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)
    assignment_metadata: Mapped[dict] = mapped_column("metadata", JSONB, default=dict, server_default='{}', nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Legacy fields for backward compatibility
    day: Mapped[str] = mapped_column(String, nullable=False)
    period: Mapped[int] = mapped_column(Integer, nullable=False)
    teacher_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("resources.id", ondelete="CASCADE"), nullable=False)
    room_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("locations.id", ondelete="CASCADE"), nullable=False)


class AssignmentResource(Base):
    __tablename__ = "assignment_resources"

    assignment_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("assignments.id", ondelete="CASCADE"), primary_key=True)
    resource_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("resources.id", ondelete="CASCADE"), primary_key=True)


class AssignmentLocation(Base):
    __tablename__ = "assignment_locations"

    assignment_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("assignments.id", ondelete="CASCADE"), primary_key=True)
    location_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("locations.id", ondelete="CASCADE"), primary_key=True)
    student_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    sub_group: Mapped[Optional[str]] = mapped_column(String, nullable=True)


event.listen(Assignment, "before_insert", auto_populate_workspace_id_listener, propagate=True)

@event.listens_for(Assignment, "before_insert", propagate=True)
def auto_populate_timeslot_id(mapper, connection, target):
    if not getattr(target, "timeslot_id", None) and getattr(target, "day", None) and getattr(target, "period", None):
        from app.models.timeslot import TimeSlot
        result = connection.execute(
            select(TimeSlot.id).where(
                TimeSlot.workspace_id == target.workspace_id,
                TimeSlot.day == target.day,
                TimeSlot.slot_index == target.period
            ).limit(1)
        ).scalar()
        if result:
            target.timeslot_id = result

@event.listens_for(Assignment, "after_insert", propagate=True)
def sync_join_tables_insert(mapper, connection, target):
    if getattr(target, "teacher_id", None):
        exists = connection.execute(
            select(1).where(
                AssignmentResource.assignment_id == target.id,
                AssignmentResource.resource_id == target.teacher_id
            ).limit(1)
        ).scalar()
        if not exists:
            connection.execute(
                insert(AssignmentResource).values(
                    assignment_id=target.id,
                    resource_id=target.teacher_id
                )
            )
    if getattr(target, "room_id", None):
        exists = connection.execute(
            select(1).where(
                AssignmentLocation.assignment_id == target.id,
                AssignmentLocation.location_id == target.room_id
            ).limit(1)
        ).scalar()
        if not exists:
            connection.execute(
                insert(AssignmentLocation).values(
                    assignment_id=target.id,
                    location_id=target.room_id
                )
            )


class TeacherSubjectAssignment(Base):
    __tablename__ = "teacher_subject_assignments"
    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "teacher_id",
            "subject_id",
            name="uq_teacher_subject_assignment_org_teacher_subject",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("scheduling_workspaces.id", ondelete="CASCADE"), nullable=False)
    teacher_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("resources.id", ondelete="CASCADE"), nullable=True)
    subject_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)


class SectionSubjectTeacherAssignment(Base):
    __tablename__ = "section_subject_teacher_assignments"
    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "section_id",
            "subject_id",
            name="uq_section_subject_teacher_assignment_org_section_subject",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("scheduling_workspaces.id", ondelete="CASCADE"), nullable=False)
    section_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    subject_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    teacher_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("resources.id", ondelete="CASCADE"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

event.listen(TeacherSubjectAssignment, "before_insert", auto_populate_workspace_id_listener)
event.listen(SectionSubjectTeacherAssignment, "before_insert", auto_populate_workspace_id_listener)
