from collections import defaultdict
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.assignment import Assignment, TeacherSubjectAssignment
from app.models.constraint_rule import ConstraintRule
from app.models.group import Group
from app.models.location import Location
from app.models.resource import Resource
from app.models.schedule_version import ScheduleVersion
from app.models.task import Task
from app.schemas.canvas import CanvasEdge, CanvasNode, CanvasResponse, CanvasView
from app.services.heatmap_service import HeatmapService


def _id(kind: str, value: UUID | str) -> str:
    return f"{kind}:{value}"


def _node(kind: str, row: Any, label: str, **metadata: Any) -> CanvasNode:
    return CanvasNode(id=_id(kind, row.id), type=kind, label=label, metadata=metadata)


class CanvasService:
    @staticmethod
    def build(db: Session, workspace_id: UUID, view: CanvasView) -> CanvasResponse:
        if view == "version":
            nodes, edges = CanvasService._versions(db, workspace_id)
        elif view == "constraint":
            nodes, edges = CanvasService._constraints(db, workspace_id)
        elif view == "conflict":
            nodes, edges = CanvasService._conflicts(db, workspace_id)
        else:
            nodes, edges = CanvasService._resources(db, workspace_id)
        return CanvasResponse(workspace_id=workspace_id, view=view, nodes=nodes, edges=edges)

    @staticmethod
    def _workspace_rows(db: Session, workspace_id: UUID):
        resources = db.query(Resource).filter(Resource.workspace_id == workspace_id).order_by(Resource.name).all()
        tasks = db.query(Task).filter(Task.workspace_id == workspace_id).order_by(Task.name).all()
        groups = db.query(Group).filter(Group.workspace_id == workspace_id).order_by(Group.name).all()
        locations = db.query(Location).filter(Location.workspace_id == workspace_id).order_by(Location.name).all()
        assignments = db.query(Assignment).filter(Assignment.workspace_id == workspace_id).all()
        return resources, tasks, groups, locations, assignments

    @staticmethod
    def _resources(db: Session, workspace_id: UUID) -> tuple[list[CanvasNode], list[CanvasEdge]]:
        resources, tasks, groups, locations, assignments = CanvasService._workspace_rows(db, workspace_id)
        nodes: list[CanvasNode] = []
        edges: list[CanvasEdge] = []
        resource_ids = {str(row.id) for row in resources}
        task_ids = {str(row.id) for row in tasks}
        group_ids = {str(row.id) for row in groups}
        location_ids = {str(row.id) for row in locations}

        for row in resources:
            kind = "teacher" if row.resource_type in {"teacher", "employee", "speaker"} else "resource"
            nodes.append(_node(kind, row, row.name, resource_type=row.resource_type, max_hours_per_week=row.max_hours_per_week, availability=row.availability or {}))
        for row in tasks:
            nodes.append(_node("subject", row, row.name, task_type=row.task_type, weekly_hours=row.required_hours, session_length=(row.task_metadata or {}).get("session_length", 1), color=(row.task_metadata or {}).get("color")))
        for row in groups:
            nodes.append(_node("section", row, row.name, group_type=row.group_type, size=row.size))
        for row in locations:
            kind = "lab" if row.location_type == "lab" else "room"
            nodes.append(_node(kind, row, row.name, location_type=row.location_type, capacity=row.capacity))

        counts: defaultdict[tuple[str, str, str, str, str], int] = defaultdict(int)
        for assignment in assignments:
            pairs = [
                ("section", assignment.group_id, "subject", assignment.task_id, "requires"),
                ("subject", assignment.task_id, "teacher", assignment.teacher_id, "taught by"),
                ("section", assignment.group_id, "room", assignment.room_id, "uses"),
            ]
            for source_kind, source_id, target_kind, target_id, edge_type in pairs:
                if not source_id or not target_id:
                    continue
                source_valid = str(source_id) in (group_ids if source_kind == "section" else task_ids if source_kind == "subject" else resource_ids)
                target_valid = str(target_id) in (task_ids if target_kind == "subject" else resource_ids if target_kind == "teacher" else location_ids)
                if source_valid and target_valid:
                    counts[(source_kind, str(source_id), target_kind, str(target_id), edge_type)] += 1

        for (source_kind, source_id, target_kind, target_id, edge_type), count in counts.items():
            edges.append(CanvasEdge(id=f"{source_kind}:{source_id}->{target_kind}:{target_id}", source=_id(source_kind, source_id), target=_id(target_kind, target_id), label=f"{count} period{'s' if count != 1 else ''}", edge_type=edge_type))

        qualified = db.query(TeacherSubjectAssignment).filter(TeacherSubjectAssignment.workspace_id == workspace_id).all()
        for row in qualified:
            if str(row.teacher_id) in resource_ids and str(row.subject_id) in task_ids:
                edge_id = f"teacher:{row.teacher_id}->subject:{row.subject_id}:qualified"
                if not any(edge.id == edge_id for edge in edges):
                    edges.append(CanvasEdge(id=edge_id, source=_id("teacher", row.teacher_id), target=_id("subject", row.subject_id), label="qualified", edge_type="teaches"))
        return nodes, edges

    @staticmethod
    def _constraints(db: Session, workspace_id: UUID) -> tuple[list[CanvasNode], list[CanvasEdge]]:
        resources, tasks, groups, locations, _ = CanvasService._workspace_rows(db, workspace_id)
        rules = db.query(ConstraintRule).filter(ConstraintRule.workspace_id == workspace_id).order_by(ConstraintRule.priority, ConstraintRule.name).all()
        nodes: list[CanvasNode] = []
        edges: list[CanvasEdge] = []
        lookup: dict[str, tuple[str, str]] = {}
        for row in resources:
            lookup[str(row.id)] = ("teacher" if row.resource_type == "teacher" else "resource", row.name)
            nodes.append(_node("teacher" if row.resource_type == "teacher" else "resource", row, row.name, resource_type=row.resource_type))
        for row in tasks:
            lookup[str(row.id)] = ("subject", row.name)
            nodes.append(_node("subject", row, row.name, task_type=row.task_type))
        for row in groups:
            lookup[str(row.id)] = ("section", row.name)
            nodes.append(_node("section", row, row.name, group_type=row.group_type, size=row.size))
        for row in locations:
            lookup[str(row.id)] = ("lab" if row.location_type == "lab" else "room", row.name)
            nodes.append(_node("lab" if row.location_type == "lab" else "room", row, row.name, location_type=row.location_type, capacity=row.capacity))
        for rule in rules:
            nodes.append(CanvasNode(id=_id("constraint", rule.id), type="constraint", label=rule.name, metadata={"template_key": rule.template_key, "rule_type": rule.rule_type, "enabled": rule.enabled, "priority": rule.priority, "penalty": rule.penalty, "parameters": rule.parameters or {}}))
            values = rule.parameters or {}
            referenced = set()
            for key, value in values.items():
                if key.endswith("_id") and value:
                    referenced.add(str(value))
                if key.endswith("_ids") and isinstance(value, list):
                    referenced.update(str(item) for item in value)
            for ref in sorted(referenced):
                target = lookup.get(ref)
                if not target:
                    continue
                target_kind, _ = target
                edges.append(CanvasEdge(id=f"constraint:{rule.id}->{target_kind}:{ref}", source=_id("constraint", rule.id), target=_id(target_kind, ref), label="affects", edge_type="affects"))
        return nodes, edges

    @staticmethod
    def _conflicts(db: Session, workspace_id: UUID) -> tuple[list[CanvasNode], list[CanvasEdge]]:
        nodes, resource_edges = CanvasService._resources(db, workspace_id)
        pressure = HeatmapService.calculate_pressure_report(workspace_id, db)
        pressure_by_id = {str(item.id): item for item in pressure.items if item.id}
        for node in nodes:
            item = pressure_by_id.get(node.id.split(":", 1)[-1])
            if item:
                node.pressure_level = item.severity
                node.metadata.update({"required": item.required, "available": item.available, "utilization": item.utilization, "message": item.message})
        conflict_edges = [edge.model_copy(update={"edge_type": "pressure"}) for edge in resource_edges]
        return nodes, conflict_edges

    @staticmethod
    def _versions(db: Session, workspace_id: UUID) -> tuple[list[CanvasNode], list[CanvasEdge]]:
        versions = db.query(ScheduleVersion).filter(ScheduleVersion.workspace_id == workspace_id).order_by(ScheduleVersion.created_at).all()
        nodes = [CanvasNode(id=_id("version", row.id), type="version", label=row.version_label, metadata={"status": row.status, "version_number": row.version_number, "branch_name": row.branch_name, "scores": row.scores or {}, "created_at": row.created_at.isoformat()}) for row in versions]
        edges = [CanvasEdge(id=f"version:{row.parent_version_id}->version:{row.id}", source=_id("version", row.parent_version_id), target=_id("version", row.id), label="branches to", edge_type="branches_to") for row in versions if row.parent_version_id]
        return nodes, edges
