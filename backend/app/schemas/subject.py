from typing import Optional
from pydantic import BaseModel, Field

class SubjectCreate(BaseModel):
    organization_id: str
    name: str = Field(..., min_length=1)
    weekly_hours: int = Field(..., gt=0)

class SubjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    weekly_hours: Optional[int] = Field(None, gt=0)

class Subject(BaseModel):
    id: str
    organization_id: str
    name: str
    weekly_hours: int
