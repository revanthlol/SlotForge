from typing import Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field

class LocationCreate(BaseModel):
    name: str = Field(..., min_length=1)
    location_type: str = Field(..., min_length=1)
    capacity: int = Field(..., gt=0)
    metadata: Optional[Dict[str, Any]] = None

class LocationUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    location_type: Optional[str] = Field(None, min_length=1)
    capacity: Optional[int] = Field(None, gt=0)
    metadata: Optional[Dict[str, Any]] = None

class LocationResponse(BaseModel):
    id: UUID
    organization_id: UUID
    workspace_id: UUID
    name: str
    location_type: str
    capacity: int
    metadata: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True
