from collections import defaultdict
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.assignment import Assignment
from app.models.resource import Resource
from app.models.task import Task
from app.models.group import Group
from app.models.location import Location
from app.models.schedule_version import ScheduleVersion
from app.schemas.versioning import ChangedAssignment, DiffReport


def _assignment_key(assignment: Assignment) -> str:
    return f"{assignment.group_id}:{assignment.task_id}"


def _assignment_payload(assignment: Assignment) -> dict[str, Any]:
    return {
        "id": str(assignment.id),
        "section_id": str(assignment.group_id) if assignment.group_id else None,
        "subject_id": str(assignment.task_id),
        "teacher_id": str(assignment.teacher_id),
        "room_id": str(assignment.room_id),
        "day": assignment.day,
        "period": assignment.period,
        "duration_periods": assignment.duration_slots,
    }


class ScheduleDiffEngine:
    def __init__(self, db: Session):
        self.db = db

    def diff(self, version_a: ScheduleVersion, version_b: ScheduleVersion) -> DiffReport:
        assignments_a = self._index(version_a.id)
        assignments_b = self._index(version_b.id)
        changes: list[ChangedAssignment] = []
        affected: set[tuple[str, str]] = set()

        for key in sorted(set(assignments_a) | set(assignments_b)):
            before = assignments_a.get(key)
            after = assignments_b.get(key)
            if before is None or after is None:
                changed_fields = ["added" if before is None else "removed"]
            else:
                changed_fields = [
                    field for field in ("teacher_id", "room_id", "day", "period", "duration_periods")
                    if before[field] != after[field]
                ]
            if not changed_fields:
                continue
            changes.append(ChangedAssignment(
                key=key,
                section_id=UUID(after["section_id"] or before["section_id"]) if (after or before) and (after or before)["section_id"] else None,
                subject_id=UUID(after["subject_id"] or before["subject_id"]) if after or before else None,
                before=before,
                after=after,
                changes=changed_fields,
            ))
            for item in (before, after):
                if item:
                    affected.add(("teacher", item["teacher_id"]))
                    affected.add(("room", item["room_id"]))

        resource_ids = {resource_id for _, resource_id in affected}
        resources = self.db.query(Resource).filter(Resource.id.in_(resource_ids)).all() if resource_ids else []
        names = {str(resource.id): resource.name for resource in resources}
        affected_resources = [
            {"resource_type": kind, "resource_id": resource_id, "name": names.get(resource_id, resource_id)}
            for kind, resource_id in sorted(affected)
        ]

        score_delta = self._score_delta(version_a.scores, version_b.scores)
        return DiffReport(
            version_a_id=version_a.id,
            version_b_id=version_b.id,
            version_a_label=version_a.version_label,
            version_b_label=version_b.version_label,
            moved_count=sum(1 for change in changes if any(field in change.changes for field in ("day", "period"))),
            changed_count=len(changes),
            changes=changes,
            affected_resources=affected_resources,
            score_delta=score_delta,
            soft_violation_delta=self._score_delta(version_a.scores, version_b.scores, "soft_violations"),
        )

    def _index(self, version_id: UUID) -> dict[str, dict[str, Any]]:
        assignments = self.db.query(Assignment).filter(Assignment.schedule_version_id == version_id).order_by(Assignment.day, Assignment.period, Assignment.id).all()
        indexed: dict[str, dict[str, Any]] = {}
        occurrences: defaultdict[str, int] = defaultdict(int)
        for assignment in assignments:
            base_key = _assignment_key(assignment)
            occurrence = occurrences[base_key]
            occurrences[base_key] += 1
            indexed[f"{base_key}:{occurrence}"] = _assignment_payload(assignment)
        return indexed

    @staticmethod
    def _score_delta(before: dict[str, Any] | None, after: dict[str, Any] | None, key: str | None = None) -> float | None:
        if not before or not after:
            return None
        if key:
            old = before.get(key)
            new = after.get(key)
        else:
            old = before.get("overall_score", before.get("score"))
            new = after.get("overall_score", after.get("score"))
        try:
            return float(new) - float(old) if old is not None and new is not None else None
        except (TypeError, ValueError):
            return None
