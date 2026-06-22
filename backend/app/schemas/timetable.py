from typing import Literal, Optional
from datetime import datetime
from pydantic import BaseModel
from app.solver.models import ScheduledSlot

class TimetableGenerateRequest(BaseModel):
    organization_id: str

class TimetableResponse(BaseModel):
    id: str
    organization_id: str
    status: str
    assignments: list[ScheduledSlot]
    scores: dict
    infeasible_reason: Optional[str] = None

class TimetableVersionResponse(BaseModel):
    id: str
    organization_id: str
    version_number: int
    status: str
    scores: dict
    created_by: Optional[str] = None
    created_at: datetime

