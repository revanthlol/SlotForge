from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field

class Teacher(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: str
    name: str

class Room(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: str
    name: str
    capacity: int
    room_type: str = Field(alias="type")

class Subject(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: str
    name: str
    weekly_hours: int

class Section(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: str
    name: str
    size: int

class TimeSlot(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: str
    day: str
    period: int

class Constraint(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: str
    constraint_type: str
    payload: dict
    weight: Optional[int] = None

class ProblemInstance(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    teachers: list[Teacher]
    rooms: list[Room]
    subjects: list[Subject]
    sections: list[Section]
    slots: list[TimeSlot]
    constraints: list[Constraint] = Field(default_factory=list)

class ScheduledSlot(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    section_id: str
    subject_id: str
    teacher_id: str
    room_id: str
    slot_id: str

class SolverResult(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    status: Literal["OPTIMAL", "FEASIBLE", "INFEASIBLE"]
    assignments: list[ScheduledSlot]
    scores: dict
    infeasible_reason: Optional[str] = None
