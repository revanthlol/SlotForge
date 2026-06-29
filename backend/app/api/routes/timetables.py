import uuid
import math
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.schemas.timetable import TimetableGenerateRequest, TimetableResponse, TimetableSlotCreate, TimetableSlotResponse, TimetableSlotUpdate, TimetableVersionResponse
from app.services.timetable_service import TimetableService
from app.services.versioning_service import VersioningService
from app.services.audit_service import AuditService
from app.core.db import get_db
from app.core.auth import get_current_user_profile, require_org_admin
from app.models.profile import Profile
from app.models.organization import Organization as OrganizationModel
from app.models.room import Room as RoomModel
from app.models.section import Section as SectionModel
from app.models.subject import Subject as SubjectModel
from app.models.teacher import Teacher as TeacherModel
from app.models.timetable_slot import TimetableSlot as SlotModel
from app.models.timetable_version import TimetableVersion as VersionModel

router = APIRouter()


def _parse_uuid(value: str, label: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid {label}")


def _require_draft_version(db: Session, version_id: uuid.UUID, org_id: uuid.UUID) -> VersionModel:
    version = db.query(VersionModel).filter(
        VersionModel.id == version_id,
        VersionModel.organization_id == org_id,
    ).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    if version.status != "draft":
        raise HTTPException(status_code=409, detail="Only draft timetable versions can be edited")
    return version


def _require_org_row(db: Session, model, row_id: uuid.UUID, org_id: uuid.UUID, label: str):
    row = db.query(model).filter(model.id == row_id, model.organization_id == org_id).first()
    if not row:
        raise HTTPException(status_code=404, detail=f"{label} not found")
    return row


def _validate_slot_span(db: Session, org_id: uuid.UUID, day: str, period: int, duration_periods: int) -> None:
    if duration_periods not in (1, 2):
        raise HTTPException(status_code=422, detail="duration_periods must be 1 or 2")
    org = db.query(OrganizationModel).filter(OrganizationModel.id == org_id).first()
    max_period = org.periods_per_day if org else 6
    if period < 1 or period + duration_periods - 1 > max_period:
        raise HTTPException(status_code=422, detail="Slot duration exceeds configured periods")


def _validate_no_conflict(
    db: Session,
    version_id: uuid.UUID,
    section_id: uuid.UUID,
    teacher_id: uuid.UUID,
    room_id: uuid.UUID,
    day: str,
    period: int,
    duration_periods: int,
    exclude_slot_id: uuid.UUID | None = None,
) -> None:
    target_start = period
    target_end = period + duration_periods
    query = db.query(SlotModel).filter(
        SlotModel.timetable_version_id == version_id,
        SlotModel.day == day,
    )
    if exclude_slot_id:
        query = query.filter(SlotModel.id != exclude_slot_id)

    for existing in query.all():
        existing_start = existing.period
        existing_end = existing.period + existing.duration_periods
        overlaps = existing_start < target_end and target_start < existing_end
        if not overlaps:
            continue
        if existing.section_id == section_id:
            raise HTTPException(status_code=409, detail="Section already has a class in this period")
        if existing.teacher_id == teacher_id:
            raise HTTPException(status_code=409, detail="Teacher already has a class in this period")
        if existing.room_id == room_id:
            raise HTTPException(status_code=409, detail="Room already has a class in this period")


def _validate_subject_daily_limit(
    db: Session,
    version_id: uuid.UUID,
    org_id: uuid.UUID,
    section_id: uuid.UUID,
    subject_id: uuid.UUID,
    day: str,
    exclude_slot_id: uuid.UUID | None = None,
) -> None:
    org = db.query(OrganizationModel).filter(OrganizationModel.id == org_id).first()
    subject = db.query(SubjectModel).filter(
        SubjectModel.id == subject_id,
        SubjectModel.organization_id == org_id,
    ).first()
    if not org or not subject:
        return

    cycle_length = org.cycle_length or 5
    session_length = subject.session_length or 1
    required_sessions = math.ceil(subject.weekly_hours / session_length)
    max_sessions_per_day = max(1, math.ceil(required_sessions / cycle_length))

    query = db.query(SlotModel).filter(
        SlotModel.timetable_version_id == version_id,
        SlotModel.organization_id == org_id,
        SlotModel.section_id == section_id,
        SlotModel.subject_id == subject_id,
        SlotModel.day == day,
    )
    if exclude_slot_id:
        query = query.filter(SlotModel.id != exclude_slot_id)

    if query.count() + 1 > max_sessions_per_day:
        raise HTTPException(
            status_code=409,
            detail="Subject already has the maximum allowed sessions for this section on this day",
        )

@router.post("/generate", response_model=TimetableResponse)
def generate_timetable(
    payload: TimetableGenerateRequest,
    current_user: Profile = Depends(require_org_admin),
    db: Session = Depends(get_db)
):
    try:
        org_uuid = uuid.UUID(payload.organization_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid organization_id format")
        
    if org_uuid != current_user.organization_id:
        raise HTTPException(status_code=403, detail="Forbidden: You can only generate timetables for your own organization")
        
    result = TimetableService.generate_timetable(org_uuid, current_user.id, db)
    if not result:
        raise HTTPException(status_code=400, detail="Invalid organization_id or organization not found")
        
    if result.get("id") and not result.get("infeasible_reason"):
        AuditService.log_action(
            db=db,
            org_id=org_uuid,
            actor_id=current_user.id,
            action="timetable.generate",
            target_table="timetable_versions",
            target_id=uuid.UUID(result["id"]),
            diff={"scores": result["scores"]}
        )
        
    return result

@router.get("/versions", response_model=list[TimetableVersionResponse])
def list_versions(
    current_user: Profile = Depends(get_current_user_profile),
    db: Session = Depends(get_db)
):
    versions = VersioningService.list_versions(db, current_user.organization_id)
    return [
        TimetableVersionResponse(
            id=str(v.id),
            organization_id=str(v.organization_id),
            version_number=v.version_number,
            status=v.status,
            scores=v.scores,
            created_by=str(v.created_by) if v.created_by else None,
            created_at=v.created_at
        ) for v in versions
    ]

@router.post("/{version_id}/publish", response_model=TimetableVersionResponse)
def publish_version(
    version_id: str,
    current_user: Profile = Depends(require_org_admin),
    db: Session = Depends(get_db)
):
    try:
        v_uuid = uuid.UUID(version_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Version not found")
        
    version = VersioningService.publish_version(db, v_uuid, current_user.organization_id, current_user.id)
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
        
    return TimetableVersionResponse(
        id=str(version.id),
        organization_id=str(version.organization_id),
        version_number=version.version_number,
        status=version.status,
        scores=version.scores,
        created_by=str(version.created_by) if version.created_by else None,
        created_at=version.created_at
    )

@router.post("/{version_id}/rollback", response_model=TimetableVersionResponse)
def rollback_version(
    version_id: str,
    current_user: Profile = Depends(require_org_admin),
    db: Session = Depends(get_db)
):
    try:
        v_uuid = uuid.UUID(version_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Version not found")
        
    version = VersioningService.rollback_version(db, v_uuid, current_user.organization_id, current_user.id)
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
        
    return TimetableVersionResponse(
        id=str(version.id),
        organization_id=str(version.organization_id),
        version_number=version.version_number,
        status=version.status,
        scores=version.scores,
        created_by=str(version.created_by) if version.created_by else None,
        created_at=version.created_at
    )

@router.post("/{version_id}/slots", response_model=TimetableSlotResponse, status_code=201)
def create_timetable_slot(
    version_id: str,
    payload: TimetableSlotCreate,
    current_user: Profile = Depends(require_org_admin),
    db: Session = Depends(get_db),
):
    version_uuid = _parse_uuid(version_id, "version_id")
    _require_draft_version(db, version_uuid, current_user.organization_id)

    section_uuid = _parse_uuid(payload.section_id, "section_id")
    subject_uuid = _parse_uuid(payload.subject_id, "subject_id")
    teacher_uuid = _parse_uuid(payload.teacher_id, "teacher_id")
    room_uuid = _parse_uuid(payload.room_id, "room_id")

    _require_org_row(db, SectionModel, section_uuid, current_user.organization_id, "Section")
    _require_org_row(db, SubjectModel, subject_uuid, current_user.organization_id, "Subject")
    _require_org_row(db, TeacherModel, teacher_uuid, current_user.organization_id, "Teacher")
    _require_org_row(db, RoomModel, room_uuid, current_user.organization_id, "Room")
    _validate_slot_span(db, current_user.organization_id, payload.day, payload.period, payload.duration_periods)
    _validate_no_conflict(
        db,
        version_uuid,
        section_uuid,
        teacher_uuid,
        room_uuid,
        payload.day,
        payload.period,
        payload.duration_periods,
    )
    _validate_subject_daily_limit(
        db,
        version_uuid,
        current_user.organization_id,
        section_uuid,
        subject_uuid,
        payload.day,
    )

    slot = SlotModel(
        organization_id=current_user.organization_id,
        timetable_version_id=version_uuid,
        section_id=section_uuid,
        subject_id=subject_uuid,
        teacher_id=teacher_uuid,
        room_id=room_uuid,
        day=payload.day,
        period=payload.period,
        duration_periods=payload.duration_periods,
    )
    db.add(slot)
    db.commit()
    db.refresh(slot)
    return TimetableService._slot_schema(slot)


@router.patch("/{version_id}/slots/{slot_id}", response_model=TimetableSlotResponse)
def update_timetable_slot(
    version_id: str,
    slot_id: str,
    payload: TimetableSlotUpdate,
    current_user: Profile = Depends(require_org_admin),
    db: Session = Depends(get_db),
):
    version_uuid = _parse_uuid(version_id, "version_id")
    slot_uuid = _parse_uuid(slot_id, "slot_id")
    _require_draft_version(db, version_uuid, current_user.organization_id)

    slot = db.query(SlotModel).filter(
        SlotModel.id == slot_uuid,
        SlotModel.timetable_version_id == version_uuid,
        SlotModel.organization_id == current_user.organization_id,
    ).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")

    section_uuid = _parse_uuid(payload.section_id, "section_id") if payload.section_id else slot.section_id
    subject_uuid = _parse_uuid(payload.subject_id, "subject_id") if payload.subject_id else slot.subject_id
    teacher_uuid = _parse_uuid(payload.teacher_id, "teacher_id") if payload.teacher_id else slot.teacher_id
    room_uuid = _parse_uuid(payload.room_id, "room_id") if payload.room_id else slot.room_id
    day = payload.day if payload.day is not None else slot.day
    period = payload.period if payload.period is not None else slot.period
    duration_periods = payload.duration_periods if payload.duration_periods is not None else slot.duration_periods

    _require_org_row(db, SectionModel, section_uuid, current_user.organization_id, "Section")
    _require_org_row(db, SubjectModel, subject_uuid, current_user.organization_id, "Subject")
    _require_org_row(db, TeacherModel, teacher_uuid, current_user.organization_id, "Teacher")
    _require_org_row(db, RoomModel, room_uuid, current_user.organization_id, "Room")
    _validate_slot_span(db, current_user.organization_id, day, period, duration_periods)
    _validate_no_conflict(
        db,
        version_uuid,
        section_uuid,
        teacher_uuid,
        room_uuid,
        day,
        period,
        duration_periods,
        exclude_slot_id=slot_uuid,
    )
    _validate_subject_daily_limit(
        db,
        version_uuid,
        current_user.organization_id,
        section_uuid,
        subject_uuid,
        day,
        exclude_slot_id=slot_uuid,
    )

    slot.section_id = section_uuid
    slot.subject_id = subject_uuid
    slot.teacher_id = teacher_uuid
    slot.room_id = room_uuid
    slot.day = day
    slot.period = period
    slot.duration_periods = duration_periods
    db.commit()
    db.refresh(slot)
    return TimetableService._slot_schema(slot)


@router.delete("/{version_id}/slots/{slot_id}", status_code=204)
def delete_timetable_slot(
    version_id: str,
    slot_id: str,
    current_user: Profile = Depends(require_org_admin),
    db: Session = Depends(get_db),
):
    version_uuid = _parse_uuid(version_id, "version_id")
    slot_uuid = _parse_uuid(slot_id, "slot_id")
    _require_draft_version(db, version_uuid, current_user.organization_id)

    slot = db.query(SlotModel).filter(
        SlotModel.id == slot_uuid,
        SlotModel.timetable_version_id == version_uuid,
        SlotModel.organization_id == current_user.organization_id,
    ).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    db.delete(slot)
    db.commit()
    return

@router.get("/{timetable_id}", response_model=TimetableResponse)
def get_timetable(
    timetable_id: str,
    current_user: Profile = Depends(get_current_user_profile),
    db: Session = Depends(get_db)
):
    try:
        t_uuid = uuid.UUID(timetable_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Timetable not found")
        
    result = TimetableService.get_timetable(t_uuid, current_user.organization_id, db)
    if not result:
        raise HTTPException(status_code=404, detail="Timetable not found")
        
    return result
