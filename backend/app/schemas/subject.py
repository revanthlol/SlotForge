from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field

class SubjectCreate(BaseModel):
    organization_id: str
    name: str = Field(..., min_length=1)
    weekly_hours: int = Field(..., gt=0)
    session_length: int = Field(1, ge=1, le=2)

class SubjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    weekly_hours: Optional[int] = Field(None, gt=0)
    session_length: Optional[int] = Field(None, ge=1, le=2)

class Subject(BaseModel):
    id: UUID
    organization_id: UUID
    name: str
    weekly_hours: int
    session_length: int = 1
