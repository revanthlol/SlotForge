from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class TeacherSubjectAssignment(BaseModel):
    id: UUID
    organization_id: UUID
    teacher_id: UUID
    subject_id: UUID


class TeacherSubjectReplace(BaseModel):
    subject_ids: list[str] = Field(default_factory=list)


class SectionSubjectTeacherAssignment(BaseModel):
    id: UUID
    organization_id: UUID
    section_id: UUID
    subject_id: UUID
    teacher_id: Optional[UUID] = None


class SectionSubjectTeacherAssignmentInput(BaseModel):
    section_id: str
    subject_id: str
    enabled: bool = True
    teacher_id: Optional[str] = None


class SectionSubjectTeacherBulkUpdate(BaseModel):
    assignments: list[SectionSubjectTeacherAssignmentInput] = Field(default_factory=list)
