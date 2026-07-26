from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class BranchRequest(BaseModel):
    branch_name: str = Field(default="Draft", min_length=1, max_length=120)


class VersionLifecycleResponse(BaseModel):
    id: UUID
    run_id: UUID
    workspace_id: UUID
    organization_id: UUID
    version_label: str
    version_number: Optional[int] = None
    status: str
    scores: dict[str, Any] = Field(default_factory=dict)
    explanation: Optional[dict[str, Any]] = None
    parent_version_id: Optional[UUID] = None
    branch_name: Optional[str] = None
    is_manual_override: bool = False
    created_by: Optional[UUID] = None
    created_at: datetime
    published_at: Optional[datetime] = None
    archived_at: Optional[datetime] = None


class ChangedAssignment(BaseModel):
    key: str
    section_id: Optional[UUID] = None
    subject_id: Optional[UUID] = None
    before: Optional[dict[str, Any]] = None
    after: Optional[dict[str, Any]] = None
    changes: list[str] = Field(default_factory=list)


class DiffReport(BaseModel):
    version_a_id: UUID
    version_b_id: UUID
    version_a_label: str
    version_b_label: str
    moved_count: int
    changed_count: int
    changes: list[ChangedAssignment] = Field(default_factory=list)
    affected_resources: list[dict[str, Any]] = Field(default_factory=list)
    score_delta: Optional[float] = None
    soft_violation_delta: Optional[float] = None

