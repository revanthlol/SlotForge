import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import get_current_user_profile, require_org_admin
from app.core.db import get_db
from app.models.assignment import SectionSubjectTeacherAssignment as SectionSubjectTeacherAssignmentModel
from app.models.assignment import TeacherSubjectAssignment as TeacherSubjectAssignmentModel
from app.models.profile import Profile
from app.models.section import Section as SectionModel
from app.models.subject import Subject as SubjectModel
from app.models.teacher import Teacher as TeacherModel
from app.schemas.assignment import (
    SectionSubjectTeacherAssignment,
    SectionSubjectTeacherBulkUpdate,
    TeacherSubjectAssignment,
    TeacherSubjectReplace,
)
from app.services.assignment_sync_service import AssignmentSyncService

router = APIRouter()


def _parse_uuid(value: str, label: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid {label}")


def _require_org_row(db: Session, model, row_id: uuid.UUID, org_id: uuid.UUID, label: str):
    row = db.query(model).filter(
        model.id == row_id,
        model.organization_id == org_id,
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail=f"{label} not found")
    return row


def _teacher_subject_schema(row: TeacherSubjectAssignmentModel) -> TeacherSubjectAssignment:
    return TeacherSubjectAssignment(
        id=str(row.id),
        organization_id=str(row.organization_id),
        teacher_id=str(row.teacher_id),
        subject_id=str(row.subject_id),
    )


def _section_teacher_schema(row: SectionSubjectTeacherAssignmentModel) -> SectionSubjectTeacherAssignment:
    return SectionSubjectTeacherAssignment(
        id=str(row.id),
        organization_id=str(row.organization_id),
        section_id=str(row.section_id),
        subject_id=str(row.subject_id),
        teacher_id=str(row.teacher_id) if row.teacher_id else None,
    )


@router.get("/teacher-subjects", response_model=list[TeacherSubjectAssignment])
def list_teacher_subject_assignments(
    current_user: Profile = Depends(get_current_user_profile),
    db: Session = Depends(get_db),
):
    rows = db.query(TeacherSubjectAssignmentModel).filter(
        TeacherSubjectAssignmentModel.organization_id == current_user.organization_id
    ).all()
    return [_teacher_subject_schema(row) for row in rows]


@router.put("/teacher-subjects/{teacher_id}", response_model=list[TeacherSubjectAssignment])
def replace_teacher_subject_assignments(
    teacher_id: str,
    payload: TeacherSubjectReplace,
    current_user: Profile = Depends(require_org_admin),
    db: Session = Depends(get_db),
):
    teacher_uuid = _parse_uuid(teacher_id, "teacher_id")
    subject_uuids = [_parse_uuid(subject_id, "subject_id") for subject_id in payload.subject_ids]

    _require_org_row(db, TeacherModel, teacher_uuid, current_user.organization_id, "Teacher")
    for subject_uuid in subject_uuids:
        _require_org_row(db, SubjectModel, subject_uuid, current_user.organization_id, "Subject")

    db.query(TeacherSubjectAssignmentModel).filter(
        TeacherSubjectAssignmentModel.organization_id == current_user.organization_id,
        TeacherSubjectAssignmentModel.teacher_id == teacher_uuid,
    ).delete(synchronize_session=False)

    for subject_uuid in sorted(set(subject_uuids), key=str):
        db.add(TeacherSubjectAssignmentModel(
            organization_id=current_user.organization_id,
            teacher_id=teacher_uuid,
            subject_id=subject_uuid,
        ))

    AssignmentSyncService.regenerate_assignment_constraints(db, current_user.organization_id)
    db.commit()

    rows = db.query(TeacherSubjectAssignmentModel).filter(
        TeacherSubjectAssignmentModel.organization_id == current_user.organization_id,
        TeacherSubjectAssignmentModel.teacher_id == teacher_uuid,
    ).all()
    return [_teacher_subject_schema(row) for row in rows]


@router.get("/section-subject-teachers", response_model=list[SectionSubjectTeacherAssignment])
def list_section_subject_teacher_assignments(
    current_user: Profile = Depends(get_current_user_profile),
    db: Session = Depends(get_db),
):
    rows = db.query(SectionSubjectTeacherAssignmentModel).filter(
        SectionSubjectTeacherAssignmentModel.organization_id == current_user.organization_id
    ).all()
    return [_section_teacher_schema(row) for row in rows]


@router.put("/section-subject-teachers", response_model=list[SectionSubjectTeacherAssignment])
def bulk_update_section_subject_teacher_assignments(
    payload: SectionSubjectTeacherBulkUpdate,
    current_user: Profile = Depends(require_org_admin),
    db: Session = Depends(get_db),
):
    for item in payload.assignments:
        section_uuid = _parse_uuid(item.section_id, "section_id")
        subject_uuid = _parse_uuid(item.subject_id, "subject_id")
        teacher_uuid = _parse_uuid(item.teacher_id, "teacher_id") if item.teacher_id else None

        _require_org_row(db, SectionModel, section_uuid, current_user.organization_id, "Section")
        _require_org_row(db, SubjectModel, subject_uuid, current_user.organization_id, "Subject")
        if teacher_uuid:
            _require_org_row(db, TeacherModel, teacher_uuid, current_user.organization_id, "Teacher")

        existing = db.query(SectionSubjectTeacherAssignmentModel).filter(
            SectionSubjectTeacherAssignmentModel.organization_id == current_user.organization_id,
            SectionSubjectTeacherAssignmentModel.section_id == section_uuid,
            SectionSubjectTeacherAssignmentModel.subject_id == subject_uuid,
        ).first()

        if not item.enabled:
            if existing:
                db.delete(existing)
            continue

        if existing:
            existing.teacher_id = teacher_uuid
        else:
            db.add(SectionSubjectTeacherAssignmentModel(
                organization_id=current_user.organization_id,
                section_id=section_uuid,
                subject_id=subject_uuid,
                teacher_id=teacher_uuid,
            ))

        if teacher_uuid:
            qualified = db.query(TeacherSubjectAssignmentModel).filter(
                TeacherSubjectAssignmentModel.organization_id == current_user.organization_id,
                TeacherSubjectAssignmentModel.teacher_id == teacher_uuid,
                TeacherSubjectAssignmentModel.subject_id == subject_uuid,
            ).first()
            if not qualified:
                db.add(TeacherSubjectAssignmentModel(
                    organization_id=current_user.organization_id,
                    teacher_id=teacher_uuid,
                    subject_id=subject_uuid,
                ))

    AssignmentSyncService.regenerate_assignment_constraints(db, current_user.organization_id)
    db.commit()

    rows = db.query(SectionSubjectTeacherAssignmentModel).filter(
        SectionSubjectTeacherAssignmentModel.organization_id == current_user.organization_id
    ).all()
    return [_section_teacher_schema(row) for row in rows]
