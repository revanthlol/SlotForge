from typing import Optional
from pydantic import BaseModel, Field

class SignupOrganizationRequest(BaseModel):
    email: str
    password: str = Field(..., min_length=6)
    org_name: str = Field(..., min_length=1)
    full_name: Optional[str] = None

class SignupOrganizationResponse(BaseModel):
    organization_id: str
    user_id: str
    email: str
