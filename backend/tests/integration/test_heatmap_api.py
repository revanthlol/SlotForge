import uuid
import jwt
from fastapi.testclient import TestClient

from app.main import app
from app.core.db import SessionLocal
from app.models.organization import Organization
from app.models.profile import Profile
from app.models.workspace import SchedulingWorkspace
from app.models.resource import Resource
from app.models.location import Location
from app.models.task import Task
from app.models.group import Group
from app.models.timeslot import TimeSlot
from app.models.schedule_run import ScheduleRun
from app.models.schedule_version import ScheduleVersion
from app.models.assignment import Assignment as SlotModel

client = TestClient(app)

def setup_function():
    db = SessionLocal()
    try:
        db.query(ScheduleRun).delete()
        db.query(ScheduleVersion).delete()
        db.query(Resource).delete()
        db.query(Location).delete()
        db.query(Task).delete()
        db.query(Group).delete()
        db.query(TimeSlot).delete()
        db.query(SchedulingWorkspace).delete()
        db.query(Profile).delete()
        db.query(Organization).delete()
        db.commit()
    finally:
        db.close()

def get_auth_headers(user_id: str) -> dict:
    payload = {
        "sub": user_id,
        "aud": "authenticated",
        "role": "authenticated",
    }
    token = jwt.encode(payload, "dummy-secret-key-for-tests", algorithm="HS256")
    return {"Authorization": f"Bearer {token}"}

def create_test_user(org_name: str = "Heatmap Org", role: str = "org_admin") -> tuple[str, str, dict]:
    db = SessionLocal()
    try:
        org = Organization(name=org_name)
        db.add(org)
        db.flush()
        user_id = str(uuid.uuid4())
        profile = Profile(
            id=uuid.UUID(user_id),
            organization_id=org.id,
            role=role,
            full_name="Setup User",
        )
        db.add(profile)
        db.commit()
        return str(org.id), user_id, get_auth_headers(user_id)
    finally:
        db.close()

