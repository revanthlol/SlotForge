from pydantic import BaseModel, Field

class OrganizationCreate(BaseModel):
    name: str = Field(..., min_length=1)

class Organization(BaseModel):
    id: str
    name: str
