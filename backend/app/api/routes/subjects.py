import uuid
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.schemas.subject import Subject as SubjectSchema, SubjectCreate, SubjectUpdate
from app.models.subject import Subject as SubjectModel
from app.core.db import get_db
from app.core.auth import get_current_user_profile, require_org_admin
from app.models.profile import Profile
from app.services.audit_service import AuditService

router = APIRouter()

def _validate_session_length(weekly_hours: int, session_length: int) -> None:
    if session_length not in (1, 2):
        raise HTTPException(status_code=422, detail="session_length must be 1 or 2")
    if weekly_hours % session_length != 0:
        raise HTTPException(status_code=422, detail="weekly_hours must be divisible by session_length")

def _subject_schema(subject: SubjectModel) -> SubjectSchema:
    return SubjectSchema(
        id=str(subject.id),
        organization_id=str(subject.organization_id),
        name=subject.name,
        weekly_hours=subject.weekly_hours,
        session_length=subject.session_length,
    )

@router.post("/", response_model=SubjectSchema, status_code=201)
def create_subject(
    payload: SubjectCreate,
    current_user: Profile = Depends(require_org_admin),
    db: Session = Depends(get_db)
):
    _validate_session_length(payload.weekly_hours, payload.session_length)
    subject = SubjectModel(
        organization_id=current_user.organization_id,
        name=payload.name,
        weekly_hours=payload.weekly_hours,
        session_length=payload.session_length,
    )
    db.add(subject)
    db.commit()
    db.refresh(subject)
    
    AuditService.log_action(
        db=db,
        org_id=current_user.organization_id,
        actor_id=current_user.id,
        action="subject.create",
        target_table="subjects",
        target_id=subject.id,
        diff={"new_values": {"name": subject.name, "weekly_hours": subject.weekly_hours, "session_length": subject.session_length}}
    )
    
    return _subject_schema(subject)

@router.get("/", response_model=list[SubjectSchema])
def list_subjects(
    current_user: Profile = Depends(get_current_user_profile),
    db: Session = Depends(get_db)
):
    subjects = db.query(SubjectModel).filter(
        SubjectModel.organization_id == current_user.organization_id
    ).all()
    return [_subject_schema(s) for s in subjects]

@router.get("/{subject_id}", response_model=SubjectSchema)
def get_subject(
    subject_id: str,
    current_user: Profile = Depends(get_current_user_profile),
    db: Session = Depends(get_db)
):
    try:
        s_uuid = uuid.UUID(subject_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Subject not found")
        
    subject = db.query(SubjectModel).filter(
        SubjectModel.id == s_uuid,
        SubjectModel.organization_id == current_user.organization_id
    ).first()
    
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
        
    return _subject_schema(subject)

@router.put("/{subject_id}", response_model=SubjectSchema)
def update_subject(
    subject_id: str,
    payload: SubjectUpdate,
    current_user: Profile = Depends(require_org_admin),
    db: Session = Depends(get_db)
):
    try:
        s_uuid = uuid.UUID(subject_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Subject not found")
        
    subject = db.query(SubjectModel).filter(
        SubjectModel.id == s_uuid,
        SubjectModel.organization_id == current_user.organization_id
    ).first()
    
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
        
    old_values = {
        "name": subject.name,
        "weekly_hours": subject.weekly_hours,
        "session_length": subject.session_length,
    }
    next_weekly_hours = payload.weekly_hours if payload.weekly_hours is not None else subject.weekly_hours
    next_session_length = payload.session_length if payload.session_length is not None else subject.session_length
    _validate_session_length(next_weekly_hours, next_session_length)
    
    mutated = False
    if payload.name is not None:
        subject.name = payload.name
        mutated = True
    if payload.weekly_hours is not None:
        subject.weekly_hours = payload.weekly_hours
        mutated = True
    if payload.session_length is not None:
        subject.session_length = payload.session_length
        mutated = True
        
    if mutated:
        db.commit()
        db.refresh(subject)
        
        AuditService.log_action(
            db=db,
            org_id=current_user.organization_id,
            actor_id=current_user.id,
            action="subject.update",
            target_table="subjects",
            target_id=subject.id,
            diff={
                "old_values": old_values,
                "new_values": {
                    "name": subject.name,
                    "weekly_hours": subject.weekly_hours,
                    "session_length": subject.session_length,
                }
            }
        )
    
    return _subject_schema(subject)

@router.delete("/{subject_id}", status_code=204)
def delete_subject(
    subject_id: str,
    current_user: Profile = Depends(require_org_admin),
    db: Session = Depends(get_db)
):
    try:
        s_uuid = uuid.UUID(subject_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Subject not found")
        
    subject = db.query(SubjectModel).filter(
        SubjectModel.id == s_uuid,
        SubjectModel.organization_id == current_user.organization_id
    ).first()
    
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
        
    old_values = {
        "name": subject.name,
        "weekly_hours": subject.weekly_hours,
        "session_length": subject.session_length,
    }
    subject_id_val = subject.id
    
    db.delete(subject)
    db.commit()
    
    AuditService.log_action(
        db=db,
        org_id=current_user.organization_id,
        actor_id=current_user.id,
        action="subject.delete",
        target_table="subjects",
        target_id=subject_id_val,
        diff={"old_values": old_values}
    )
    return
