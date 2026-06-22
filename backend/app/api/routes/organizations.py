import uuid
from fastapi import APIRouter, HTTPException
from app.schemas.organization import Organization, OrganizationCreate
from app.core.db_memory import db

router = APIRouter()

@router.post("/", response_model=Organization, status_code=201)
def create_organization(payload: OrganizationCreate):
    org_id = str(uuid.uuid4())
    org_data = {"id": org_id, "name": payload.name}
    with db.lock:
        db.organizations[org_id] = org_data
    return org_data

@router.get("/", response_model=list[Organization])
def list_organizations():
    with db.lock:
        return list(db.organizations.values())

@router.get("/{org_id}", response_model=Organization)
def get_organization(org_id: str):
    with db.lock:
        org = db.organizations.get(org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org
