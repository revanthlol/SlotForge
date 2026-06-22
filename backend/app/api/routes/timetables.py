import uuid
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.schemas.timetable import TimetableGenerateRequest, TimetableResponse
from app.services.timetable_service import TimetableService
from app.core.db import get_db
from app.core.auth import get_current_user_profile
from app.models.profile import Profile

router = APIRouter()

@router.post("/generate", response_model=TimetableResponse)
def generate_timetable(
    payload: TimetableGenerateRequest,
    current_user: Profile = Depends(get_current_user_profile),
    db: Session = Depends(get_db)
):
    try:
        org_uuid = uuid.UUID(payload.organization_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid organization_id format")
        
    if org_uuid != current_user.organization_id:
        raise HTTPException(status_code=403, detail="Forbidden: You can only generate timetables for your own organization")
        
    result = TimetableService.generate_timetable(org_uuid, current_user.id, db)
    if not result:
        raise HTTPException(status_code=400, detail="Invalid organization_id or organization not found")
        
    return result

@router.get("/{timetable_id}", response_model=TimetableResponse)
def get_timetable(
    timetable_id: str,
    current_user: Profile = Depends(get_current_user_profile),
    db: Session = Depends(get_db)
):
    try:
        t_uuid = uuid.UUID(timetable_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Timetable not found")
        
    result = TimetableService.get_timetable(t_uuid, current_user.organization_id, db)
    if not result:
        raise HTTPException(status_code=404, detail="Timetable not found")
        
    return result
