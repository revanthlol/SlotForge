from typing import Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field

class ConstraintRuleCreate(BaseModel):
    name: str = Field(..., min_length=1)
    rule_type: str = Field(..., min_length=1) # "hard" | "soft"
    template_key: str = Field(..., min_length=1)
    parameters: Optional[Dict[str, Any]] = None
    priority: Optional[int] = 1
    penalty: Optional[int] = None
    enabled: Optional[bool] = True

class ConstraintRuleUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    rule_type: Optional[str] = Field(None, min_length=1)
    template_key: Optional[str] = Field(None, min_length=1)
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

    class Config:
        from_attributes = True
