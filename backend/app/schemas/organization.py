from typing import Optional, Literal
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict

class OrganizationCreate(BaseModel):
    name: str = Field(..., min_length=1)

class OrganizationUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    scheduling_mode: Optional[Literal["fixed_weekday", "day_order"]] = None
    cycle_length: Optional[int] = Field(None, gt=0, le=50)
    periods_per_day: Optional[int] = Field(None, gt=0, le=20)

class Organization(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    name: str
    scheduling_mode: str
    cycle_length: int
    periods_per_day: int
