"""Idempotent demo data seed for local development.

This is intentionally outside migration version files. Alembic can call it after
an upgrade, and developers can run it directly when they want to repair demo
data without changing schema history.
"""

from __future__ import annotations

import argparse
import sys
import uuid
from dataclasses import dataclass
from datetime import time
from typing import Any

import httpx
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import SessionLocal
from app.models.assignment import (
    Assignment,
    AssignmentLocation,
    AssignmentResource,
    SectionSubjectTeacherAssignment,
    TeacherSubjectAssignment,
)
from app.models.audit_log import AuditLog
from app.models.constraint_rule import ConstraintRule
from app.models.group import Group
from app.models.location import Location
from app.models.onboarding_progress import OnboardingProgress
from app.models.organization import Organization
from app.models.organization_membership import OrganizationMembership
from app.models.profile import Profile
from app.models.resource import Resource
from app.models.schedule_run import ScheduleRun
from app.models.schedule_version import ScheduleVersion
from app.models.task import Task
from app.models.timeslot import TimeSlot
from app.models.workspace import SchedulingWorkspace


DEMO_NAMESPACE = uuid.UUID("6ca54062-7695-44d2-83f4-f1f6d1e8e16b")
FALLBACK_DEMO_USER_ID = uuid.uuid5(DEMO_NAMESPACE, "user:demo-admin")
REQUIRED_TABLES = {
    "organizations",
    "profiles",
    "organization_memberships",
    "scheduling_workspaces",
    "resources",
    "tasks",
    "groups",
    "locations",
    "timeslots",
    "schedule_versions",
    "assignments",
    "assignment_resources",
    "assignment_locations",
    "constraint_rules",
}


def demo_uuid(name: str) -> uuid.UUID:
    return uuid.uuid5(DEMO_NAMESPACE, name)


@dataclass(frozen=True)
class DemoSeedResult:
    organization_id: uuid.UUID
    user_id: uuid.UUID
    workspace_id: uuid.UUID
    schedule_version_id: uuid.UUID
    email: str
    password: str
    auth_synced: bool
    auth_message: str | None = None


def should_seed_on_alembic_upgrade() -> bool:
    return settings.DEMO_SEED_ON_ALEMBIC_UPGRADE and settings.APP_ENV.lower() in {
        "development",
        "dev",
        "local",
        "test",
    }


def seed_demo_data(
    db: Session | None = None,
    *,
    sync_auth: bool = True,
    require_auth: bool = False,
    echo: bool = True,
    user_id: uuid.UUID | None = None,
) -> DemoSeedResult | None:
    owns_session = db is None
    if db is None:
        db = SessionLocal()

    try:
        missing = _missing_required_tables(db)
        if missing:
            if echo:
                print(f"Demo seed skipped; database is missing tables: {', '.join(sorted(missing))}")
            return None

        auth_synced = False
        auth_message = None
        user_id = user_id or FALLBACK_DEMO_USER_ID
        if sync_auth:
            try:
                user_id = _ensure_supabase_auth_user(
                    db,
                    email=settings.DEMO_SEED_EMAIL,
                    password=settings.DEMO_SEED_PASSWORD,
                )
                auth_synced = True
            except Exception as exc:  # Keep migrations usable if Auth is offline.
                auth_message = str(exc)
                if require_auth:
                    raise

        result = _seed_application_data(db, user_id=user_id)
        result = DemoSeedResult(
            organization_id=result.organization_id,
            user_id=result.user_id,
            workspace_id=result.workspace_id,
            schedule_version_id=result.schedule_version_id,
            email=settings.DEMO_SEED_EMAIL,
            password=settings.DEMO_SEED_PASSWORD,
            auth_synced=auth_synced,
            auth_message=auth_message,
        )

        db.commit()

        if echo:
            _print_result(result)
        return result
    except Exception:
        db.rollback()
        raise
    finally:
        if owns_session:
            db.close()


