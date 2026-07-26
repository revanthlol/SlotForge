from typing import Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field

class GroupCreate(BaseModel):
    name: str = Field(..., min_length=1)
    group_type: str = Field(..., min_length=1)
    size: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None

class GroupUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    group_type: Optional[str] = Field(None, min_length=1)
    size: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None

class GroupResponse(BaseModel):
    id: UUID
    organization_id: UUID
    workspace_id: UUID
    name: str
    group_type: str
    size: Optional[int] = None
    metadata: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True
