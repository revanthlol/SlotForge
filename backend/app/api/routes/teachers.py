import uuid
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from app.schemas.teacher import Teacher as TeacherSchema, TeacherCreate, TeacherUpdate
from app.models.teacher import Teacher as TeacherModel
from app.core.db import get_db
from app.core.auth import get_current_user_profile, require_org_admin
from app.models.profile import Profile
from app.services.audit_service import AuditService

router = APIRouter()

@router.post("/", response_model=TeacherSchema, status_code=201)
def create_teacher(
    payload: TeacherCreate,
    current_user: Profile = Depends(require_org_admin),
    db: Session = Depends(get_db)
):
    teacher = TeacherModel(
        organization_id=current_user.organization_id,
        name=payload.name
    )
    db.add(teacher)
    db.commit()
    db.refresh(teacher)
    
    AuditService.log_action(
        db=db,
        org_id=current_user.organization_id,
        actor_id=current_user.id,
        action="teacher.create",
        target_table="teachers",
        target_id=teacher.id,
        diff={"new_values": {"name": teacher.name}}
    )
    
    # Map model to schema (schema needs organization_id as str)
    return TeacherSchema(
        id=str(teacher.id),
        organization_id=str(teacher.organization_id),
        name=teacher.name
    )

@router.get("/", response_model=list[TeacherSchema])
def list_teachers(
    current_user: Profile = Depends(get_current_user_profile),
    db: Session = Depends(get_db)
):
    teachers = db.query(TeacherModel).filter(
        TeacherModel.organization_id == current_user.organization_id
    ).all()
    return [
        TeacherSchema(
            id=str(t.id),
            organization_id=str(t.organization_id),
            name=t.name
        ) for t in teachers
    ]

@router.get("/{teacher_id}", response_model=TeacherSchema)
def get_teacher(
    teacher_id: str,
    current_user: Profile = Depends(get_current_user_profile),
    db: Session = Depends(get_db)
):
    try:
        t_uuid = uuid.UUID(teacher_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Teacher not found")
        
    teacher = db.query(TeacherModel).filter(
        TeacherModel.id == t_uuid,
        TeacherModel.organization_id == current_user.organization_id
    ).first()
    
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
        
    return TeacherSchema(
        id=str(teacher.id),
        organization_id=str(teacher.organization_id),
        name=teacher.name
    )

@router.put("/{teacher_id}", response_model=TeacherSchema)
def update_teacher(
    teacher_id: str,
    payload: TeacherUpdate,
    current_user: Profile = Depends(require_org_admin),
    db: Session = Depends(get_db)
):
    try:
        t_uuid = uuid.UUID(teacher_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Teacher not found")
        
    teacher = db.query(TeacherModel).filter(
        TeacherModel.id == t_uuid,
        TeacherModel.organization_id == current_user.organization_id
    ).first()
    
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
        
    old_name = teacher.name
    if payload.name is not None:
        teacher.name = payload.name
        db.commit()
        db.refresh(teacher)
        
        AuditService.log_action(
            db=db,
            org_id=current_user.organization_id,
            actor_id=current_user.id,
            action="teacher.update",
            target_table="teachers",
            target_id=teacher.id,
            diff={"old_values": {"name": old_name}, "new_values": {"name": teacher.name}}
        )
        
    return TeacherSchema(
        id=str(teacher.id),
        organization_id=str(teacher.organization_id),
        name=teacher.name
    )

@router.delete("/{teacher_id}", status_code=204)
def delete_teacher(
    teacher_id: str,
    current_user: Profile = Depends(require_org_admin),
    db: Session = Depends(get_db)
):
    try:
        t_uuid = uuid.UUID(teacher_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Teacher not found")
        
    teacher = db.query(TeacherModel).filter(
        TeacherModel.id == t_uuid,
        TeacherModel.organization_id == current_user.organization_id
    ).first()
    
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
        
    old_name = teacher.name
    teacher_id_val = teacher.id
    
    try:
        db.delete(teacher)
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Teacher could not be deleted because it is still referenced by other records")
    
    AuditService.log_action(
        db=db,
        org_id=current_user.organization_id,
        actor_id=current_user.id,
        action="teacher.delete",
        target_table="teachers",
        target_id=teacher_id_val,
        diff={"old_values": {"name": old_name}}
    )
    return
