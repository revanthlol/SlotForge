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
