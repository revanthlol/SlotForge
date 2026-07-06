from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class FacultyShareLinkCreate(BaseModel):
    schedule_run_id: UUID
    expires_at: Optional[datetime] = None


class FacultyShareLinkResponse(BaseModel):
    id: UUID
    token: str
    share_url: str
    organization_id: UUID
    workspace_id: UUID
    resource_id: UUID
    schedule_run_id: UUID
    created_by: Optional[UUID] = None
    expires_at: Optional[datetime] = None
    is_active: bool
    created_at: datetime
    revoked_at: Optional[datetime] = None


class PublicShareOrganization(BaseModel):
    id: UUID
    name: str


class PublicShareWorkspace(BaseModel):
    id: UUID
    name: str
    domain_preset: str


class PublicShareFaculty(BaseModel):
    id: UUID
    name: str
    resource_type: str


class PublicShareScheduleRun(BaseModel):
    id: UUID
    status: str
    created_at: datetime


class PublicShareScheduleVersion(BaseModel):
    id: UUID
    version_label: str
    version_number: Optional[int] = None
    status: str
    created_at: datetime


class FacultyTimetableAssignment(BaseModel):
    id: str
    section_id: Optional[str] = None
    section_name: Optional[str] = None
    subject_id: str
    subject_name: str
    teacher_id: str
    teacher_name: str
    room_id: str
    room_name: str
    slot_id: str
    day: str
    period: int
    duration_periods: int
    room_assignments: list[dict[str, Any]] = Field(default_factory=list)


class PublicFacultyTimetableResponse(BaseModel):
    token: str
    share_link_id: UUID
    is_active: bool
    is_expired: bool
    expires_at: Optional[datetime] = None
    published_at: datetime
    organization: PublicShareOrganization
    workspace: PublicShareWorkspace
    faculty: PublicShareFaculty
    schedule_run: PublicShareScheduleRun
    schedule_version: Optional[PublicShareScheduleVersion] = None
    assignments: list[FacultyTimetableAssignment]
    message: Optional[str] = None
