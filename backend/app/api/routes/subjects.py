import uuid
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.schemas.subject import Subject as SubjectSchema, SubjectCreate, SubjectUpdate
from app.models.subject import Subject as SubjectModel
from app.core.db import get_db
from app.core.auth import get_current_user_profile
from app.models.profile import Profile

router = APIRouter()

@router.post("/", response_model=SubjectSchema, status_code=201)
def create_subject(
    payload: SubjectCreate,
    current_user: Profile = Depends(get_current_user_profile),
    db: Session = Depends(get_db)
):
    subject = SubjectModel(
        organization_id=current_user.organization_id,
        name=payload.name,
        weekly_hours=payload.weekly_hours
    )
    db.add(subject)
    db.commit()
    db.refresh(subject)
    
    return SubjectSchema(
        id=str(subject.id),
        organization_id=str(subject.organization_id),
        name=subject.name,
        weekly_hours=subject.weekly_hours
    )

@router.get("/", response_model=list[SubjectSchema])
def list_subjects(
    current_user: Profile = Depends(get_current_user_profile),
    db: Session = Depends(get_db)
):
    subjects = db.query(SubjectModel).filter(
        SubjectModel.organization_id == current_user.organization_id
    ).all()
    return [
        SubjectSchema(
            id=str(s.id),
            organization_id=str(s.organization_id),
            name=s.name,
            weekly_hours=s.weekly_hours
        ) for s in subjects
    ]

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
        
    return SubjectSchema(
        id=str(subject.id),
        organization_id=str(subject.organization_id),
        name=subject.name,
        weekly_hours=subject.weekly_hours
    )

@router.put("/{subject_id}", response_model=SubjectSchema)
def update_subject(
    subject_id: str,
    payload: SubjectUpdate,
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
        
    if payload.name is not None:
        subject.name = payload.name
    if payload.weekly_hours is not None:
        subject.weekly_hours = payload.weekly_hours
        
    db.commit()
    db.refresh(subject)
    
    return SubjectSchema(
        id=str(subject.id),
        organization_id=str(subject.organization_id),
        name=subject.name,
        weekly_hours=subject.weekly_hours
    )

@router.delete("/{subject_id}", status_code=204)
def delete_subject(
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
        
    db.delete(subject)
    db.commit()
    return
