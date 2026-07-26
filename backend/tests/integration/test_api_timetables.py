import uuid
import jwt
from fastapi.testclient import TestClient

from app.main import app
from app.core.db import SessionLocal
from app.models.organization import Organization
from app.models.organization_membership import OrganizationMembership
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

def test_signup_organization():
    # Verify new signup flow creates auth user stub, org, and profile
    payload = {
        "email": "test-admin@slotforge.com",
        "password": "securepassword123",
        "org_name": "New Institutional Org",
        "full_name": "Principal Skinner",
        "job_title": "Timetable coordinator",
    }
    response = client.post("/auth/signup-organization", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "organization_id" in data
    assert "user_id" in data
    assert data["email"] == "test-admin@slotforge.com"
    
    # Verify DB state
    db = SessionLocal()
    try:
        org = db.query(Organization).filter(Organization.id == uuid.UUID(data["organization_id"])).first()
        assert org is not None
        assert org.name == "New Institutional Org"
        
        profile = db.query(Profile).filter(Profile.id == uuid.UUID(data["user_id"])).first()
        assert profile is not None
        assert profile.role == "org_admin"
        assert profile.full_name == "Principal Skinner"
        assert profile.job_title == "Timetable coordinator"
    finally:
        db.close()


def test_profile_identity_can_be_updated_without_changing_access_role():
    _org_id, user_id, headers = create_test_user("Profile Org")

    response = client.patch(
        "/auth/me",
        json={"full_name": "Nora Planner", "job_title": "Academic registrar"},
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json()["full_name"] == "Nora Planner"
    assert response.json()["job_title"] == "Academic registrar"
    assert response.json()["role"] == "org_admin"

    db = SessionLocal()
    try:
        profile = db.query(Profile).filter(Profile.id == uuid.UUID(user_id)).one()
        assert profile.full_name == "Nora Planner"
        assert profile.job_title == "Academic registrar"
        assert profile.role == "org_admin"
    finally:
        db.close()


def test_authenticated_user_without_profile_can_complete_account():
    user_id = str(uuid.uuid4())
    token = jwt.encode(
        {
            "sub": user_id,
            "aud": "authenticated",
            "email": "oauth-admin@example.edu",
            "user_metadata": {
                "full_name": "OAuth Administrator",
                # User-controlled auth metadata must never grant application access.
                "role": "viewer",
            },
        },
        "dummy-secret-key-for-tests",
        algorithm="HS256",
    )
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post(
        "/auth/complete-account",
        json={
            "org_name": "OAuth University",
            "full_name": "OAuth Administrator",
            "job_title": "Academic registrar",
        },
        headers=headers,
    )

    assert response.status_code == 201
    assert response.json() == {
        "user_id": user_id,
        "organization_id": response.json()["organization_id"],
        "role": "org_admin",
        "full_name": "OAuth Administrator",
        "job_title": "Academic registrar",
    }

    db = SessionLocal()
    try:
        profile = db.query(Profile).filter(Profile.id == uuid.UUID(user_id)).one()
        organization = db.query(Organization).filter(Organization.id == profile.organization_id).one()
        membership = db.query(OrganizationMembership).filter(
            OrganizationMembership.user_id == profile.id,
            OrganizationMembership.organization_id == organization.id,
        ).one()
        assert organization.name == "OAuth University"
        assert membership.role == "org_admin"
        assert profile.role == "org_admin"
    finally:
        db.close()


def test_complete_account_is_idempotent_for_an_existing_profile():
    org_id, user_id, headers = create_test_user("Existing University")

    first = client.post(
        "/auth/complete-account",
        json={
            "org_name": "Should Not Be Created",
            "full_name": "Changed Name",
            "job_title": "Department head",
        },
        headers=headers,
    )
    second = client.post(
        "/auth/complete-account",
        json={
            "org_name": "Also Should Not Be Created",
            "full_name": "Another Name",
            "job_title": "Faculty member",
        },
        headers=headers,
    )

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["organization_id"] == org_id
    assert second.json()["organization_id"] == org_id

    db = SessionLocal()
    try:
        assert db.query(Organization).filter(
            Organization.name.in_(["Should Not Be Created", "Also Should Not Be Created"])
        ).count() == 0
        assert db.query(Profile).filter(Profile.id == uuid.UUID(user_id)).count() == 1
        assert db.query(OrganizationMembership).filter(
            OrganizationMembership.user_id == uuid.UUID(user_id),
            OrganizationMembership.organization_id == uuid.UUID(org_id),
        ).count() == 1
    finally:
        db.close()

def test_organization_get():
    org_id, user_id, headers = create_test_user("Skinner Org")
    
    # Get Single
    response = client.get(f"/organizations/{org_id}", headers=headers)
    assert response.status_code == 200
    assert response.json()["name"] == "Skinner Org"
    
    # Get list
    response = client.get("/organizations/", headers=headers)
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["id"] == org_id

def test_teacher_crud():
    org_id, user_id, headers = create_test_user("Teacher School")
    
    # Create Teacher
    response = client.post(
        "/teachers/",
        json={"organization_id": org_id, "name": "Teacher A"},
        headers=headers
    )
    assert response.status_code == 201
    teacher_data = response.json()
    assert "id" in teacher_data
    teacher_id = teacher_data["id"]
    
    # Get Single
    response = client.get(f"/teachers/{teacher_id}", headers=headers)
    assert response.status_code == 200
    assert response.json()["name"] == "Teacher A"
    
    # Update
    response = client.put(f"/teachers/{teacher_id}", json={"name": "Teacher A Updated"}, headers=headers)
    assert response.status_code == 200
    assert response.json()["name"] == "Teacher A Updated"
    
    # List
    response = client.get("/teachers/", headers=headers)
    assert response.status_code == 200
    assert len(response.json()) == 1
    
    # Delete
    response = client.delete(f"/teachers/{teacher_id}", headers=headers)
    assert response.status_code == 204
    
    # Verify Deleted
    response = client.get(f"/teachers/{teacher_id}", headers=headers)
    assert response.status_code == 404

def test_timetable_generate_infeasible_empty_org_has_nullable_id():
    org_id, user_id, headers = create_test_user("Empty Timetable University")
    client.post("/subjects/", json={"organization_id": org_id, "name": "Subject 1", "weekly_hours": 1}, headers=headers)
    client.post("/sections/", json={"organization_id": org_id, "name": "Section 1", "size": 30}, headers=headers)

    gen_res = client.post("/timetables/generate", json={"organization_id": org_id}, headers=headers)
    assert gen_res.status_code == 200
    gen_data = gen_res.json()
    assert gen_data["id"] is None
    assert gen_data["version_id"] is None
    assert gen_data["status"] == "INFEASIBLE"
    assert gen_data["assignments"] == []
    assert gen_data["infeasible_reason"]

def test_timetable_generate_uses_configured_fixed_weekday_cycle_length():
    org_id, user_id, headers = create_test_user("Six Day University")

    client.patch(
        f"/organizations/{org_id}",
        json={"scheduling_mode": "fixed_weekday", "cycle_length": 6, "periods_per_day": 5},
        headers=headers,
    )
    client.post("/teachers/", json={"organization_id": org_id, "name": "Teacher 1"}, headers=headers)
    client.post("/rooms/", json={"organization_id": org_id, "name": "Room 1", "capacity": 40, "type": "lecture"}, headers=headers)
    client.post("/sections/", json={"organization_id": org_id, "name": "Section 1", "size": 30}, headers=headers)
    for index in range(1, 6):
        client.post(
            "/subjects/",
            json={"organization_id": org_id, "name": f"Subject {index}", "weekly_hours": 6},
            headers=headers,
        )

    gen_res = client.post("/timetables/generate", json={"organization_id": org_id}, headers=headers)
    assert gen_res.status_code == 200
    gen_data = gen_res.json()
    assert gen_data["status"] in ("OPTIMAL", "FEASIBLE")
    assert len(gen_data["assignments"]) == 30
    assert any(slot["day"] == "Sat" for slot in gen_data["assignments"])

def test_timetable_generate_success():
    # 1. Create Organization and Admin User
    org_id, user_id, headers = create_test_user("Timetable University")
    
    # 2. Create Teachers
    client.post("/teachers/", json={"organization_id": org_id, "name": "Teacher 1"}, headers=headers)
    client.post("/teachers/", json={"organization_id": org_id, "name": "Teacher 2"}, headers=headers)
    
    # 3. Create Room
    client.post("/rooms/", json={"organization_id": org_id, "name": "Room 1", "capacity": 40, "type": "lecture"}, headers=headers)
    
    # 4. Create Subjects
    client.post("/subjects/", json={"organization_id": org_id, "name": "Subject 1", "weekly_hours": 4}, headers=headers)
    client.post("/subjects/", json={"organization_id": org_id, "name": "Subject 2", "weekly_hours": 3}, headers=headers)
    
    # 5. Create Section
    client.post("/sections/", json={"organization_id": org_id, "name": "Section 1", "size": 30}, headers=headers)
    
    # 6. Generate Timetable
    gen_res = client.post("/timetables/generate", json={"organization_id": org_id}, headers=headers)
    assert gen_res.status_code == 200
    gen_data = gen_res.json()
    assert "id" in gen_data
    assert gen_data["status"] in ("OPTIMAL", "FEASIBLE")
    assert len(gen_data["assignments"]) == 7
    timetable_id = gen_data["id"]
    
    # 7. Get Timetable
    get_res = client.get(f"/timetables/{timetable_id}", headers=headers)
    assert get_res.status_code == 200
    get_data = get_res.json()
    assert get_data["id"] == timetable_id
    assert get_data["status"] in ("OPTIMAL", "FEASIBLE", "draft", "published", "archived")
    assert len(get_data["assignments"]) == 7
