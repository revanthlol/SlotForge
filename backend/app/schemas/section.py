from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field

class SectionCreate(BaseModel):
    organization_id: str
    name: str = Field(..., min_length=1)
    size: int = Field(..., gt=0)
    class_teacher_id: Optional[str] = None

class SectionUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    size: Optional[int] = Field(None, gt=0)
    class_teacher_id: Optional[str] = None

class Section(BaseModel):
    id: UUID
    organization_id: UUID
    name: str
    size: int
    class_teacher_id: Optional[UUID] = None
