import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.assignment import Assignment, AssignmentLocation
from app.models.schedule_run import ScheduleRun
from app.models.schedule_version import ScheduleVersion
from app.services.audit_service import AuditService


class Phase9VersioningService:
    @staticmethod
    def resolve_version(db: Session, workspace_id: uuid.UUID, source_id: uuid.UUID) -> Optional[ScheduleVersion]:
        run = db.query(ScheduleRun).filter(ScheduleRun.id == source_id, ScheduleRun.workspace_id == workspace_id).first()
        if run and run.schedule_version_id:
            return db.query(ScheduleVersion).filter(ScheduleVersion.id == run.schedule_version_id, ScheduleVersion.workspace_id == workspace_id).first()
        return db.query(ScheduleVersion).filter(ScheduleVersion.id == source_id, ScheduleVersion.workspace_id == workspace_id).first()

    @staticmethod
    def branch(db: Session, source: ScheduleVersion, actor_id: uuid.UUID, branch_name: str, rollback: bool = False) -> tuple[ScheduleVersion, ScheduleRun]:
        max_number = db.query(func.max(ScheduleVersion.version_number)).filter(ScheduleVersion.workspace_id == source.workspace_id).scalar() or 0
        version_number = max_number + 1
        label = f"v{version_number}"
        version = ScheduleVersion(
            organization_id=source.organization_id,
            workspace_id=source.workspace_id,
            version_label=label,
            version_number=version_number,
            status="draft",
            scores=dict(source.scores or {}),
            explanation=dict(source.explanation or {}) if source.explanation else None,
            parent_version_id=source.id,
            branch_name=(f"Rollback: {branch_name}" if rollback else branch_name),
            is_manual_override=True,
            created_by=actor_id,
        )
        db.add(version)
        db.flush()
        source_assignments = db.query(Assignment).filter(Assignment.schedule_version_id == source.id).all()
        for source_assignment in source_assignments:
            copied = Assignment(
                organization_id=source_assignment.organization_id,
                workspace_id=source_assignment.workspace_id,
                schedule_version_id=version.id,
                task_id=source_assignment.task_id,
                group_id=source_assignment.group_id,
                timeslot_id=source_assignment.timeslot_id,
                duration_slots=source_assignment.duration_slots,
                is_manual_override=True,
                assignment_metadata=dict(source_assignment.assignment_metadata or {}),
                day=source_assignment.day,
                period=source_assignment.period,
                teacher_id=source_assignment.teacher_id,
                room_id=source_assignment.room_id,
            )
            db.add(copied)
            db.flush()
            locations = db.query(AssignmentLocation).filter(AssignmentLocation.assignment_id == source_assignment.id).all()
            for location in locations:
                db.add(AssignmentLocation(
                    assignment_id=copied.id,
                    location_id=location.location_id,
                    student_count=location.student_count,
                    sub_group=location.sub_group,
                    capacity_contribution=location.capacity_contribution,
                ))
        run = ScheduleRun(
            organization_id=source.organization_id,
            workspace_id=source.workspace_id,
            schedule_version_id=version.id,
            status="success",
            solver_score=dict(source.scores or {}),
            explanation={"branch_name": version.branch_name, "parent_version_id": str(source.id)},
        )
        db.add(run)
        db.flush()
        AuditService.log_action(db, source.organization_id, actor_id, "timetable.branch", "schedule_versions", version.id, {"parent_version_id": str(source.id), "branch_name": version.branch_name})
        db.commit()
        db.refresh(version)
        db.refresh(run)
        return version, run

    @staticmethod
    def publish(db: Session, target: ScheduleVersion, actor_id: uuid.UUID) -> ScheduleVersion:
        now = datetime.utcnow()
        db.query(ScheduleVersion).filter(
            ScheduleVersion.workspace_id == target.workspace_id,
            ScheduleVersion.status == "published",
            ScheduleVersion.id != target.id,
        ).update({"status": "archived", "archived_at": now}, synchronize_session=False)
        target.status = "published"
        target.published_at = now
        target.archived_at = None
        db.commit()
        db.refresh(target)
        AuditService.log_action(db, target.organization_id, actor_id, "timetable.publish", "schedule_versions", target.id, {"status": "published"})
        return target

    @staticmethod
    def archive(db: Session, target: ScheduleVersion, actor_id: uuid.UUID) -> ScheduleVersion:
        if target.status == "published":
            raise ValueError("Published versions must be replaced by publishing another version")
        target.status = "archived"
        target.archived_at = datetime.utcnow()
        db.commit()
        db.refresh(target)
        AuditService.log_action(db, target.organization_id, actor_id, "timetable.archive", "schedule_versions", target.id, {"status": "archived"})
        return target
