from typing import Optional
from uuid import UUID
from datetime import datetime, time
from pydantic import BaseModel, Field

class TimeSlotCreate(BaseModel):
    name: str = Field(..., min_length=1)
    day: str = Field(..., min_length=1)
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    slot_index: int = Field(..., ge=0)

class TimeSlotUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    day: Optional[str] = Field(None, min_length=1)
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    slot_index: Optional[int] = Field(None, ge=0)

class TimeSlotResponse(BaseModel):
    id: UUID
    organization_id: UUID
    workspace_id: UUID
    name: str
    day: str
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    slot_index: int
    created_at: datetime

    class Config:
        from_attributes = True
