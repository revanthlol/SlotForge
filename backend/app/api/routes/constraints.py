import uuid
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from app.schemas.constraint import Constraint, ConstraintCreate, ConstraintUpdate
from app.core.db_memory import db

router = APIRouter()

@router.post("/", response_model=Constraint, status_code=201)
def create_constraint(payload: ConstraintCreate):
    with db.lock:
        if payload.organization_id not in db.organizations:
            raise HTTPException(status_code=400, detail="Invalid organization_id")
        
        constraint_id = str(uuid.uuid4())
        constraint_data = {
            "id": constraint_id,
            "organization_id": payload.organization_id,
            "constraint_type": payload.constraint_type,
            "payload": payload.payload,
            "weight": payload.weight
        }
        db.constraints[constraint_id] = constraint_data
    return constraint_data

@router.get("/", response_model=list[Constraint])
def list_constraints(organization_id: Optional[str] = Query(None)):
    with db.lock:
        constraints = list(db.constraints.values())
    if organization_id:
        constraints = [c for c in constraints if c["organization_id"] == organization_id]
    return constraints

@router.get("/{constraint_id}", response_model=Constraint)
def get_constraint(constraint_id: str):
    with db.lock:
        constraint = db.constraints.get(constraint_id)
    if not constraint:
        raise HTTPException(status_code=404, detail="Constraint not found")
    return constraint

@router.put("/{constraint_id}", response_model=Constraint)
def update_constraint(constraint_id: str, payload: ConstraintUpdate):
    with db.lock:
        constraint = db.constraints.get(constraint_id)
        if not constraint:
            raise HTTPException(status_code=404, detail="Constraint not found")
        
        if payload.constraint_type is not None:
            constraint["constraint_type"] = payload.constraint_type
        if payload.payload is not None:
            constraint["payload"] = payload.payload
        if payload.weight is not None:
            constraint["weight"] = payload.weight
    return constraint

@router.delete("/{constraint_id}", status_code=204)
def delete_constraint(constraint_id: str):
    with db.lock:
        if constraint_id not in db.constraints:
            raise HTTPException(status_code=404, detail="Constraint not found")
        del db.constraints[constraint_id]
    return