def test_heatmap_pressure_endpoint():
    org_id, _user_id, headers = create_test_user()
    
    # We will trigger pressure report which auto-creates workspace if compatibility check is run.
    # Note: _get_workspace_or_default creates a default workspace when org_id compatibility is triggered.
    response = client.post(f"/api/v1/workspaces/{org_id}/heatmap/pressure", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "summary" in data
    assert "warnings" in data

def test_heatmap_violations_empty():
    org_id, _user_id, headers = create_test_user()
    run_id = str(uuid.uuid4())
    
    response = client.get(f"/api/v1/workspaces/{org_id}/schedule-runs/{run_id}/heatmap/violations", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data["violations"]) == 0
    assert len(data["heatmap"]) == 0

def test_impact_analysis_preview():
    org_id, _user_id, headers = create_test_user()
    payload = {
        "change_type": "preview",
        "entity_id": org_id,
        "new_value": {"source": "test"}
    }
    
    response = client.post(f"/api/v1/workspaces/{org_id}/impact-analysis", json=payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["feasible"] is True
    assert "Preview mode" in data["message"]

def test_impact_analysis_rejects_unknown_change_type():
    org_id, _user_id, headers = create_test_user()

    response = client.post(
        f"/api/v1/workspaces/{org_id}/impact-analysis",
        json={"change_type": "not-a-supported-change"},
        headers=headers,
    )

    assert response.status_code == 422

def test_impact_analysis_requires_entity_for_specific_change():
    org_id, _user_id, headers = create_test_user()

    response = client.post(
        f"/api/v1/workspaces/{org_id}/impact-analysis",
        json={"change_type": "room_capacity", "new_value": "bad"},
        headers=headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["feasible"] is False
    assert "entity_id is required" in data["message"]

def test_impact_analysis_rejects_entity_from_another_workspace():
    org_a_id, _user_a_id, headers_a = create_test_user("Heatmap Org A")
    org_b_id, _user_b_id, headers_b = create_test_user("Heatmap Org B")

    teacher_response = client.post(
        "/teachers/",
        json={"organization_id": org_b_id, "name": "Org B Teacher"},
        headers=headers_b,
    )
    assert teacher_response.status_code == 201

    response = client.post(
        f"/api/v1/workspaces/{org_a_id}/impact-analysis",
        json={
            "change_type": "teacher_availability",
            "entity_id": teacher_response.json()["id"],
            "new_value": [],
        },
        headers=headers_a,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["feasible"] is False
    assert "does not belong to this workspace" in data["message"]

def test_impact_analysis_rejects_invalid_room_capacity():
    org_id, _user_id, headers = create_test_user("Capacity Org")
    db = SessionLocal()
    try:
        org_uuid = uuid.UUID(org_id)
        workspace = SchedulingWorkspace(
            organization_id=org_uuid,
            name="Capacity Workspace",
            domain_preset="academic",
        )
        db.add(workspace)
        db.flush()
        room = Location(
            organization_id=org_uuid,
            workspace_id=workspace.id,
            name="Capacity Room",
            location_type="classroom",
            capacity=30,
        )
        db.add(room)
        db.commit()
        db.refresh(room)

        response = client.post(
            f"/api/v1/workspaces/{workspace.id}/impact-analysis",
            json={
                "change_type": "room_capacity",
                "entity_id": str(room.id),
                "new_value": "not-a-number",
            },
            headers=headers,
        )
    finally:
        db.close()

    assert response.status_code == 200
    data = response.json()
    assert data["feasible"] is False
    assert "non-negative integer" in data["message"]

def test_assignment_explanation_reports_active_schedule_facts():
    org_id, _user_id, headers = create_test_user("Explanation Org")
    db = SessionLocal()
    try:
        org_uuid = uuid.UUID(org_id)
        workspace = SchedulingWorkspace(
            organization_id=org_uuid,
            name="Explanation Workspace",
            domain_preset="academic",
        )
        db.add(workspace)
        db.flush()

        teacher = Resource(
            organization_id=org_uuid,
            workspace_id=workspace.id,
            name="Dr. Facts",
            resource_type="teacher",
        )
        room = Location(
            organization_id=org_uuid,
            workspace_id=workspace.id,
            name="Room Facts",
            location_type="classroom",
            capacity=20,
        )
        subject = Task(
            organization_id=org_uuid,
            workspace_id=workspace.id,
            name="Fact Checking",
            task_type="subject",
            required_hours=2,
        )
        section = Group(
            organization_id=org_uuid,
            workspace_id=workspace.id,
            name="Facts A",
            group_type="section",
            size=10,
        )
        db.add_all([teacher, room, subject, section])
        db.flush()

        version = ScheduleVersion(
            organization_id=org_uuid,
            workspace_id=workspace.id,
            version_number=1,
            status="draft",
        )
        db.add(version)
        db.flush()
        run = ScheduleRun(
            organization_id=org_uuid,
            workspace_id=workspace.id,
            status="success",
            schedule_version_id=version.id,
        )
        db.add(run)
        db.flush()
        assignment = SlotModel(
            organization_id=org_uuid,
            workspace_id=workspace.id,
            schedule_version_id=version.id,
            task_id=subject.id,
            group_id=section.id,
            teacher_id=teacher.id,
            room_id=room.id,
            day="Mon",
            period=1,
            duration_slots=1,
        )
        overlapping = SlotModel(
            organization_id=org_uuid,
            workspace_id=workspace.id,
            schedule_version_id=version.id,
            task_id=subject.id,
            group_id=section.id,
            teacher_id=teacher.id,
            room_id=room.id,
            day="Mon",
            period=1,
            duration_slots=1,
        )
        db.add_all([assignment, overlapping])
        db.commit()
        db.refresh(assignment)

        response = client.get(
            f"/api/v1/workspaces/{workspace.id}/schedule-runs/{run.id}/assignments/{assignment.id}/explanation",
            headers=headers,
        )
    finally:
        db.close()

    assert response.status_code == 200
    data = response.json()
    assert any("overlapping" in warning for warning in data["warnings"])
    assert not any("no other teaching sessions scheduled" in reason for reason in data["reasons"])
