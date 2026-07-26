import uuid

import jwt
from fastapi.testclient import TestClient

from app.main import app
from app.core.db import SessionLocal
from app.models.organization import Organization
from app.models.profile import Profile
from app.models.workspace import SchedulingWorkspace
from app.models.onboarding_progress import OnboardingProgress
from app.models.teacher import Teacher
from app.models.room import Room
from app.models.subject import Subject
from app.models.section import Section

client = TestClient(app)


def setup_function():
    db = SessionLocal()
    try:
        db.query(OnboardingProgress).delete()
        db.query(Teacher).delete()
        db.query(Room).delete()
        db.query(Subject).delete()
        db.query(Section).delete()
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


def create_test_user(org_name: str = "Onboarding Org", role: str = "org_admin") -> tuple[str, str, dict]:
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


def test_onboarding_progress_get_creates_default_for_org_id_compatibility():
    org_id, _user_id, headers = create_test_user()

    response = client.get(f"/api/v1/workspaces/{org_id}/onboarding/progress", headers=headers)

    assert response.status_code == 200
    data = response.json()
    assert data["organization_id"] == org_id
    assert data["current_step"] == 0
    assert data["completed_steps"] == []
    assert data["skipped"] is False
    assert data["workspace_id"] != org_id


def test_onboarding_progress_put_validates_and_persists():
    org_id, _user_id, headers = create_test_user()

    response = client.put(
        f"/api/v1/workspaces/{org_id}/onboarding/progress",
        json={"current_step": 3, "completed_steps": ["organization", "workspace", "preset"], "skipped": False},
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json()["current_step"] == 3
    assert response.json()["completed_steps"] == ["organization", "workspace", "preset"]

    get_response = client.get(f"/api/v1/workspaces/{org_id}/onboarding/progress", headers=headers)
    assert get_response.status_code == 200
    assert get_response.json()["current_step"] == 3


def test_onboarding_progress_persists_the_complete_twelve_step_flow():
    org_id, _user_id, headers = create_test_user()
    completed_steps = [
        "organization",
        "workspace",
        "preset",
        "time",
        "resources",
        "tasks",
        "groups",
        "locations",
        "assignments",
        "constraints",
        "preflight",
        "generate",
    ]

    response = client.put(
        f"/api/v1/workspaces/{org_id}/onboarding/progress",
        json={"current_step": 11, "completed_steps": completed_steps, "skipped": False},
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json()["current_step"] == 11
    assert response.json()["completed_steps"] == completed_steps

    restored = client.get(f"/api/v1/workspaces/{org_id}/onboarding/progress", headers=headers)
    assert restored.status_code == 200
    assert restored.json()["completed_steps"][-1] == "generate"


def test_onboarding_progress_rejects_unknown_steps():
    org_id, _user_id, headers = create_test_user()

    response = client.put(
        f"/api/v1/workspaces/{org_id}/onboarding/progress",
        json={"current_step": 2, "completed_steps": ["not-a-step"], "skipped": False},
        headers=headers,
    )

    assert response.status_code == 422


def test_presets_and_preflight_endpoints():
    org_id, _user_id, headers = create_test_user()

    presets_response = client.get("/api/v1/presets/", headers=headers)
    assert presets_response.status_code == 200
    assert {preset["key"] for preset in presets_response.json()} == {"academic", "staff_roster", "event", "exam", "facility"}

    config_response = client.get("/api/v1/presets/academic/config", headers=headers)
    assert config_response.status_code == 200
    assert config_response.json()["preset_key"] == "academic"

    preflight_response = client.post(f"/api/v1/workspaces/{org_id}/preflight-check", headers=headers)
    assert preflight_response.status_code == 200
    preflight = preflight_response.json()
    assert preflight["feasible"] is False
    assert any(warning["severity"] == "error" for warning in preflight["warnings"])