def _missing_required_tables(db: Session) -> set[str]:
    inspector = inspect(db.get_bind())
    tables = set(inspector.get_table_names())
    return REQUIRED_TABLES - tables


def _ensure_supabase_auth_user(db: Session, *, email: str, password: str) -> uuid.UUID:
    if _is_placeholder_supabase_config():
        raise RuntimeError("Supabase Auth is not configured; using local fallback profile only")

    attributes = {
        "email": email,
        "password": password,
        "email_confirm": True,
        "user_metadata": {"full_name": "Demo Admin", "seed": "slotforge-demo"},
        "app_metadata": {"slotforge_demo": True},
    }

    existing_user_id = _get_auth_user_id_by_email(db, email)
    if existing_user_id:
        # A Supabase admin password update can fail independently of the
        # user lookup (for example when the project rotates JWT signing
        # keys). The Auth user ID is still authoritative and must be used
        # for the local profile; falling back to a synthetic ID creates a
        # profile that can never satisfy /auth/me for the real user.
        try:
            _update_auth_user(existing_user_id, attributes)
        except Exception:
            pass
        return existing_user_id

    try:
        response = _supabase_auth_request("POST", "/auth/v1/admin/users", attributes)
    except Exception as exc:
        existing_user_id = _get_auth_user_id_by_email(db, email)
        if existing_user_id:
            _update_auth_user(existing_user_id, attributes)
            return existing_user_id
        raise RuntimeError(f"failed to create Supabase demo user: {exc}") from exc

    user_id = _extract_user_id(response)
    if not user_id:
        user_id = _get_auth_user_id_by_email(db, email)
    if not user_id:
        raise RuntimeError("Supabase demo user was created but its user id could not be resolved")

    try:
        _update_auth_user(user_id, attributes)
    except Exception:
        # Keep the real Supabase ID even if optional credential
        # synchronization fails. The caller can still seed the matching
        # application profile and report the auth-sync warning separately.
        pass
    return user_id


def _is_placeholder_supabase_config() -> bool:
    values = [
        settings.SUPABASE_URL,
        settings.SUPABASE_SECRET_KEY,
        settings.SUPABASE_PUBLISHABLE_KEY,
    ]
    return any(
        not value
        or "YOUR_PROJECT_REF" in value
        or "your_secret_key_here" in value
        or "your_publishable_key_here" in value
        for value in values
    )


def _get_auth_user_id_by_email(db: Session, email: str) -> uuid.UUID | None:
    try:
        value = db.execute(
            text("SELECT id FROM auth.users WHERE lower(email) = lower(:email) LIMIT 1"),
            {"email": email},
        ).scalar()
    except Exception:
        db.rollback()
        return None

    if not value:
        return None
    return value if isinstance(value, uuid.UUID) else uuid.UUID(str(value))


def _supabase_auth_request(method: str, path: str, payload: dict[str, Any]) -> dict[str, Any]:
    url = f"{settings.SUPABASE_URL.rstrip('/')}{path}"
    headers = {
        "apikey": settings.SUPABASE_SECRET_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SECRET_KEY}",
        "Content-Type": "application/json",
    }
    with httpx.Client(timeout=20.0) as client:
        response = client.request(method, url, headers=headers, json=payload)
    if response.status_code >= 400:
        raise RuntimeError(f"{method} {path} returned {response.status_code}: {response.text}")
    return response.json()


def _update_auth_user(user_id: uuid.UUID, attributes: dict[str, Any]) -> None:
    update_payload = {
        "password": attributes["password"],
        "email_confirm": True,
        "user_metadata": attributes["user_metadata"],
        "app_metadata": attributes["app_metadata"],
    }
    try:
        _supabase_auth_request("PUT", f"/auth/v1/admin/users/{user_id}", update_payload)
    except Exception as exc:
        raise RuntimeError(f"failed to update Supabase demo user password: {exc}") from exc


