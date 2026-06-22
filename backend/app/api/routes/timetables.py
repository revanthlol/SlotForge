from fastapi import APIRouter, HTTPException
from app.schemas.timetable import TimetableGenerateRequest, TimetableResponse
from app.services.timetable_service import TimetableService

router = APIRouter()

@router.post("/generate", response_model=TimetableResponse)
def generate_timetable(payload: TimetableGenerateRequest):
    result = TimetableService.generate_timetable(payload.organization_id)
    if not result:
        raise HTTPException(status_code=400, detail="Invalid organization_id or organization not found")
    return result

@router.get("/{timetable_id}", response_model=TimetableResponse)
def get_timetable(timetable_id: str):
    result = TimetableService.get_timetable(timetable_id)
    if not result:
        raise HTTPException(status_code=404, detail="Timetable not found")
    return result
