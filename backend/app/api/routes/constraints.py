import uuid
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.schemas.constraint import Constraint as ConstraintSchema, ConstraintCreate, ConstraintUpdate
from app.models.constraint import Constraint as ConstraintModel
from app.core.db import get_db
from app.core.auth import get_current_user_profile
from app.models.profile import Profile

router = APIRouter()

@router.post("/", response_model=ConstraintSchema, status_code=201)
def create_constraint(
    payload: ConstraintCreate,
    current_user: Profile = Depends(get_current_user_profile),
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
        
    if payload.constraint_type is not None:
        constraint.constraint_type = payload.constraint_type
    if payload.payload is not None:
        constraint.payload = payload.payload
    if payload.weight is not None:
        constraint.weight = payload.weight
        
    db.commit()
    db.refresh(constraint)
    
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
        
    db.delete(constraint)
    db.commit()
    return
