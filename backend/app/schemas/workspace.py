from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field

class WorkspaceCreate(BaseModel):
    name: str = Field(..., min_length=1)
    domain_preset: str = Field(..., min_length=1)

class WorkspaceUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    domain_preset: Optional[str] = Field(None, min_length=1)

class WorkspaceResponse(BaseModel):
    id: UUID
    organization_id: UUID
    name: str
    domain_preset: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
