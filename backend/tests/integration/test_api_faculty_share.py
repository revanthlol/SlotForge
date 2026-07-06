import uuid
from datetime import datetime, timedelta

import jwt
from fastapi.testclient import TestClient

from app.core.db import SessionLocal
from app.main import app
from app.models.assignment import Assignment, AssignmentLocation, AssignmentResource
from app.models.constraint import Constraint
from app.models.constraint_rule import ConstraintRule
from app.models.faculty_share_link import FacultyShareLink
from app.models.group import Group
from app.models.location import Location
from app.models.organization import Organization
from app.models.profile import Profile
from app.models.resource import Resource
from app.models.schedule_run import ScheduleRun
from app.models.schedule_version import ScheduleVersion
from app.models.task import Task
from app.models.workspace import SchedulingWorkspace

client = TestClient(app)


def setup_function():
    db = SessionLocal()
    try:
        db.query(FacultyShareLink).delete()
        db.query(AssignmentLocation).delete()
        db.query(AssignmentResource).delete()
        db.query(Assignment).delete()
        db.query(ScheduleRun).delete()
        db.query(ScheduleVersion).delete()
        db.query(ConstraintRule).delete()
        db.query(Constraint).delete()
        db.query(Resource).delete()
        db.query(Location).delete()
        db.query(Task).delete()
        db.query(Group).delete()
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


def create_org_user_and_schedule() -> tuple[str, str, str, str, dict]:
    db = SessionLocal()
    try:
        org = Organization(name="Faculty Share University")
        db.add(org)
        db.flush()

        user_id = str(uuid.uuid4())
        profile = Profile(
            id=uuid.UUID(user_id),
            organization_id=org.id,
            role="org_admin",
            full_name="Schedule Admin",
        )
        db.add(profile)
        db.commit()
        org_id = str(org.id)
    finally:
        db.close()

    headers = get_auth_headers(user_id)
    teacher_res = client.post("/teachers/", json={"organization_id": org_id, "name": "Dr. Rajesh Kumar"}, headers=headers)
    assert teacher_res.status_code == 201
    teacher_id = teacher_res.json()["id"]

    client.post("/rooms/", json={"organization_id": org_id, "name": "Room 101", "capacity": 40, "type": "lecture"}, headers=headers)
    client.post("/subjects/", json={"organization_id": org_id, "name": "Mathematics", "weekly_hours": 2}, headers=headers)
    client.post("/sections/", json={"organization_id": org_id, "name": "BSc CS-A", "size": 30}, headers=headers)

    db = SessionLocal()
    try:
        workspace = db.query(SchedulingWorkspace).filter(SchedulingWorkspace.organization_id == uuid.UUID(org_id)).first()
        assert workspace is not None
        workspace_id = str(workspace.id)
    finally:
        db.close()

    run_res = client.post(f"/api/v1/workspaces/{workspace_id}/schedule-runs/", headers=headers)
    assert run_res.status_code == 200
    run_data = run_res.json()
    assert run_data["status"] == "success"
    return org_id, workspace_id, teacher_id, run_data["run_id"], headers


def test_faculty_share_link_public_flow_and_pdf_export():
    _org_id, workspace_id, teacher_id, run_id, headers = create_org_user_and_schedule()

    resources_res = client.get(f"/api/v1/workspaces/{workspace_id}/resources?type=teacher", headers=headers)
    assert resources_res.status_code == 200
    resources = resources_res.json()
    assert len(resources) == 1
    assert resources[0]["id"] == teacher_id
    assert resources[0]["name"] == "Dr. Rajesh Kumar"

    share_res = client.post(
        f"/api/v1/workspaces/{workspace_id}/faculty/{teacher_id}/share-link",
        json={"schedule_run_id": run_id},
        headers=headers,
    )
    assert share_res.status_code == 201
    share_data = share_res.json()
    assert share_data["token"]
    assert share_data["share_url"].endswith(f"/share/faculty/{share_data['token']}")
    assert share_data["is_active"] is True

    history_res = client.get(f"/api/v1/workspaces/{workspace_id}/faculty/{teacher_id}/share-links", headers=headers)
    assert history_res.status_code == 200
    assert len(history_res.json()) == 1

    public_res = client.get(f"/api/v1/share/faculty/{share_data['token']}")
    assert public_res.status_code == 200
    public_data = public_res.json()
    assert public_data["faculty"]["name"] == "Dr. Rajesh Kumar"
    assert public_data["organization"]["name"] == "Faculty Share University"
    assert public_data["is_expired"] is False
    assert len(public_data["assignments"]) == 2
    assert public_data["assignments"][0]["subject_name"] == "Mathematics"
    assert public_data["assignments"][0]["section_name"] == "BSc CS-A"
    assert public_data["assignments"][0]["room_name"] == "Room 101"

    pdf_res = client.get(f"/api/v1/share/faculty/{share_data['token']}/pdf")
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert pdf_res.content.startswith(b"%PDF")

    revoke_res = client.delete(
        f"/api/v1/workspaces/{workspace_id}/faculty/{teacher_id}/share-link/{share_data['id']}",
        headers=headers,
    )
    assert revoke_res.status_code == 204

    revoked_res = client.get(f"/api/v1/share/faculty/{share_data['token']}")
    assert revoked_res.status_code == 404


def test_expired_faculty_share_link_returns_expiry_payload_and_blocks_pdf():
    _org_id, workspace_id, teacher_id, run_id, headers = create_org_user_and_schedule()

    expired_at = (datetime.utcnow() - timedelta(days=1)).isoformat()
    share_res = client.post(
        f"/api/v1/workspaces/{workspace_id}/faculty/{teacher_id}/share-link",
        json={"schedule_run_id": run_id, "expires_at": expired_at},
        headers=headers,
    )
    assert share_res.status_code == 201
    token = share_res.json()["token"]

    public_res = client.get(f"/api/v1/share/faculty/{token}")
    assert public_res.status_code == 200
    public_data = public_res.json()
    assert public_data["is_expired"] is True
    assert public_data["assignments"] == []
    assert public_data["message"] == "This faculty timetable link has expired."

    pdf_res = client.get(f"/api/v1/share/faculty/{token}/pdf")
    assert pdf_res.status_code == 410
