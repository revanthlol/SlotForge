from fastapi.testclient import TestClient
from app.main import app
from app.core.db_memory import db

client = TestClient(app)

def setup_function():
    """Clear memory database before each test to ensure test isolation."""
    with db.lock:
        db.organizations.clear()
        db.teachers.clear()
        db.rooms.clear()
        db.subjects.clear()
        db.sections.clear()
        db.constraints.clear()
        db.timetables.clear()

def test_organization_crud():
    # Create
    response = client.post("/organizations/", json={"name": "Org A"})
    assert response.status_code == 201
    data = response.json()
    assert "id" in data
    assert data["name"] == "Org A"
    org_id = data["id"]
    
    # Get Single
    response = client.get(f"/organizations/{org_id}")
    assert response.status_code == 200
    assert response.json()["name"] == "Org A"
    
    # List
    response = client.get("/organizations/")
    assert response.status_code == 200
    assert len(response.json()) == 1

def test_teacher_crud():
    # Create Org
    org_response = client.post("/organizations/", json={"name": "Org A"})
    org_id = org_response.json()["id"]
    
    # Create Teacher
    response = client.post("/teachers/", json={"organization_id": org_id, "name": "Teacher A"})
    assert response.status_code == 201
    teacher_data = response.json()
    assert "id" in teacher_data
    teacher_id = teacher_data["id"]
    
    # Get Single
    response = client.get(f"/teachers/{teacher_id}")
    assert response.status_code == 200
    assert response.json()["name"] == "Teacher A"
    
    # Update
    response = client.put(f"/teachers/{teacher_id}", json={"name": "Teacher A Updated"})
    assert response.status_code == 200
    assert response.json()["name"] == "Teacher A Updated"
    
    # List filtered by org
    response = client.get(f"/teachers/?organization_id={org_id}")
    assert response.status_code == 200
    assert len(response.json()) == 1
    
    # Delete
    response = client.delete(f"/teachers/{teacher_id}")
    assert response.status_code == 204
    
    # Verify Deleted
    response = client.get(f"/teachers/{teacher_id}")
    assert response.status_code == 404

def test_timetable_generate_success():
    # 1. Create Organization
    org_res = client.post("/organizations/", json={"name": "Test Org"})
    org_id = org_res.json()["id"]
    
    # 2. Create Teachers
    t1_res = client.post("/teachers/", json={"organization_id": org_id, "name": "Teacher 1"})
    t2_res = client.post("/teachers/", json={"organization_id": org_id, "name": "Teacher 2"})
    t1_id = t1_res.json()["id"]
    t2_id = t2_res.json()["id"]
    
    # 3. Create Room (matching alias mapping)
    r1_res = client.post("/rooms/", json={"organization_id": org_id, "name": "Room 1", "capacity": 40, "type": "lecture"})
    assert r1_res.status_code == 201
    r1_id = r1_res.json()["id"]
    
    # 4. Create Subjects
    s1_res = client.post("/subjects/", json={"organization_id": org_id, "name": "Subject 1", "weekly_hours": 4})
    s2_res = client.post("/subjects/", json={"organization_id": org_id, "name": "Subject 2", "weekly_hours": 3})
    s1_id = s1_res.json()["id"]
    s2_id = s2_res.json()["id"]
    
    # 5. Create Section
    sec1_res = client.post("/sections/", json={"organization_id": org_id, "name": "Section 1", "size": 30})
    sec1_id = sec1_res.json()["id"]
    
    # 6. Generate Timetable
    gen_res = client.post("/timetables/generate", json={"organization_id": org_id})
    assert gen_res.status_code == 200
    gen_data = gen_res.json()
    assert "id" in gen_data
    assert gen_data["status"] in ("OPTIMAL", "FEASIBLE")
    assert len(gen_data["assignments"]) == 7
    timetable_id = gen_data["id"]
    
    # 7. Get Timetable
    get_res = client.get(f"/timetables/{timetable_id}")
    assert get_res.status_code == 200
    get_data = get_res.json()
    assert get_data["id"] == timetable_id
    assert get_data["status"] in ("OPTIMAL", "FEASIBLE")
    assert len(get_data["assignments"]) == 7
