from typing import Any, Literal, Optional, List
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field

class PressureItem(BaseModel):
    id: Optional[str] = None
    type: str  # "teacher" | "room" | "lab" | "section"
    name: str
    required: Optional[float] = None
    available: Optional[float] = None
    demand: Optional[float] = None
    capacity: Optional[float] = None
    utilization: Optional[float] = None
    severity: str  # "critical" | "high" | "medium" | "low" | "none"
    message: Optional[str] = None

    class Config:
        from_attributes = True

class PressureSummary(BaseModel):
    label: str
    value: float
    severity: str

    class Config:
        from_attributes = True

class SchedulingPressureReport(BaseModel):
    generated_at: Optional[datetime] = None
    overall_score: Optional[float] = None
    items: List[PressureItem]
    summary: Optional[List[PressureSummary]] = None
    warnings: Optional[List[str]] = None

    class Config:
        from_attributes = True

class ViolationItem(BaseModel):
    id: Optional[str] = None
    severity: str  # "critical" | "high" | "medium" | "low" | "none" | "warning"
    constraint_type: Optional[str] = None
    message: str
    day: Optional[str] = None
    period: Optional[int] = None
    resource_name: Optional[str] = None

    class Config:
        from_attributes = True

class HeatmapCell(BaseModel):
    day: str
    period: int
    value: float
    label: Optional[str] = None
    severity: Optional[str] = None

    class Config:
        from_attributes = True

class ViolationReport(BaseModel):
    score: Optional[float] = None
    generated_at: Optional[datetime] = None
    violations: List[ViolationItem]
    heatmap: List[HeatmapCell]
    summary: Optional[List[str]] = None

    class Config:
        from_attributes = True

class ImpactAnalysisReport(BaseModel):
    feasible: bool
    change_type: str
    message: Optional[str] = None
    conflicts: List[ViolationItem]
    suggested_actions: Optional[List[str]] = None

    class Config:
        from_attributes = True

class ImpactAnalysisRequest(BaseModel):
    change_type: Literal["preview", "teacher_availability", "room_capacity", "teacher_subject"] = "preview"
    entity_id: Optional[UUID] = None
    new_value: Any = None
    subject_id: Optional[UUID] = None

class AssignmentExplanationReport(BaseModel):
    assignment_id: str
    title: Optional[str] = None
    reasons: List[str]
    satisfied_constraints: Optional[List[str]] = None
    warnings: Optional[List[str]] = None

    class Config:
        from_attributes = True
