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
            full_name="Test User"
        )
        db.add(profile)
        db.commit()
        
        headers = get_auth_headers(user_id)
        return str(org.id), user_id, headers
    finally:
        db.close()

def test_multi_tenancy_isolation():
    # 1. Create Org A and Org B
    org_a_id, user_a_id, headers_a = create_test_user("Org A")
    org_b_id, user_b_id, headers_b = create_test_user("Org B")

    # 2. Create a Teacher in Org A
    create_res = client.post(
        "/teachers/",
        json={"organization_id": org_a_id, "name": "Org A Teacher"},
        headers=headers_a
    )
    assert create_res.status_code == 201
    teacher_data = create_res.json()
    teacher_id = teacher_data["id"]

    # 3. Verify Org B's JWT cannot read Org A's teacher (should return 404)
    get_res = client.get(f"/teachers/{teacher_id}", headers=headers_b)
    assert get_res.status_code == 404

    # 4. Verify Org B's JWT cannot update Org A's teacher (should return 404)
    put_res = client.put(f"/teachers/{teacher_id}", json={"name": "Hacked Name"}, headers=headers_b)
    assert put_res.status_code == 404

    # 5. Verify Org B's JWT cannot delete Org A's teacher (should return 404)
    del_res = client.delete(f"/teachers/{teacher_id}", headers=headers_b)
    assert del_res.status_code == 404

    # 6. Verify Org B's JWT cannot generate timetables for Org A
    gen_res = client.post(
        "/timetables/generate",
        json={"organization_id": org_a_id},
        headers=headers_b
    )
    assert gen_res.status_code == 403  # Forbidden
