from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field


CanvasView = Literal["resource", "constraint", "conflict", "version"]


class CanvasNode(BaseModel):
    id: str
    type: str
    label: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    pressure_level: str | None = None


class CanvasEdge(BaseModel):
    id: str
    source: str
    target: str
    label: str | None = None
    edge_type: str


class CanvasResponse(BaseModel):
    workspace_id: UUID
    view: CanvasView
    nodes: list[CanvasNode]
    edges: list[CanvasEdge]
