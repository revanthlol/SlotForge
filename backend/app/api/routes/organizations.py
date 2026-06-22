import uuid
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.schemas.organization import Organization as OrgSchema
from app.models.organization import Organization as OrgModel
from app.core.db import get_db
from app.core.auth import get_current_user_profile
from app.models.profile import Profile

router = APIRouter()

@router.get("/", response_model=list[OrgSchema])
def list_organizations(current_user: Profile = Depends(get_current_user_profile), db: Session = Depends(get_db)):
    org = db.query(OrgModel).filter(OrgModel.id == current_user.organization_id).first()
    if not org:
        return []
    return [OrgSchema(id=str(org.id), name=org.name)]

@router.get("/{org_id}", response_model=OrgSchema)
def get_organization(org_id: str, current_user: Profile = Depends(get_current_user_profile), db: Session = Depends(get_db)):
    if str(current_user.organization_id) != org_id:
        raise HTTPException(status_code=403, detail="Forbidden: You do not belong to this organization")
    org = db.query(OrgModel).filter(OrgModel.id == current_user.organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return OrgSchema(id=str(org.id), name=org.name)

