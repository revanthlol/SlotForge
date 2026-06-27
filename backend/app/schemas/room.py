from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict

class RoomCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    organization_id: str
    name: str = Field(..., min_length=1)
    capacity: int = Field(..., gt=0)
    room_type: str = Field(..., alias="type", min_length=1)

class RoomUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    name: Optional[str] = Field(None, min_length=1)
    capacity: Optional[int] = Field(None, gt=0)
    room_type: Optional[str] = Field(None, alias="type", min_length=1)

class Room(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: UUID
    organization_id: UUID
    name: str
    capacity: int
    room_type: str = Field(..., alias="type")
