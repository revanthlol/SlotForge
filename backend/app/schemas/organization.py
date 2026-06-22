from pydantic import BaseModel, Field, ConfigDict

class OrganizationCreate(BaseModel):
    name: str = Field(..., min_length=1)

class Organization(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
