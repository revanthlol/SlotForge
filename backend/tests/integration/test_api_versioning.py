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

def test_rbac_viewer_blocked():
    # 1. Create admin and viewer users in same org
    org_id, admin_id, admin_headers = create_test_user("RBAC Univ", "org_admin")
    
    # Add viewer to same organization
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

    # 2. Check viewer gets 403 on POST /teachers/
    res = client.post("/teachers/", json={"organization_id": org_id, "name": "Teacher V"}, headers=viewer_headers)
    assert res.status_code == 403

    # 3. Create teacher using admin so we have an ID to test PUT/DELETE
    res = client.post("/teachers/", json={"organization_id": org_id, "name": "Teacher A"}, headers=admin_headers)
    assert res.status_code == 201
    teacher_id = res.json()["id"]

    # 4. Check viewer gets 403 on PUT /teachers/{id}
    res = client.put(f"/teachers/{teacher_id}", json={"name": "Viewer Hack"}, headers=viewer_headers)
    assert res.status_code == 403

    # 5. Check viewer gets 403 on DELETE /teachers/{id}
    res = client.delete(f"/teachers/{teacher_id}", headers=viewer_headers)
    assert res.status_code == 403

    # 6. Check viewer gets 403 on POST /timetables/generate
    res = client.post("/timetables/generate", json={"organization_id": org_id}, headers=viewer_headers)
    assert res.status_code == 403

def test_audit_log_generation():
    # 1. Create org and admin
    org_id, admin_id, admin_headers = create_test_user("Audit College", "org_admin")

    # 2. Create teacher
    res = client.post("/teachers/", json={"organization_id": org_id, "name": "Audit Teacher"}, headers=admin_headers)
    assert res.status_code == 201
    teacher_id = res.json()["id"]

    # 3. Verify audit log has "teacher.create"
    db = SessionLocal()
    try:
        log = db.query(AuditLog).filter(
            AuditLog.organization_id == uuid.UUID(org_id),
            AuditLog.action == "teacher.create"
        ).first()
        assert log is not None
        assert log.actor_id == uuid.UUID(admin_id)
        assert log.target_table == "teachers"
        assert log.target_id == uuid.UUID(teacher_id)
        assert log.diff == {"new_values": {"name": "Audit Teacher"}}
    finally:
        db.close()

    # 4. Delete teacher
    res = client.delete(f"/teachers/{teacher_id}", headers=admin_headers)
    assert res.status_code == 204

    # 5. Verify audit log has "teacher.delete"
    db = SessionLocal()
    try:
        log = db.query(AuditLog).filter(
            AuditLog.organization_id == uuid.UUID(org_id),
            AuditLog.action == "teacher.delete"
        ).first()
        assert log is not None
        assert log.actor_id == uuid.UUID(admin_id)
        assert log.target_table == "teachers"
        assert log.target_id == uuid.UUID(teacher_id)
        assert log.diff == {"old_values": {"name": "Audit Teacher"}}
    finally:
        db.close()

def test_versioning_and_publish_rollback():
    # 1. Setup organization, admin, and seed state
    org_id, admin_id, admin_headers = create_test_user("Version State School", "org_admin")
    
    client.post("/teachers/", json={"organization_id": org_id, "name": "T1"}, headers=admin_headers)
    client.post("/rooms/", json={"organization_id": org_id, "name": "R1", "capacity": 40, "type": "lecture"}, headers=admin_headers)
    client.post("/subjects/", json={"organization_id": org_id, "name": "S1", "weekly_hours": 2}, headers=admin_headers)
    client.post("/sections/", json={"organization_id": org_id, "name": "Sec1", "size": 30}, headers=admin_headers)

    # 2. Generate 3 times
    res1 = client.post("/timetables/generate", json={"organization_id": org_id}, headers=admin_headers)
    res2 = client.post("/timetables/generate", json={"organization_id": org_id}, headers=admin_headers)
    res3 = client.post("/timetables/generate", json={"organization_id": org_id}, headers=admin_headers)
    
    assert res1.status_code == 200
    assert res2.status_code == 200
    assert res3.status_code == 200
    
    v1_id = res1.json()["id"]
    v2_id = res2.json()["id"]
    v3_id = res3.json()["id"]

    # Verify version list contains all 3 versions, sorted desc
    v_list_res = client.get("/timetables/versions", headers=admin_headers)
    assert v_list_res.status_code == 200
    versions_data = v_list_res.json()
    assert len(versions_data) == 3
    assert versions_data[0]["id"] == v3_id
    assert versions_data[0]["version_number"] == 3
    assert versions_data[0]["status"] == "draft"
    assert versions_data[1]["version_number"] == 2
    assert versions_data[2]["version_number"] == 1

    # 3. Publish v2
    pub_res = client.post(f"/timetables/{v2_id}/publish", headers=admin_headers)
    assert pub_res.status_code == 200
    assert pub_res.json()["status"] == "published"

    # Verify DB: v2 is published, others are drafts
    db = SessionLocal()
    try:
        v2 = db.query(TimetableVersion).filter(TimetableVersion.id == uuid.UUID(v2_id)).one()
        assert v2.status == "published"
        
        v1 = db.query(TimetableVersion).filter(TimetableVersion.id == uuid.UUID(v1_id)).one()
        assert v1.status == "draft"
        
        v3 = db.query(TimetableVersion).filter(TimetableVersion.id == uuid.UUID(v3_id)).one()
        assert v3.status == "draft"
    finally:
        db.close()

    # 4. Publish v3
    pub_res = client.post(f"/timetables/{v3_id}/publish", headers=admin_headers)
    assert pub_res.status_code == 200
    assert pub_res.json()["status"] == "published"

    # Verify DB: v3 is published, v2 is demoted to archived
    db = SessionLocal()
    try:
        v3 = db.query(TimetableVersion).filter(TimetableVersion.id == uuid.UUID(v3_id)).one()
        assert v3.status == "published"
        
        v2 = db.query(TimetableVersion).filter(TimetableVersion.id == uuid.UUID(v2_id)).one()
        assert v2.status == "archived"
    finally:
        db.close()

    # 5. Rollback to v2 (should clone v2's slots into a new v4 and make v4 published)
    roll_res = client.post(f"/timetables/{v2_id}/rollback", headers=admin_headers)
    assert roll_res.status_code == 200
    v4_data = roll_res.json()
    assert v4_data["version_number"] == 4
    assert v4_data["status"] == "published"
    v4_id = v4_data["id"]

    # Verify DB: v4 is published, v3 is demoted to archived, and v2 remains archived
    db = SessionLocal()
    try:
        v4 = db.query(TimetableVersion).filter(TimetableVersion.id == uuid.UUID(v4_id)).one()
        assert v4.status == "published"
        
        v3 = db.query(TimetableVersion).filter(TimetableVersion.id == uuid.UUID(v3_id)).one()
        assert v3.status == "archived"
        
        v2 = db.query(TimetableVersion).filter(TimetableVersion.id == uuid.UUID(v2_id)).one()
        assert v2.status == "archived"
        
        # Verify slots copied
        v2_slots_count = db.query(TimetableSlot).filter(TimetableSlot.timetable_version_id == uuid.UUID(v2_id)).count()
        v4_slots_count = db.query(TimetableSlot).filter(TimetableSlot.timetable_version_id == uuid.UUID(v4_id)).count()
        assert v2_slots_count == v4_slots_count
        assert v4_slots_count > 0
    finally:
        db.close()
