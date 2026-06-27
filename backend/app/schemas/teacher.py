from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field

class TeacherCreate(BaseModel):
    organization_id: str
    name: str = Field(..., min_length=1)

class TeacherUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)

class Teacher(BaseModel):
    id: UUID
    organization_id: UUID
    name: str