def _extract_user_id(response: Any) -> uuid.UUID | None:
    candidates = [
        getattr(response, "user", None),
        getattr(response, "data", None),
        response,
    ]
    for candidate in candidates:
        if not candidate:
            continue
        raw_id = getattr(candidate, "id", None)
        if raw_id:
            return uuid.UUID(str(raw_id))
        if isinstance(candidate, dict):
            raw_id = candidate.get("id") or candidate.get("user", {}).get("id")
            if raw_id:
                return uuid.UUID(str(raw_id))
    return None


def _seed_application_data(db: Session, *, user_id: uuid.UUID) -> DemoSeedResult:
    org_id = demo_uuid("org:slotforge-demo-university")
    workspace_id = demo_uuid("workspace:academic")
    version_id = demo_uuid("schedule-version:published-v1")

    org = _upsert(
        db,
        Organization,
        org_id,
        name=settings.DEMO_SEED_ORG_NAME,
        scheduling_mode="fixed_weekday",
        cycle_length=6,
        periods_per_day=5,
    )
    _remove_fallback_demo_profile(db, org.id, user_id)
    profile = _upsert(
        db,
        Profile,
        user_id,
        organization_id=org.id,
        role="org_admin",
        full_name="Demo Admin",
    )
    _ensure_membership(db, user_id=profile.id, organization_id=org.id, role="org_admin")

    workspace = _upsert(
        db,
        SchedulingWorkspace,
        workspace_id,
        organization_id=org.id,
        name="Academic Timetable Demo",
        domain_preset="academic",
    )

    teachers = _seed_teachers(db, org.id, workspace.id)
    rooms = _seed_rooms(db, org.id, workspace.id)
    subjects = _seed_subjects(db, org.id, workspace.id)
    sections = _seed_sections(db, org.id, workspace.id, teachers)
    timeslots = _seed_timeslots(db, org.id, workspace.id)
    _seed_teaching_config(db, org.id, workspace.id, teachers, subjects, sections)
    _seed_constraints(db, org.id, workspace.id, teachers, subjects, sections)
    version = _seed_schedule_version(db, org.id, workspace.id, profile.id, version_id)
    _seed_assignments(db, org.id, workspace.id, version.id, teachers, rooms, subjects, sections, timeslots)
    _seed_onboarding(db, org.id, workspace.id)
    _seed_schedule_run(db, org.id, workspace.id, version.id)
    _seed_audit_log(db, org.id, profile.id)

    return DemoSeedResult(
        organization_id=org.id,
        user_id=profile.id,
        workspace_id=workspace.id,
        schedule_version_id=version.id,
        email=settings.DEMO_SEED_EMAIL,
        password=settings.DEMO_SEED_PASSWORD,
        auth_synced=False,
    )


def _remove_fallback_demo_profile(db: Session, org_id: uuid.UUID, active_user_id: uuid.UUID) -> None:
    if active_user_id == FALLBACK_DEMO_USER_ID:
        return

    fallback = db.get(Profile, FALLBACK_DEMO_USER_ID)
    if not fallback:
        return

    db.query(OrganizationMembership).filter(
        OrganizationMembership.user_id == FALLBACK_DEMO_USER_ID,
    ).delete(synchronize_session=False)
    db.delete(fallback)
    db.flush()


def _upsert(db: Session, model: type[Any], row_id: uuid.UUID, **values: Any) -> Any:
    row = db.get(model, row_id)
    if row is None:
        row = model(id=row_id, **values)
        db.add(row)
    else:
        for key, value in values.items():
            setattr(row, key, value)
    db.flush()
    return row


def _ensure_membership(db: Session, *, user_id: uuid.UUID, organization_id: uuid.UUID, role: str) -> OrganizationMembership:
    row = db.query(OrganizationMembership).filter(
        OrganizationMembership.user_id == user_id,
        OrganizationMembership.organization_id == organization_id,
    ).first()
    if row is None:
        row = OrganizationMembership(
            id=demo_uuid(f"membership:{user_id}:{organization_id}"),
            user_id=user_id,
            organization_id=organization_id,
            role=role,
        )
        db.add(row)
    else:
        row.role = role
    db.flush()
    return row


