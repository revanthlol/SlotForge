import uuid
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from app.schemas.teacher import Teacher, TeacherCreate, TeacherUpdate
from app.core.db_memory import db

router = APIRouter()

@router.post("/", response_model=Teacher, status_code=201)
def create_teacher(payload: TeacherCreate):
    with db.lock:
        if payload.organization_id not in db.organizations:
            raise HTTPException(status_code=400, detail="Invalid organization_id")
        
        teacher_id = str(uuid.uuid4())
        teacher_data = {
            "id": teacher_id,
            "organization_id": payload.organization_id,
            "name": payload.name
        }
        db.teachers[teacher_id] = teacher_data
    return teacher_data

@router.get("/", response_model=list[Teacher])
def list_teachers(organization_id: Optional[str] = Query(None)):
    with db.lock:
        teachers = list(db.teachers.values())
    if organization_id:
        teachers = [t for t in teachers if t["organization_id"] == organization_id]
    return teachers

@router.get("/{teacher_id}", response_model=Teacher)
def get_teacher(teacher_id: str):
    with db.lock:
        teacher = db.teachers.get(teacher_id)
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    return teacher

@router.put("/{teacher_id}", response_model=Teacher)
def update_teacher(teacher_id: str, payload: TeacherUpdate):
    with db.lock:
        teacher = db.teachers.get(teacher_id)
        if not teacher:
            raise HTTPException(status_code=404, detail="Teacher not found")
        
        if payload.name is not None:
            teacher["name"] = payload.name
    return teacher

@router.delete("/{teacher_id}", status_code=204)
def delete_teacher(teacher_id: str):
    with db.lock:
        if teacher_id not in db.teachers:
            raise HTTPException(status_code=404, detail="Teacher not found")
        del db.teachers[teacher_id]
    return
