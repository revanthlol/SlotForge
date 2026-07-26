from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

class SignupOrganizationRequest(BaseModel):
    email: str
    password: str = Field(..., min_length=6)
    org_name: str = Field(..., min_length=1)
    full_name: Optional[str] = None
    job_title: Optional[str] = Field(default=None, max_length=80)

class SignupOrganizationResponse(BaseModel):
    organization_id: str
    user_id: str
    email: str


class CompleteAccountRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    org_name: str = Field(..., min_length=1, max_length=160)
    full_name: str = Field(..., min_length=2, max_length=120)
    job_title: str = Field(..., min_length=2, max_length=80)


class AuthMeResponse(BaseModel):
    user_id: str
    organization_id: str
    role: str
    full_name: Optional[str] = None
    job_title: Optional[str] = None


class ProfileUpdateRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=120)
    job_title: str = Field(..., min_length=2, max_length=80)
