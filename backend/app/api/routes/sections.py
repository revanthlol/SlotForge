import uuid
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from app.schemas.section import Section, SectionCreate, SectionUpdate
from app.core.db_memory import db

router = APIRouter()

@router.post("/", response_model=Section, status_code=201)
def create_section(payload: SectionCreate):
    with db.lock:
        if payload.organization_id not in db.organizations:
            raise HTTPException(status_code=400, detail="Invalid organization_id")
        
        section_id = str(uuid.uuid4())
        section_data = {
            "id": section_id,
            "organization_id": payload.organization_id,
            "name": payload.name,
            "size": payload.size
        }
        db.sections[section_id] = section_data
    return section_data

@router.get("/", response_model=list[Section])
def list_sections(organization_id: Optional[str] = Query(None)):
    with db.lock:
        sections = list(db.sections.values())
    if organization_id:
        sections = [s for s in sections if s["organization_id"] == organization_id]
    return sections

@router.get("/{section_id}", response_model=Section)
def get_section(section_id: str):
    with db.lock:
        section = db.sections.get(section_id)
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    return section

@router.put("/{section_id}", response_model=Section)
def update_section(section_id: str, payload: SectionUpdate):
    with db.lock:
        section = db.sections.get(section_id)
        if not section:
            raise HTTPException(status_code=404, detail="Section not found")
        
        if payload.name is not None:
            section["name"] = payload.name
        if payload.size is not None:
            section["size"] = payload.size
    return section

@router.delete("/{section_id}", status_code=204)
def delete_section(section_id: str):
    with db.lock:
        if section_id not in db.sections:
            raise HTTPException(status_code=404, detail="Section not found")
        del db.sections[section_id]
    return
