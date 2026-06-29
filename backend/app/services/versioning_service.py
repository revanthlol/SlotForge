import uuid
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.timetable_version import TimetableVersion as VersionModel
from app.models.timetable_slot import TimetableSlot as SlotModel
from app.services.audit_service import AuditService

class VersioningService:
    @staticmethod
    def list_versions(db: Session, org_id: uuid.UUID) -> List[VersionModel]:
        """
        Lists all timetable versions for the given organization.
        """
        return db.query(VersionModel).filter(
            VersionModel.organization_id == org_id
        ).order_by(VersionModel.version_number.desc()).all()

    @staticmethod
    def publish_version(db: Session, version_id: uuid.UUID, org_id: uuid.UUID, actor_id: Optional[uuid.UUID]) -> Optional[VersionModel]:
        """
        Publishes the specified timetable version. Demotes any currently published
        version for the organization to "archived" within the same transaction.
        """
        # Find target version
        target = db.query(VersionModel).filter(
            VersionModel.id == version_id,
            VersionModel.organization_id == org_id
        ).first()
        if not target:
            return None

        # Demote current published version to archived
        db.query(VersionModel).filter(
            VersionModel.organization_id == org_id,
            VersionModel.status == "published",
            VersionModel.id != version_id
        ).update({"status": "archived"}, synchronize_session=False)

        # Update target version status to published
        target.status = "published"
        db.commit()
        db.refresh(target)

        # Log audit action
        AuditService.log_action(
            db=db,
            org_id=org_id,
            actor_id=actor_id,
            action="timetable.publish",
            target_table="timetable_versions",
            target_id=target.id,
            diff={"status": {"old": "draft", "new": "published"}}  # Note: old could be archived if re-publishing, but draft/archived -> published is fine
        )

        return target

    @staticmethod
    def rollback_version(db: Session, version_id: uuid.UUID, org_id: uuid.UUID, actor_id: Optional[uuid.UUID]) -> Optional[VersionModel]:
        """
        Rolls back to a target version.
        To maintain an append-only history (no mutation of existing version state),
        we create a new timetable version row with an incremented version number,
        copy all slots from the target version to this new version, set the new version's
        status to "published", and demote the currently published version to "archived".
        """
        # Find target version to copy from
        target = db.query(VersionModel).filter(
            VersionModel.id == version_id,
            VersionModel.organization_id == org_id
        ).first()
        if not target:
            return None

        # Get next version number
        max_version = db.query(func.max(VersionModel.version_number)).filter(
            VersionModel.organization_id == org_id
        ).scalar() or 0
        new_version_number = max_version + 1

        # Create new version
        new_version = VersionModel(
            organization_id=org_id,
            version_number=new_version_number,
            status="published",
            scores=target.scores,
            created_by=actor_id
        )
        db.add(new_version)
        db.flush()  # Populate new_version.id

        # Copy slots
        target_slots = db.query(SlotModel).filter(SlotModel.timetable_version_id == target.id).all()
        for ts in target_slots:
            new_slot = SlotModel(
                organization_id=org_id,
                timetable_version_id=new_version.id,
                section_id=ts.section_id,
                subject_id=ts.subject_id,
                teacher_id=ts.teacher_id,
                room_id=ts.room_id,
                day=ts.day,
                period=ts.period,
                duration_periods=ts.duration_periods,
            )
            db.add(new_slot)

        # Demote currently published version(s) to archived
        db.query(VersionModel).filter(
            VersionModel.organization_id == org_id,
            VersionModel.status == "published",
            VersionModel.id != new_version.id
        ).update({"status": "archived"}, synchronize_session=False)

        db.commit()
        db.refresh(new_version)

        # Log audit action
        AuditService.log_action(
            db=db,
            org_id=org_id,
            actor_id=actor_id,
            action="timetable.rollback",
            target_table="timetable_versions",
            target_id=new_version.id,
            diff={"rolled_back_from_version_id": str(target.id), "new_version_number": new_version_number}
        )

        return new_version
