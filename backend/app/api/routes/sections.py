import uuid
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.schemas.section import Section as SectionSchema, SectionCreate, SectionUpdate
from app.models.section import Section as SectionModel
from app.core.db import get_db
from app.core.auth import get_current_user_profile
from app.models.profile import Profile

router = APIRouter()

@router.post("/", response_model=SectionSchema, status_code=201)
def create_section(
    payload: SectionCreate,
    current_user: Profile = Depends(get_current_user_profile),
    db: Session = Depends(get_db)
):
    section = SectionModel(
        organization_id=current_user.organization_id,
        name=payload.name,
        size=payload.size
    )
    db.add(section)
    db.commit()
    db.refresh(section)
    
    return SectionSchema(
        id=str(section.id),
        organization_id=str(section.organization_id),
        name=section.name,
        size=section.size
    )

@router.get("/", response_model=list[SectionSchema])
def list_sections(
    current_user: Profile = Depends(get_current_user_profile),
    db: Session = Depends(get_db)
):
    sections = db.query(SectionModel).filter(
        SectionModel.organization_id == current_user.organization_id
    ).all()
    return [
        SectionSchema(
            id=str(s.id),
            organization_id=str(s.organization_id),
            name=s.name,
            size=s.size
        ) for s in sections
    ]

@router.get("/{section_id}", response_model=SectionSchema)
def get_section(
    section_id: str,
    current_user: Profile = Depends(get_current_user_profile),
    db: Session = Depends(get_db)
):
    try:
        s_uuid = uuid.UUID(section_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Section not found")
        
    section = db.query(SectionModel).filter(
        SectionModel.id == s_uuid,
        SectionModel.organization_id == current_user.organization_id
    ).first()
    
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
        
    return SectionSchema(
        id=str(section.id),
        organization_id=str(section.organization_id),
        name=section.name,
        size=section.size
    )

@router.put("/{section_id}", response_model=SectionSchema)
def update_section(
    section_id: str,
    payload: SectionUpdate,
    current_user: Profile = Depends(get_current_user_profile),
    db: Session = Depends(get_db)
):
    try:
        s_uuid = uuid.UUID(section_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Section not found")
        
    section = db.query(SectionModel).filter(
        SectionModel.id == s_uuid,
        SectionModel.organization_id == current_user.organization_id
    ).first()
    
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
        
    if payload.name is not None:
        section.name = payload.name
    if payload.size is not None:
        section.size = payload.size
        
    db.commit()
    db.refresh(section)
    
    return SectionSchema(
        id=str(section.id),
        organization_id=str(section.organization_id),
        name=section.name,
        size=section.size
    )

@router.delete("/{section_id}", status_code=204)
def delete_section(
    section_id: str,
    current_user: Profile = Depends(get_current_user_profile),
    db: Session = Depends(get_db)
):
    try:
        s_uuid = uuid.UUID(section_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Section not found")
        
    section = db.query(SectionModel).filter(
        SectionModel.id == s_uuid,
        SectionModel.organization_id == current_user.organization_id
    ).first()
    
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
        
    db.delete(section)
    db.commit()
    return
