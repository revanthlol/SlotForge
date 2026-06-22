import uuid
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from app.schemas.subject import Subject, SubjectCreate, SubjectUpdate
from app.core.db_memory import db

router = APIRouter()

@router.post("/", response_model=Subject, status_code=201)
def create_subject(payload: SubjectCreate):
    with db.lock:
        if payload.organization_id not in db.organizations:
            raise HTTPException(status_code=400, detail="Invalid organization_id")
        
        subject_id = str(uuid.uuid4())
        subject_data = {
            "id": subject_id,
            "organization_id": payload.organization_id,
            "name": payload.name,
            "weekly_hours": payload.weekly_hours
        }
        db.subjects[subject_id] = subject_data
    return subject_data

@router.get("/", response_model=list[Subject])
def list_subjects(organization_id: Optional[str] = Query(None)):
    with db.lock:
        subjects = list(db.subjects.values())
    if organization_id:
        subjects = [s for s in subjects if s["organization_id"] == organization_id]
    return subjects

@router.get("/{subject_id}", response_model=Subject)
def get_subject(subject_id: str):
    with db.lock:
        subject = db.subjects.get(subject_id)
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    return subject

@router.put("/{subject_id}", response_model=Subject)
def update_subject(subject_id: str, payload: SubjectUpdate):
    with db.lock:
        subject = db.subjects.get(subject_id)
        if not subject:
            raise HTTPException(status_code=404, detail="Subject not found")
        
        if payload.name is not None:
            subject["name"] = payload.name
        if payload.weekly_hours is not None:
            subject["weekly_hours"] = payload.weekly_hours
    return subject

@router.delete("/{subject_id}", status_code=204)
def delete_subject(subject_id: str):
    with db.lock:
        if subject_id not in db.subjects:
            raise HTTPException(status_code=404, detail="Subject not found")
        del db.subjects[subject_id]
    return