def _seed_teachers(db: Session, org_id: uuid.UUID, workspace_id: uuid.UUID) -> dict[str, Resource]:
    data = {
        "math": ("Dr. Asha Rao", 28),
        "physics": ("Prof. Vikram Nair", 26),
        "chemistry": ("Dr. Meera Iyer", 24),
        "english": ("Ms. Kavya Menon", 22),
        "cs": ("Mr. Arjun Sen", 24),
        "lab": ("Ms. Priya Shah", 20),
    }
    return {
        key: _upsert(
            db,
            Resource,
            demo_uuid(f"teacher:{key}"),
            organization_id=org_id,
            workspace_id=workspace_id,
            name=name,
            resource_type="teacher",
            resource_metadata={"department": key.title(), "seed": "slotforge-demo"},
            availability={},
            max_hours_per_week=max_hours,
        )
        for key, (name, max_hours) in data.items()
    }


def _seed_rooms(db: Session, org_id: uuid.UUID, workspace_id: uuid.UUID) -> dict[str, Location]:
    data = {
        "lecture_a": ("Room 101", "lecture", 42),
        "lecture_b": ("Room 102", "lecture", 42),
        "science_lab": ("Science Lab", "lab", 32),
        "computer_lab": ("Computer Lab", "lab", 34),
    }
    return {
        key: _upsert(
            db,
            Location,
            demo_uuid(f"room:{key}"),
            organization_id=org_id,
            workspace_id=workspace_id,
            name=name,
            location_type=room_type,
            capacity=capacity,
            location_metadata={"seed": "slotforge-demo"},
        )
        for key, (name, room_type, capacity) in data.items()
    }


def _seed_subjects(db: Session, org_id: uuid.UUID, workspace_id: uuid.UUID) -> dict[str, Task]:
    data = {
        "math": ("Mathematics", 4, "#2563EB"),
        "physics": ("Physics", 4, "#7C3AED"),
        "chemistry": ("Chemistry", 3, "#059669"),
        "english": ("English", 3, "#DC2626"),
        "cs": ("Computer Science", 4, "#D97706"),
    }
    return {
        key: _upsert(
            db,
            Task,
            demo_uuid(f"subject:{key}"),
            organization_id=org_id,
            workspace_id=workspace_id,
            name=name,
            task_type="subject",
            required_hours=hours,
            requires_continuous_slots=False,
            task_metadata={"color": color, "session_length": 1, "seed": "slotforge-demo"},
        )
        for key, (name, hours, color) in data.items()
    }


def _seed_sections(
    db: Session,
    org_id: uuid.UUID,
    workspace_id: uuid.UUID,
    teachers: dict[str, Resource],
) -> dict[str, Group]:
    data = {
        "a": ("Grade 10 A", 36, teachers["math"].id),
        "b": ("Grade 10 B", 34, teachers["english"].id),
    }
    return {
        key: _upsert(
            db,
            Group,
            demo_uuid(f"section:{key}"),
            organization_id=org_id,
            workspace_id=workspace_id,
            name=name,
            group_type="section",
            size=size,
            group_metadata={"class_teacher_id": str(class_teacher_id), "seed": "slotforge-demo"},
        )
        for key, (name, size, class_teacher_id) in data.items()
    }


