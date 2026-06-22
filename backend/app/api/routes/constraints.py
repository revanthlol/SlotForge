import uuid
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.schemas.constraint import Constraint as ConstraintSchema, ConstraintCreate, ConstraintUpdate
from app.models.constraint import Constraint as ConstraintModel
from app.core.db import get_db
from app.core.auth import get_current_user_profile, require_org_admin
from app.models.profile import Profile
from app.services.audit_service import AuditService

router = APIRouter()

@router.post("/", response_model=ConstraintSchema, status_code=201)
def create_constraint(
    payload: ConstraintCreate,
    current_user: Profile = Depends(require_org_admin),
    db: Session = Depends(get_db)
):
    constraint = ConstraintModel(
        organization_id=current_user.organization_id,
        constraint_type=payload.constraint_type,
        payload=payload.payload,
        weight=payload.weight
    )
    db.add(constraint)
    db.commit()
    db.refresh(constraint)
    
    AuditService.log_action(
        db=db,
        org_id=current_user.organization_id,
        actor_id=current_user.id,
        action="constraint.create",
        target_table="constraints",
        target_id=constraint.id,
        diff={"new_values": {"constraint_type": constraint.constraint_type, "payload": constraint.payload, "weight": constraint.weight}}
    )
    
    return ConstraintSchema(
        id=str(constraint.id),
        organization_id=str(constraint.organization_id),
        constraint_type=constraint.constraint_type,
        payload=constraint.payload,
        weight=constraint.weight
    )

@router.get("/", response_model=list[ConstraintSchema])
def list_constraints(
    current_user: Profile = Depends(get_current_user_profile),
    db: Session = Depends(get_db)
):
    constraints = db.query(ConstraintModel).filter(
        ConstraintModel.organization_id == current_user.organization_id
    ).all()
    return [
        ConstraintSchema(
            id=str(c.id),
            organization_id=str(c.organization_id),
            constraint_type=c.constraint_type,
            payload=c.payload,
            weight=c.weight
        ) for c in constraints
    ]

@router.get("/{constraint_id}", response_model=ConstraintSchema)
def get_constraint(
    constraint_id: str,
    current_user: Profile = Depends(get_current_user_profile),
    db: Session = Depends(get_db)
):
    try:
        c_uuid = uuid.UUID(constraint_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Constraint not found")
        
    constraint = db.query(ConstraintModel).filter(
        ConstraintModel.id == c_uuid,
        ConstraintModel.organization_id == current_user.organization_id
    ).first()
    
    if not constraint:
        raise HTTPException(status_code=404, detail="Constraint not found")
        
    return ConstraintSchema(
        id=str(constraint.id),
        organization_id=str(constraint.organization_id),
        constraint_type=constraint.constraint_type,
        payload=constraint.payload,
        weight=constraint.weight
    )

@router.put("/{constraint_id}", response_model=ConstraintSchema)
def update_constraint(
    constraint_id: str,
    payload: ConstraintUpdate,
    current_user: Profile = Depends(require_org_admin),
    db: Session = Depends(get_db)
):
    try:
        c_uuid = uuid.UUID(constraint_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Constraint not found")
        
    constraint = db.query(ConstraintModel).filter(
        ConstraintModel.id == c_uuid,
        ConstraintModel.organization_id == current_user.organization_id
    ).first()
    
    if not constraint:
        raise HTTPException(status_code=404, detail="Constraint not found")
        
    old_values = {
        "constraint_type": constraint.constraint_type,
        "payload": constraint.payload,
        "weight": constraint.weight
    }
    
    mutated = False
    if payload.constraint_type is not None:
        constraint.constraint_type = payload.constraint_type
        mutated = True
    if payload.payload is not None:
        constraint.payload = payload.payload
        mutated = True
    if payload.weight is not None:
        constraint.weight = payload.weight
        mutated = True
        
    if mutated:
        db.commit()
        db.refresh(constraint)
        
        AuditService.log_action(
            db=db,
            org_id=current_user.organization_id,
            actor_id=current_user.id,
            action="constraint.update",
            target_table="constraints",
            target_id=constraint.id,
            diff={
                "old_values": old_values,
                "new_values": {
                    "constraint_type": constraint.constraint_type,
                    "payload": constraint.payload,
                    "weight": constraint.weight
                }
            }
        )
    
    return ConstraintSchema(
        id=str(constraint.id),
        organization_id=str(constraint.organization_id),
        constraint_type=constraint.constraint_type,
        payload=constraint.payload,
        weight=constraint.weight
    )

@router.delete("/{constraint_id}", status_code=204)
def delete_constraint(
    constraint_id: str,
    current_user: Profile = Depends(require_org_admin),
    db: Session = Depends(get_db)
):
    try:
        c_uuid = uuid.UUID(constraint_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Constraint not found")
        
    constraint = db.query(ConstraintModel).filter(
        ConstraintModel.id == c_uuid,
        ConstraintModel.organization_id == current_user.organization_id
    ).first()
    
    if not constraint:
        raise HTTPException(status_code=404, detail="Constraint not found")
        
    old_values = {
        "constraint_type": constraint.constraint_type,
        "payload": constraint.payload,
        "weight": constraint.weight
    }
    constraint_id_val = constraint.id
    
    db.delete(constraint)
    db.commit()
    
    AuditService.log_action(
        db=db,
        org_id=current_user.organization_id,
        actor_id=current_user.id,
        action="constraint.delete",
        target_table="constraints",
        target_id=constraint_id_val,
        diff={"old_values": old_values}
    )
    return

