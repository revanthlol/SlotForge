from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


OnboardingStepKey = Literal[
    "organization",
    "workspace",
    "preset",
    "time",
    "resources",
    "tasks",
    "groups",
    "locations",
    "constraints",
    "preflight",
    "generate",
]


class OnboardingProgressUpdate(BaseModel):
    current_step: int = Field(..., ge=0, le=10)
    completed_steps: list[OnboardingStepKey] = Field(default_factory=list, max_length=11)
    skipped: bool = False

    @field_validator("completed_steps")
    @classmethod
    def completed_steps_are_unique(cls, value: list[OnboardingStepKey]) -> list[OnboardingStepKey]:
        if len(value) != len(set(value)):
            raise ValueError("completed_steps cannot contain duplicates")
        return value


class OnboardingProgressResponse(OnboardingProgressUpdate):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    organization_id: UUID
    workspace_id: UUID
    created_at: datetime
    updated_at: datetime


class PreflightWarning(BaseModel):
    type: str
    message: str
    severity: Literal["info", "warning", "error"]


class PreflightCheckResponse(BaseModel):
    feasible: bool
    warnings: list[PreflightWarning]
