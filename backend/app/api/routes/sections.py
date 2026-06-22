import uuid
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.schemas.section import Section as SectionSchema, SectionCreate, SectionUpdate
from app.models.section import Section as SectionModel
from app.core.db import get_db
from app.core.auth import get_current_user_profile, require_org_admin
from app.models.profile import Profile
from app.services.audit_service import AuditService

router = APIRouter()

@router.post("/", response_model=SectionSchema, status_code=201)
def create_section(
    payload: SectionCreate,
    current_user: Profile = Depends(require_org_admin),
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
    
    AuditService.log_action(
        db=db,
        org_id=current_user.organization_id,
        actor_id=current_user.id,
        action="section.create",
        target_table="sections",
        target_id=section.id,
        diff={"new_values": {"name": section.name, "size": section.size}}
    )
    
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
    current_user: Profile = Depends(require_org_admin),
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
        
    old_values = {
        "name": section.name,
        "size": section.size
    }
    
    mutated = False
    if payload.name is not None:
        section.name = payload.name
        mutated = True
    if payload.size is not None:
        section.size = payload.size
        mutated = True
        
    if mutated:
        db.commit()
        db.refresh(section)
        
        AuditService.log_action(
            db=db,
            org_id=current_user.organization_id,
            actor_id=current_user.id,
            action="section.update",
            target_table="sections",
            target_id=section.id,
            diff={
                "old_values": old_values,
                "new_values": {
                    "name": section.name,
                    "size": section.size
                }
            }
        )
    
    return SectionSchema(
        id=str(section.id),
        organization_id=str(section.organization_id),
        name=section.name,
        size=section.size
    )

@router.delete("/{section_id}", status_code=204)
def delete_section(
    section_id: str,
    current_user: Profile = Depends(require_org_admin),
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
        
    old_values = {
        "name": section.name,
        "size": section.size
    }
    section_id_val = section.id
    
    db.delete(section)
    db.commit()
    
    AuditService.log_action(
        db=db,
        org_id=current_user.organization_id,
        actor_id=current_user.id,
        action="section.delete",
        target_table="sections",
        target_id=section_id_val,
        diff={"old_values": old_values}
    )
    return

