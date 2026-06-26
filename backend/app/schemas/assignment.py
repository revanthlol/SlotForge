from typing import Optional

from pydantic import BaseModel, Field


class TeacherSubjectAssignment(BaseModel):
    id: str
    organization_id: str
    teacher_id: str
    subject_id: str


class TeacherSubjectReplace(BaseModel):
    subject_ids: list[str] = Field(default_factory=list)


class SectionSubjectTeacherAssignment(BaseModel):
    id: str
    organization_id: str
    section_id: str
    subject_id: str
    teacher_id: str


class SectionSubjectTeacherAssignmentInput(BaseModel):
    section_id: str
    subject_id: str
    teacher_id: Optional[str] = None


class SectionSubjectTeacherBulkUpdate(BaseModel):
    assignments: list[SectionSubjectTeacherAssignmentInput] = Field(default_factory=list)
