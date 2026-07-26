from typing import Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field

class TaskCreate(BaseModel):
    name: str = Field(..., min_length=1)
    task_type: str = Field(..., min_length=1)
    required_hours: Optional[int] = None
    requires_continuous_slots: Optional[bool] = False
    metadata: Optional[Dict[str, Any]] = None

class TaskUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    task_type: Optional[str] = Field(None, min_length=1)
    required_hours: Optional[int] = None
    requires_continuous_slots: Optional[bool] = None
    metadata: Optional[Dict[str, Any]] = None

class TaskResponse(BaseModel):
    id: UUID
    organization_id: UUID
    workspace_id: UUID
    name: str
    task_type: str
    required_hours: Optional[int] = None
    requires_continuous_slots: bool
    metadata: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True