def _seed_timeslots(db: Session, org_id: uuid.UUID, workspace_id: uuid.UUID) -> dict[tuple[str, int], TimeSlot]:
    starts = [time(8, 30), time(9, 25), time(10, 35), time(11, 30), time(12, 25)]
    ends = [time(9, 20), time(10, 15), time(11, 25), time(12, 20), time(13, 15)]
    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    rows: dict[tuple[str, int], TimeSlot] = {}
    for day in days:
        for period in range(1, 6):
            rows[(day, period)] = _upsert(
                db,
                TimeSlot,
                demo_uuid(f"timeslot:{day}:{period}"),
                organization_id=org_id,
                workspace_id=workspace_id,
                name=f"Period {period}",
                day=day,
                start_time=starts[period - 1],
                end_time=ends[period - 1],
                slot_index=period,
            )
    return rows


def _seed_teaching_config(
    db: Session,
    org_id: uuid.UUID,
    workspace_id: uuid.UUID,
    teachers: dict[str, Resource],
    subjects: dict[str, Task],
    sections: dict[str, Group],
) -> None:
    teacher_map = {
        "math": teachers["math"],
        "physics": teachers["physics"],
        "chemistry": teachers["chemistry"],
        "english": teachers["english"],
        "cs": teachers["cs"],
    }
    for subject_key, teacher in teacher_map.items():
        _upsert(
            db,
            TeacherSubjectAssignment,
            demo_uuid(f"teacher-subject:{subject_key}"),
            organization_id=org_id,
            workspace_id=workspace_id,
            teacher_id=teacher.id,
            subject_id=subjects[subject_key].id,
        )

    for section_key, section in sections.items():
        for subject_key, subject in subjects.items():
            _upsert(
                db,
                SectionSubjectTeacherAssignment,
                demo_uuid(f"section-subject-teacher:{section_key}:{subject_key}"),
                organization_id=org_id,
                workspace_id=workspace_id,
                section_id=section.id,
                subject_id=subject.id,
                teacher_id=teacher_map[subject_key].id,
            )


def _seed_constraints(
    db: Session,
    org_id: uuid.UUID,
    workspace_id: uuid.UUID,
    teachers: dict[str, Resource],
    subjects: dict[str, Task],
    sections: dict[str, Group],
) -> None:
    teacher_map = {
        "math": teachers["math"],
        "physics": teachers["physics"],
        "chemistry": teachers["chemistry"],
        "english": teachers["english"],
        "cs": teachers["cs"],
    }
    for subject_key, teacher in teacher_map.items():
        subject = subjects[subject_key]
        _upsert(
            db,
            ConstraintRule,
            demo_uuid(f"constraint:teacher-subject:{subject_key}"),
            organization_id=org_id,
            workspace_id=workspace_id,
            name=f"{teacher.name} teaches {subject.name}",
            rule_type="hard",
            template_key="teacher_subject",
            parameters={"teacher_id": str(teacher.id), "subject_id": str(subject.id)},
            priority=1,
            penalty=None,
            enabled=True,
        )

    for section_key, section in sections.items():
        for subject_key, subject in subjects.items():
            teacher = teacher_map[subject_key]
            _upsert(
                db,
                ConstraintRule,
                demo_uuid(f"constraint:section-subject-teacher:{section_key}:{subject_key}"),
                organization_id=org_id,
                workspace_id=workspace_id,
                name=f"{section.name} {subject.name} assigned to {teacher.name}",
                rule_type="hard",
                template_key="section_subject_teacher",
                parameters={
                    "section_id": str(section.id),
                    "subject_id": str(subject.id),
                    "teacher_id": str(teacher.id),
                },
                priority=1,
                penalty=None,
                enabled=True,
            )

    for section_key, section in sections.items():
        for subject_key, subject in subjects.items():
            _upsert(
                db,
                ConstraintRule,
                demo_uuid(f"constraint:section-subject:{section_key}:{subject_key}"),
                organization_id=org_id,
                workspace_id=workspace_id,
                name=f"{section.name} includes {subject.name}",
                rule_type="hard",
                template_key="section_subject",
                parameters={"section_id": str(section.id), "subject_id": str(subject.id)},
                priority=1,
                penalty=None,
                enabled=True,
            )


