from typing import Literal, Optional
from pydantic import BaseModel
from app.solver.models import ScheduledSlot

class TimetableGenerateRequest(BaseModel):
    organization_id: str

class TimetableResponse(BaseModel):
    id: str
    organization_id: str
    status: Literal["OPTIMAL", "FEASIBLE", "INFEASIBLE"]
    assignments: list[ScheduledSlot]
    scores: dict
    infeasible_reason: Optional[str] = None
