from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, Field


class ConstraintCreate(BaseModel):
    organization_id: str
    constraint_type: str = Field(..., min_length=1)
    payload: dict
    weight: Optional[int] = Field(None, ge=0)


class ConstraintUpdate(BaseModel):
    constraint_type: Optional[str] = Field(None, min_length=1)
    payload: Optional[dict] = None
    weight: Optional[int] = Field(None, ge=0)


class Constraint(BaseModel):
    id: UUID
    organization_id: UUID
    constraint_type: str
    payload: dict
    weight: Optional[int] = None


# ── Constraint Playground Schemas ──────────────────────────────────

class ConstraintTemplateParam(BaseModel):
    key: str
    label: str
    type: str  # "int" | "str" | "resource_picker" | "day_picker"
    default: Optional[Any] = None


class ConstraintTemplateResponse(BaseModel):
    key: str
    name: str
    description: str
    type: str  # "hard" | "soft"
    parameters: List[ConstraintTemplateParam] = Field(default_factory=list)
    solver_fn: str


class ConstraintRuleCreate(BaseModel):
    template_key: str = Field(..., min_length=1)
    name: Optional[str] = None
    rule_type: Optional[str] = None  # "hard" | "soft"
    parameters: Dict[str, Any] = Field(default_factory=dict)
    priority: int = 1
    penalty: Optional[int] = None
    enabled: bool = True


class ConstraintRuleUpdate(BaseModel):
    name: Optional[str] = None
    rule_type: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None
    priority: Optional[int] = None
    penalty: Optional[int] = None
    enabled: Optional[bool] = None


class ConstraintRuleResponse(BaseModel):
    id: UUID
    organization_id: UUID
    workspace_id: UUID
    name: str
    rule_type: str
    template_key: str
    parameters: Dict[str, Any]
    priority: int
    penalty: Optional[int] = None
    enabled: bool
    created_at: datetime


class ConstraintPreviewRequest(BaseModel):
    template_key: str
    parameters: Dict[str, Any] = Field(default_factory=dict)
    penalty: Optional[int] = None


class AffectedAssignmentInfo(BaseModel):
    section_id: str
    subject_id: str
    teacher_id: str
    room_id: str
    day: str
    period: int
    reason: str


class ConstraintPreviewResponse(BaseModel):
    template_key: str
    impacted_assignments_count: int
    impacted_assignments: List[AffectedAssignmentInfo] = Field(default_factory=list)
    infeasibility_risk: bool
    summary: str
