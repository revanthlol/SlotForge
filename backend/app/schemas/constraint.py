from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field

class ConstraintCreate(BaseModel):
    organization_id: str
    constraint_type: str = Field(..., min_length=1)
    payload: dict
    weight: Optional[int] = Field(None, ge=0)

class ConstraintUpdate(BaseModel):
    constraint_type: Optional[str] = Field(None, min_length=1)
    payload: Optional[dict] = None
    weight: Optional[int] = Field(None, ge=0)

class Constraint(BaseModel):
    id: UUID
    organization_id: UUID
    constraint_type: str
    payload: dict
    weight: Optional[int] = None
