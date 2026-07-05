import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import get_current_user_profile, require_org_admin
from app.core.db import get_db
from app.models.profile import Profile
from app.models.workspace import SchedulingWorkspace
from app.models.schedule_run import ScheduleRun
from app.models.assignment import Assignment as SlotModel
from app.services.timetable_service import TimetableService

router = APIRouter()

def _parse_uuid(value: str, label: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid {label}")

@router.get("/{id}/presets/academic/config")
def get_academic_preset_config(
    id: str,
    current_user: Profile = Depends(get_current_user_profile),
    db: Session = Depends(get_db)
):
    ws_uuid = _parse_uuid(id, "workspace_id")
    workspace = db.query(SchedulingWorkspace).filter(
        SchedulingWorkspace.id == ws_uuid,
        SchedulingWorkspace.organization_id == current_user.organization_id
    ).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    return {
        "preset_key": "academic",
        "name": "Academic Timetable",
        "resources": [
            { "type": "teacher", "label": "Teachers", "required": True },
            { "type": "room", "label": "Classrooms", "required": True },
            { "type": "lab", "label": "Labs", "required": False }
        ],
        "tasks": [
            { "type": "subject", "label": "Subjects", "required": True }
        ],
        "groups": [
            { "type": "section", "label": "Sections", "required": True }
        ],
        "locations": [
            { "type": "classroom", "label": "Rooms" },
            { "type": "lab", "label": "Labs" }
        ],
        "time_unit": "periods",
        "default_constraints": [
            "no_teacher_double_booking",
            "no_room_double_booking",
            "weekly_subject_hours",
            "lab_continuous_slots",
            "section_room_split_capacity"
        ]
    }

@router.post("/{id}/schedule-runs/")
def trigger_schedule_run(
    id: str,
    current_user: Profile = Depends(require_org_admin),
    db: Session = Depends(get_db)
):
    ws_uuid = _parse_uuid(id, "workspace_id")
    workspace = db.query(SchedulingWorkspace).filter(
        SchedulingWorkspace.id == ws_uuid,
        SchedulingWorkspace.organization_id == current_user.organization_id
    ).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    result = TimetableService.generate_timetable_for_workspace(ws_uuid, current_user.id, db)
    if not result:
        raise HTTPException(status_code=400, detail="Solve failed or invalid workspace")
        
    return result

@router.get("/{id}/schedule-runs/{run_id}/assignments")
def get_run_assignments(
    id: str,
    run_id: str,
    current_user: Profile = Depends(get_current_user_profile),
    db: Session = Depends(get_db)
):
    ws_uuid = _parse_uuid(id, "workspace_id")
    run_uuid = _parse_uuid(run_id, "run_id")
    
    workspace = db.query(SchedulingWorkspace).filter(
        SchedulingWorkspace.id == ws_uuid,
        SchedulingWorkspace.organization_id == current_user.organization_id
    ).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    run = db.query(ScheduleRun).filter(
        ScheduleRun.id == run_uuid,
        ScheduleRun.workspace_id == ws_uuid
    ).first()
    if not run:
        raise HTTPException(status_code=404, detail="Schedule run not found")
        
    if not run.schedule_version_id:
        return []
        
    slots = db.query(SlotModel).filter(SlotModel.schedule_version_id == run.schedule_version_id).all()
    return [TimetableService._slot_schema(sc) for sc in slots]

@router.get("/{id}/schedule-runs/{run_id}/timetable")
def get_run_timetable(
    id: str,
    run_id: str,
    current_user: Profile = Depends(get_current_user_profile),
    db: Session = Depends(get_db)
):
    ws_uuid = _parse_uuid(id, "workspace_id")
    run_uuid = _parse_uuid(run_id, "run_id")
    
    workspace = db.query(SchedulingWorkspace).filter(
        SchedulingWorkspace.id == ws_uuid,
        SchedulingWorkspace.organization_id == current_user.organization_id
    ).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    run = db.query(ScheduleRun).filter(
        ScheduleRun.id == run_uuid,
        ScheduleRun.workspace_id == ws_uuid
    ).first()
    if not run:
        raise HTTPException(status_code=404, detail="Schedule run not found")
        
    if not run.schedule_version_id:
        return {
            "workspace_id": str(ws_uuid),
            "schedule_version_id": None,
            "assignments": []
        }
        
    slots = db.query(SlotModel).filter(SlotModel.schedule_version_id == run.schedule_version_id).all()
    assignments = [TimetableService._slot_schema(sc) for sc in slots]
    
    return {
        "workspace_id": str(ws_uuid),
        "schedule_version_id": str(run.schedule_version_id),
        "assignments": assignments
    }

@router.get("/{id}/schedule-runs/{run_id}/faculty/{resource_id}/timetable")
def get_run_faculty_timetable(
    id: str,
    run_id: str,
    resource_id: str,
    current_user: Profile = Depends(get_current_user_profile),
    db: Session = Depends(get_db)
):
    ws_uuid = _parse_uuid(id, "workspace_id")
    run_uuid = _parse_uuid(run_id, "run_id")
    res_uuid = _parse_uuid(resource_id, "resource_id")
    
    workspace = db.query(SchedulingWorkspace).filter(
        SchedulingWorkspace.id == ws_uuid,
        SchedulingWorkspace.organization_id == current_user.organization_id
    ).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    run = db.query(ScheduleRun).filter(
        ScheduleRun.id == run_uuid,
        ScheduleRun.workspace_id == ws_uuid
    ).first()
    if not run:
        raise HTTPException(status_code=404, detail="Schedule run not found")
        
    if not run.schedule_version_id:
        return []
        
    from app.models.assignment import AssignmentResource
    slots = db.query(SlotModel).join(AssignmentResource, SlotModel.id == AssignmentResource.assignment_id).filter(
        SlotModel.schedule_version_id == run.schedule_version_id,
        AssignmentResource.resource_id == res_uuid
    ).all()
    
    return [TimetableService._slot_schema(sc) for sc in slots]
