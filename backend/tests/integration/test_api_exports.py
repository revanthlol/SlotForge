import uuid
import jwt
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings
from app.core.db import SessionLocal
from app.models.organization import Organization
from app.models.profile import Profile
from app.models.teacher import Teacher
from app.models.room import Room
from app.models.subject import Subject
from app.models.section import Section
from app.models.constraint import Constraint
from app.models.timetable_version import TimetableVersion
from app.models.timetable_slot import TimetableSlot
from app.models.audit_log import AuditLog

client = TestClient(app)

def setup_function():
    """Clear database tables before each test in dependency-respecting order."""
    db = SessionLocal()
    try:
        db.query(TimetableSlot).delete()
        db.query(TimetableVersion).delete()
        db.query(AuditLog).delete()
        db.query(Constraint).delete()
        db.query(Teacher).delete()
        db.query(Room).delete()
        db.query(Subject).delete()
        db.query(Section).delete()
        db.query(Profile).delete()
        db.query(Organization).delete()
        db.commit()
    finally:
        db.close()

def get_auth_headers(user_id: str) -> dict:
    """Helper to encode a valid JWT matching the test payload."""
    payload = {
        "sub": user_id,
        "aud": "authenticated",
        "role": "authenticated"
    }
    token = jwt.encode(payload, "dummy-secret-key-for-tests", algorithm="HS256")
    return {"Authorization": f"Bearer {token}"}

def create_test_user(org_name: str = "Test Org", role: str = "org_admin") -> tuple[str, str, dict]:
    """Helper to seed a test org and user profile, returning org_id, user_id, and auth headers."""
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
            full_name=f"Test User {role}"
        )
        db.add(profile)
        db.commit()
        
        headers = get_auth_headers(user_id)
        return str(org.id), user_id, headers
    finally:
        db.close()

def test_export_formats_and_rbac():
    # 1. Setup Admin & Viewer in same org
    org_id, admin_id, admin_headers = create_test_user("Export Univ", "org_admin")
    
    db = SessionLocal()
    try:
        viewer_id = str(uuid.uuid4())
        profile = Profile(
            id=uuid.UUID(viewer_id),
            organization_id=uuid.UUID(org_id),
            role="viewer",
            full_name="Test User viewer"
        )
        db.add(profile)
        db.commit()
    finally:
        db.close()
        
    viewer_headers = get_auth_headers(viewer_id)

    # 2. Seed minimum required resources
    client.post("/teachers/", json={"organization_id": org_id, "name": "T1"}, headers=admin_headers)
    client.post("/rooms/", json={"organization_id": org_id, "name": "R1", "capacity": 40, "type": "lecture"}, headers=admin_headers)
    client.post("/subjects/", json={"organization_id": org_id, "name": "S1", "weekly_hours": 2}, headers=admin_headers)
    client.post("/sections/", json={"organization_id": org_id, "name": "Sec1", "size": 30}, headers=admin_headers)

    # 3. Generate Timetable version (defaults to status="draft")
    gen_res = client.post("/timetables/generate", json={"organization_id": org_id}, headers=admin_headers)
    assert gen_res.status_code == 200
    version_id = gen_res.json()["id"]

    # 4. Try to export as Admin (formats: pdf, xlsx, csv) - should succeed
    for fmt in ["pdf", "xlsx", "csv"]:
        exp_res = client.get(f"/timetables/{version_id}/export?format={fmt}", headers=admin_headers)
        assert exp_res.status_code == 200
        url = exp_res.json()["url"]
        assert "/static/exports/" in url or "supabase" in url
        
        # Verify download locally if it is static file URL
        if "/static/exports/" in url:
            relative_url = url.replace("http://localhost:8000", "")
            dl_res = client.get(relative_url)
            assert dl_res.status_code == 200
            assert len(dl_res.content) > 0

    # 5. Try to export draft version as Viewer - should return 403
    v_exp_res = client.get(f"/timetables/{version_id}/export?format=pdf", headers=viewer_headers)
    assert v_exp_res.status_code == 403

    # 6. Publish the timetable
    pub_res = client.post(f"/timetables/{version_id}/publish", headers=admin_headers)
    assert pub_res.status_code == 200

    # 7. Try to export published version as Viewer - should now succeed
    v_exp_res = client.get(f"/timetables/{version_id}/export?format=pdf", headers=viewer_headers)
    assert v_exp_res.status_code == 200
    assert "url" in v_exp_res.json()