def _seed_schedule_version(
    db: Session,
    org_id: uuid.UUID,
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    version_id: uuid.UUID,
) -> ScheduleVersion:
    return _upsert(
        db,
        ScheduleVersion,
        version_id,
        organization_id=org_id,
        workspace_id=workspace_id,
        version_label="v1",
        version_number=1,
        status="published",
        scores={"preference_score": 94, "utilization_score": 81, "gap_score": 88, "overall_score": 88},
        explanation={"seed": "Published demo timetable for local feature testing"},
        parent_version_id=None,
        is_manual_override=False,
        version_metadata={"seed": "slotforge-demo"},
        created_by=user_id,
    )


def _seed_assignments(
    db: Session,
    org_id: uuid.UUID,
    workspace_id: uuid.UUID,
    version_id: uuid.UUID,
    teachers: dict[str, Resource],
    rooms: dict[str, Location],
    subjects: dict[str, Task],
    sections: dict[str, Group],
    timeslots: dict[tuple[str, int], TimeSlot],
) -> None:
    timetable = [
        ("a", "Mon", 1, "math"), ("a", "Mon", 2, "physics"), ("a", "Mon", 3, "chemistry"), ("a", "Mon", 4, "english"), ("a", "Mon", 5, "cs"),
        ("a", "Tue", 1, "math"), ("a", "Tue", 2, "physics"), ("a", "Tue", 3, "chemistry"), ("a", "Tue", 4, "english"), ("a", "Tue", 5, "cs"),
        ("a", "Wed", 1, "math"), ("a", "Wed", 3, "math"), ("a", "Wed", 4, "cs"),
        ("a", "Thu", 1, "physics"), ("a", "Thu", 2, "cs"), ("a", "Thu", 3, "physics"), ("a", "Thu", 4, "chemistry"),
        ("a", "Fri", 1, "english"),
        ("b", "Mon", 1, "english"), ("b", "Mon", 2, "cs"), ("b", "Mon", 3, "math"), ("b", "Mon", 4, "physics"), ("b", "Mon", 5, "chemistry"),
        ("b", "Tue", 1, "english"), ("b", "Tue", 2, "cs"), ("b", "Tue", 3, "math"), ("b", "Tue", 4, "physics"), ("b", "Tue", 5, "chemistry"),
        ("b", "Wed", 1, "cs"), ("b", "Wed", 2, "math"), ("b", "Wed", 3, "physics"), ("b", "Wed", 4, "math"),
        ("b", "Thu", 1, "chemistry"), ("b", "Thu", 2, "physics"), ("b", "Thu", 3, "cs"),
        ("b", "Fri", 2, "english"),
    ]
    desired_assignment_ids = {
        demo_uuid(f"assignment:{section_key}:{day}:{period}")
        for section_key, day, period, _subject_key in timetable
    }
    for assignment in db.query(Assignment).filter(
        Assignment.organization_id == org_id,
        Assignment.schedule_version_id == version_id,
    ).all():
        if assignment.assignment_metadata.get("seed") == "slotforge-demo" and assignment.id not in desired_assignment_ids:
            db.delete(assignment)
    db.flush()

    teacher_by_subject = {
        "math": teachers["math"],
        "physics": teachers["physics"],
        "chemistry": teachers["chemistry"],
        "english": teachers["english"],
        "cs": teachers["cs"],
    }
    for section_key, day, period, subject_key in timetable:
        section = sections[section_key]
        subject = subjects[subject_key]
        teacher = teacher_by_subject[subject_key]
        room = _room_for(section_key, subject_key, rooms)
        assignment = _upsert(
            db,
            Assignment,
            demo_uuid(f"assignment:{section_key}:{day}:{period}"),
            organization_id=org_id,
            workspace_id=workspace_id,
            schedule_version_id=version_id,
            task_id=subject.id,
            group_id=section.id,
            timeslot_id=timeslots[(day, period)].id,
            duration_slots=1,
            is_manual_override=False,
            assignment_metadata={"seed": "slotforge-demo"},
            day=day,
            period=period,
            teacher_id=teacher.id,
            room_id=room.id,
        )
        _ensure_assignment_resource(db, assignment.id, teacher.id)
        _ensure_assignment_location(db, assignment.id, room.id, section.size)


