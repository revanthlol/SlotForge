import uuid
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from app.schemas.section import Section as SectionSchema, SectionCreate, SectionUpdate
from app.models.group import Group as GroupModel
from app.models.resource import Resource
from app.models.workspace import SchedulingWorkspace
from app.services.presets import get_preset_types
from app.core.db import get_db
from app.core.auth import get_current_user_profile, require_org_admin
from app.models.profile import Profile
from app.services.audit_service import AuditService

router = APIRouter()

def _get_active_group_type(db: Session, org_id: uuid.UUID) -> str:
    workspace = db.query(SchedulingWorkspace).filter(SchedulingWorkspace.organization_id == org_id).first()
    preset_key = workspace.domain_preset if workspace else "academic"
    return get_preset_types(preset_key)["group_type"]

def _get_active_resource_type(db: Session, org_id: uuid.UUID) -> str:
    workspace = db.query(SchedulingWorkspace).filter(SchedulingWorkspace.organization_id == org_id).first()
    preset_key = workspace.domain_preset if workspace else "academic"
    return get_preset_types(preset_key)["resource_type"]

def _section_schema(section: GroupModel) -> SectionSchema:
    # Use class_teacher_id stored in metadata if present, or fallback
    class_teacher_id = section.group_metadata.get("class_teacher_id") if section.group_metadata else None
    return SectionSchema(
        id=str(section.id),
        organization_id=str(section.organization_id),
        name=section.name,
        size=section.size if section.size is not None else 0,
        class_teacher_id=str(class_teacher_id) if class_teacher_id else None
    )

def _validate_class_teacher(db: Session, teacher_id: str | None, org_id: uuid.UUID) -> uuid.UUID | None:
    if not teacher_id:
        return None
    try:
        teacher_uuid = uuid.UUID(teacher_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid class_teacher_id")
        
    resource_type = _get_active_resource_type(db, org_id)
    teacher = db.query(Resource).filter(
        Resource.id == teacher_uuid,
        Resource.organization_id == org_id,
        Resource.resource_type == resource_type
    ).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Class teacher/resource not found")
    return teacher_uuid

@router.post("/", response_model=SectionSchema, status_code=201)
def create_section(
    payload: SectionCreate,
    current_user: Profile = Depends(require_org_admin),
    db: Session = Depends(get_db)
):
    group_type = _get_active_group_type(db, current_user.organization_id)
    teacher_id = _validate_class_teacher(db, payload.class_teacher_id, current_user.organization_id)
    
    # Store class_teacher_id in group_metadata since Group model doesn't have it as an explicit column
    metadata = {"class_teacher_id": str(teacher_id)} if teacher_id else {}
    
    section = GroupModel(
        organization_id=current_user.organization_id,
        name=payload.name,
        size=payload.size,
        group_type=group_type,
        group_metadata=metadata
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
    
    return _section_schema(section)

@router.get("/", response_model=list[SectionSchema])
def list_sections(
    current_user: Profile = Depends(get_current_user_profile),
    db: Session = Depends(get_db)
):
    group_type = _get_active_group_type(db, current_user.organization_id)
    sections = db.query(GroupModel).filter(
        GroupModel.organization_id == current_user.organization_id,
        GroupModel.group_type == group_type
    ).all()
    return [_section_schema(s) for s in sections]

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
        
    group_type = _get_active_group_type(db, current_user.organization_id)
    section = db.query(GroupModel).filter(
        GroupModel.id == s_uuid,
        GroupModel.organization_id == current_user.organization_id,
        GroupModel.group_type == group_type
    ).first()
    
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
        
    return _section_schema(section)

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
        
    group_type = _get_active_group_type(db, current_user.organization_id)
    section = db.query(GroupModel).filter(
        GroupModel.id == s_uuid,
        GroupModel.organization_id == current_user.organization_id,
        GroupModel.group_type == group_type
    ).first()
    
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
        
    old_class_teacher_id = section.group_metadata.get("class_teacher_id") if section.group_metadata else None
    old_values = {
        "name": section.name,
        "size": section.size,
        "class_teacher_id": str(old_class_teacher_id) if old_class_teacher_id else None
    }
    
    mutated = False
    if payload.name is not None:
        section.name = payload.name
        mutated = True
    if payload.size is not None:
        section.size = payload.size
        mutated = True
    if "class_teacher_id" in payload.model_fields_set:
        teacher_id = _validate_class_teacher(db, payload.class_teacher_id, current_user.organization_id)
        # Make a copy of group_metadata to trigger SQLAlchemy update detection
        meta = dict(section.group_metadata) if section.group_metadata else {}
        if teacher_id:
            meta["class_teacher_id"] = str(teacher_id)
        else:
            meta.pop("class_teacher_id", None)
        section.group_metadata = meta
        mutated = True
        
    if mutated:
        db.commit()
        db.refresh(section)
        
        new_class_teacher_id = section.group_metadata.get("class_teacher_id") if section.group_metadata else None
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
                    "size": section.size,
                    "class_teacher_id": str(new_class_teacher_id) if new_class_teacher_id else None
                }
            }
        )
    
    return _section_schema(section)

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
        
    group_type = _get_active_group_type(db, current_user.organization_id)
    section = db.query(GroupModel).filter(
        GroupModel.id == s_uuid,
        GroupModel.organization_id == current_user.organization_id,
        GroupModel.group_type == group_type
    ).first()
    
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
        
    old_class_teacher_id = section.group_metadata.get("class_teacher_id") if section.group_metadata else None
    old_values = {
        "name": section.name,
        "size": section.size,
        "class_teacher_id": str(old_class_teacher_id) if old_class_teacher_id else None
    }
    section_id_val = section.id
    
    try:
        db.delete(section)
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Section could not be deleted because it is still referenced by other records")
    
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
