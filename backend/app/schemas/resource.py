from typing import Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field

class ResourceCreate(BaseModel):
    name: str = Field(..., min_length=1)
    resource_type: str = Field(..., min_length=1)
    metadata: Optional[Dict[str, Any]] = None
    availability: Optional[Dict[str, Any]] = None
    max_hours_per_week: Optional[int] = None

class ResourceUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    resource_type: Optional[str] = Field(None, min_length=1)
    metadata: Optional[Dict[str, Any]] = None
    availability: Optional[Dict[str, Any]] = None
    max_hours_per_week: Optional[int] = None

class ResourceResponse(BaseModel):
    id: UUID
    organization_id: UUID
    workspace_id: UUID
    name: str
    resource_type: str
    metadata: Dict[str, Any]
    availability: Dict[str, Any]
    max_hours_per_week: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True