def _room_for(section_key: str, subject_key: str, rooms: dict[str, Location]) -> Location:
    if subject_key == "cs":
        return rooms["computer_lab"]
    if subject_key in {"physics", "chemistry"}:
        return rooms["science_lab"]
    return rooms["lecture_a"] if section_key == "a" else rooms["lecture_b"]


def _ensure_assignment_resource(db: Session, assignment_id: uuid.UUID, resource_id: uuid.UUID) -> None:
    row = db.get(AssignmentResource, (assignment_id, resource_id))
    if row is None:
        db.add(AssignmentResource(assignment_id=assignment_id, resource_id=resource_id))
        db.flush()


def _ensure_assignment_location(
    db: Session,
    assignment_id: uuid.UUID,
    location_id: uuid.UUID,
    student_count: int | None,
) -> None:
    row = db.get(AssignmentLocation, (assignment_id, location_id))
    if row is None:
        row = AssignmentLocation(
            assignment_id=assignment_id,
            location_id=location_id,
            student_count=student_count,
            sub_group=None,
            capacity_contribution=student_count,
        )
        db.add(row)
    else:
        row.student_count = student_count
        row.sub_group = None
        row.capacity_contribution = student_count
    db.flush()


def _seed_onboarding(db: Session, org_id: uuid.UUID, workspace_id: uuid.UUID) -> None:
    _upsert(
        db,
        OnboardingProgress,
        demo_uuid("onboarding:academic"),
        organization_id=org_id,
        workspace_id=workspace_id,
        current_step=5,
        completed_steps=["preset", "organization", "resources", "constraints", "generate"],
        skipped=False,
    )


def _seed_schedule_run(db: Session, org_id: uuid.UUID, workspace_id: uuid.UUID, version_id: uuid.UUID) -> None:
    _upsert(
        db,
        ScheduleRun,
        demo_uuid("schedule-run:published-v1"),
        organization_id=org_id,
        workspace_id=workspace_id,
        schedule_version_id=version_id,
        status="success",
        solver_score={"preference_score": 94, "utilization_score": 81, "gap_score": 88, "overall_score": 88},
        explanation={"seed": "Demo run seeded for feature testing"},
        duration_seconds=1.2,
        error_message=None,
    )


def _seed_audit_log(db: Session, org_id: uuid.UUID, user_id: uuid.UUID) -> None:
    _upsert(
        db,
        AuditLog,
        demo_uuid("audit:seed-demo-data"),
        organization_id=org_id,
        actor_id=user_id,
        action="demo.seed",
        target_table="organizations",
        target_id=org_id,
        diff={"seed": "slotforge-demo"},
    )


def _print_result(result: DemoSeedResult) -> None:
    print("Demo seed ready.")
    print(f"  Login email: {result.email}")
    print(f"  Login password: {result.password}")
    print(f"  Organization: {result.organization_id}")
    print(f"  Published timetable: {result.schedule_version_id}")
    if result.auth_synced:
        print("  Supabase Auth user: synced")
    else:
        print("  Supabase Auth user: not synced")
        if result.auth_message:
            print(f"  Auth note: {result.auth_message}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Seed persistent SlotForge demo data.")
    parser.add_argument("--skip-auth", action="store_true", help="Only seed application tables; do not create/update Supabase Auth user.")
    parser.add_argument("--require-auth", action="store_true", help="Fail if the Supabase Auth demo user cannot be created or updated.")
    args = parser.parse_args(argv)

    seed_demo_data(sync_auth=not args.skip_auth, require_auth=args.require_auth, echo=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
