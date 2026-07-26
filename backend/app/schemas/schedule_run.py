from typing import Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel

class ScheduleRunResponse(BaseModel):
    id: UUID
    organization_id: UUID
    workspace_id: UUID
    schedule_version_id: Optional[UUID] = None
    status: str
    solver_score: Optional[Dict[str, Any]] = None
    explanation: Optional[Dict[str, Any]] = None
    duration_seconds: Optional[float] = None
    error_message: Optional[str] = None
    created_at: datetime
    version_label: Optional[str] = None
    version_number: Optional[int] = None
    version_status: Optional[str] = None
    parent_version_id: Optional[UUID] = None
    branch_name: Optional[str] = None
    published_at: Optional[datetime] = None
    archived_at: Optional[datetime] = None

    class Config:
        from_attributes = True
