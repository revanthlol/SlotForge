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
from app.models.schedule_run import ScheduleRun
from app.models.schedule_version import ScheduleVersion
from app.models.workspace import SchedulingWorkspace
from app.models.assignment import Assignment, AssignmentLocation

client = TestClient(app)

def setup_function():
    db = SessionLocal()
    try:
        db.query(AssignmentLocation).delete()
        db.query(Assignment).delete()
        db.query(ScheduleRun).delete()
        db.query(ScheduleVersion).delete()
        db.query(Constraint).delete()
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
        "role": "authenticated"
    }
    token = jwt.encode(payload, "dummy-secret-key-for-tests", algorithm="HS256")
    return {"Authorization": f"Bearer {token}"}

def test_section_room_split_end_to_end():
    db = SessionLocal()
    try:
        org = Organization(name="Split Test University")
        db.add(org)
        db.flush()
        
        user_id = str(uuid.uuid4())
        profile = Profile(
            id=uuid.UUID(user_id),
            organization_id=org.id,
            role="org_admin",
            full_name="Test User"
        )
        db.add(profile)
        db.commit()
        
        headers = get_auth_headers(user_id)
        org_id = str(org.id)
        
        client.post("/teachers/", json={"organization_id": org_id, "name": "Teacher 1"}, headers=headers)
        
        workspace = db.query(SchedulingWorkspace).filter(SchedulingWorkspace.organization_id == org.id).first()
        assert workspace is not None
        ws_id = str(workspace.id)
        
        client.post("/rooms/", json={"organization_id": org_id, "name": "Room 1", "capacity": 60, "type": "classroom"}, headers=headers)
        client.post("/rooms/", json={"organization_id": org_id, "name": "Room 2", "capacity": 80, "type": "classroom"}, headers=headers)
        
        client.post("/subjects/", json={"organization_id": org_id, "name": "Subject 1", "weekly_hours": 2}, headers=headers)
        
        client.post("/sections/", json={"organization_id": org_id, "name": "Section 1", "size": 120}, headers=headers)
        
        response = client.get(f"/api/v1/workspaces/{ws_id}/presets/academic/config", headers=headers)
        assert response.status_code == 200
        config_data = response.json()
        assert config_data["preset_key"] == "academic"
        assert "section_room_split_capacity" in config_data["default_constraints"]
        
        response = client.post(f"/api/v1/workspaces/{ws_id}/schedule-runs/", headers=headers)
        assert response.status_code == 200
        run_data = response.json()
        assert run_data["status"] == "success"
        run_id = run_data["run_id"]
        
        run = db.query(ScheduleRun).filter(ScheduleRun.id == uuid.UUID(run_id)).first()
        assert run is not None
        assert run.status == "success"
        assert run.schedule_version_id is not None
        
        response = client.get(f"/api/v1/workspaces/{ws_id}/schedule-runs/{run_id}/timetable", headers=headers)
        assert response.status_code == 200
        timetable_data = response.json()
        assert len(timetable_data["assignments"]) == 2
        
        for assignment in timetable_data["assignments"]:
            assert "room_assignments" in assignment
            room_assigns = assignment["room_assignments"]
            assert len(room_assigns) == 2
            
            total_students = sum(ra["student_count"] for ra in room_assigns)
            assert total_students == 120
            
            assert room_assigns[0]["sub_group"] == "Section 1_1"
            assert room_assigns[1]["sub_group"] == "Section 1_2"
            
            assert room_assigns[0]["capacity_contribution"] is not None
            assert room_assigns[1]["capacity_contribution"] is not None
            
        teacher = db.query(Teacher).filter(Teacher.organization_id == org.id).first()
        t_id = str(teacher.id)
        response = client.get(f"/api/v1/workspaces/{ws_id}/schedule-runs/{run_id}/faculty/{t_id}/timetable", headers=headers)
        assert response.status_code == 200
        faculty_timetable = response.json()
        assert len(faculty_timetable) == 2
        
    finally:
        db.close()
