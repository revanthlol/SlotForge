from typing import Literal, Optional
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel
class TimetableGenerateRequest(BaseModel):
    organization_id: str

class TimetableSlotResponse(BaseModel):
    id: UUID
    section_id: UUID
    subject_id: UUID
    teacher_id: UUID
    room_id: UUID
    slot_id: str
    day: str
    period: int
    duration_periods: int = 1

class TimetableSlotUpdate(BaseModel):
    section_id: Optional[str] = None
    subject_id: Optional[str] = None
    teacher_id: Optional[str] = None
    room_id: Optional[str] = None
    day: Optional[str] = None
    period: Optional[int] = None
    duration_periods: Optional[int] = None

class TimetableSlotCreate(BaseModel):
    section_id: str
    subject_id: str
    teacher_id: str
    room_id: str
    day: str
    period: int
    duration_periods: int = 1

class TimetableResponse(BaseModel):
    id: Optional[UUID] = None
    version_id: Optional[UUID] = None
    organization_id: UUID
    status: str
    version_status: Optional[str] = None
    version_number: Optional[int] = None
    assignments: list[TimetableSlotResponse]
    scores: dict
    infeasible_reason: Optional[str] = None

class TimetableVersionResponse(BaseModel):
    id: UUID
    organization_id: UUID
    version_number: int
    status: str
    scores: dict
    created_by: Optional[UUID] = None
    created_at: datetime
