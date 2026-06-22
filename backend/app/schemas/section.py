from typing import Optional
from pydantic import BaseModel, Field

class SectionCreate(BaseModel):
    organization_id: str
    name: str = Field(..., min_length=1)
    size: int = Field(..., gt=0)

class SectionUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    size: Optional[int] = Field(None, gt=0)

class Section(BaseModel):
    id: str
    organization_id: str
    name: str
    size: int
