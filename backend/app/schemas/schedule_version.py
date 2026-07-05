from typing import Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field

class ScheduleVersionCreate(BaseModel):
    version_label: str = Field(..., min_length=1)
    parent_version_id: Optional[UUID] = None
    metadata: Optional[Dict[str, Any]] = None

class ScheduleVersionUpdate(BaseModel):
    version_label: Optional[str] = Field(None, min_length=1)
    status: Optional[str] = Field(None, min_length=1)
    metadata: Optional[Dict[str, Any]] = None

class ScheduleVersionResponse(BaseModel):
    id: UUID
    organization_id: UUID
    workspace_id: UUID
    version_label: str
    version_number: Optional[int] = None
    status: str
    scores: Dict[str, Any]
    explanation: Optional[Dict[str, Any]] = None
    parent_version_id: Optional[UUID] = None
    is_manual_override: bool
    metadata: Dict[str, Any]
    created_by: Optional[UUID] = None
    created_at: datetime

    class Config:
        from_attributes = True
