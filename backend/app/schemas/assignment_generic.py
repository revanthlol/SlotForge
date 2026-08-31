from typing import Optional, Dict, Any, List
from uuid import UUID
from datetime import datetime
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field

class AssignmentCreate(BaseModel):
    schedule_version_id: UUID
    task_id: UUID
    group_id: Optional[UUID] = None
    timeslot_id: Optional[UUID] = None
    duration_slots: Optional[int] = 1
    is_manual_override: Optional[bool] = False
    metadata: Optional[Dict[str, Any]] = None
    resource_ids: List[UUID] = Field(default_factory=list)
    location_ids: List[UUID] = Field(default_factory=list)

class AssignmentUpdate(BaseModel):
    task_id: Optional[UUID] = None
    group_id: Optional[UUID] = None
    timeslot_id: Optional[UUID] = None
    duration_slots: Optional[int] = None
    is_manual_override: Optional[bool] = None
    metadata: Optional[Dict[str, Any]] = None
    resource_ids: Optional[List[UUID]] = None
    location_ids: Optional[List[UUID]] = None

class AssignmentResponse(BaseModel):
    id: UUID
    organization_id: UUID
    workspace_id: UUID
    schedule_version_id: UUID
    task_id: UUID
    group_id: Optional[UUID] = None
    timeslot_id: Optional[UUID] = None
    duration_slots: int
    is_manual_override: bool
    metadata: Dict[str, Any]
    resource_ids: List[UUID] = Field(default_factory=list)
    location_ids: List[UUID] = Field(default_factory=list)
    created_at: datetime

    class Config:
        from_attributes = True
