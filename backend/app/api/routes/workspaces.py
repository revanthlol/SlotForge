import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import get_current_user_profile, require_org_admin
from app.core.db import get_db
from app.models.profile import Profile
from app.models.workspace import SchedulingWorkspace
from app.models.onboarding_progress import OnboardingProgress
from app.models.schedule_run import ScheduleRun
from app.models.assignment import Assignment as SlotModel
from app.models.resource import Resource
from app.models.task import Task
from app.models.group import Group
from app.models.location import Location
from app.models.teacher import Teacher
from app.models.subject import Subject
from app.models.section import Section
from app.models.room import Room
from app.schemas.onboarding import OnboardingProgressResponse, OnboardingProgressUpdate, PreflightCheckResponse, PreflightWarning
from app.schemas.workspace import WorkspaceResponse, WorkspaceUpdate
from app.services.timetable_service import TimetableService

router = APIRouter()


def _parse_uuid(value: str, label: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid {label}")


def _get_workspace_or_default(id: str, current_user: Profile, db: Session) -> SchedulingWorkspace:
    identifier = _parse_uuid(id, "workspace_id")
    workspace = db.query(SchedulingWorkspace).filter(
        SchedulingWorkspace.id == identifier,
        SchedulingWorkspace.organization_id == current_user.organization_id
    ).first()
    if workspace:
        return workspace

    # Compatibility guard: the current frontend only knows organization_id.
    # If that id is supplied, resume the org's first workspace or create the default one.
    if identifier == current_user.organization_id:
        workspace = db.query(SchedulingWorkspace).filter(
            SchedulingWorkspace.organization_id == current_user.organization_id
        ).first()
        if workspace:
            return workspace

        workspace = SchedulingWorkspace(
            organization_id=current_user.organization_id,
            name="Default Workspace",
            domain_preset="academic",
        )
        db.add(workspace)
        db.commit()
        db.refresh(workspace)
        return workspace

    raise HTTPException(status_code=404, detail="Workspace not found")


def _get_or_create_progress(workspace: SchedulingWorkspace, db: Session) -> OnboardingProgress:
    progress = db.query(OnboardingProgress).filter(
        OnboardingProgress.workspace_id == workspace.id,
        OnboardingProgress.organization_id == workspace.organization_id,
    ).first()
    if progress:
        return progress

    progress = OnboardingProgress(
        organization_id=workspace.organization_id,
        workspace_id=workspace.id,
        current_step=0,
        completed_steps=[],
        skipped=False,
    )
    db.add(progress)
    db.commit()
    db.refresh(progress)
    return progress


def _progress_schema(progress: OnboardingProgress) -> OnboardingProgressResponse:
    return OnboardingProgressResponse.model_validate(progress)


@router.get("/{id}/onboarding/progress", response_model=OnboardingProgressResponse)
def get_onboarding_progress(
    id: str,
    current_user: Profile = Depends(get_current_user_profile),
    db: Session = Depends(get_db),
):
    workspace = _get_workspace_or_default(id, current_user, db)
    progress = _get_or_create_progress(workspace, db)
    return _progress_schema(progress)


@router.put("/{id}/onboarding/progress", response_model=OnboardingProgressResponse)
def update_onboarding_progress(
    id: str,
    payload: OnboardingProgressUpdate,
    current_user: Profile = Depends(require_org_admin),
    db: Session = Depends(get_db),
):
    workspace = _get_workspace_or_default(id, current_user, db)
    progress = _get_or_create_progress(workspace, db)
    progress.current_step = payload.current_step
    progress.completed_steps = list(payload.completed_steps)
    progress.skipped = payload.skipped
    progress.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(progress)
    return _progress_schema(progress)


@router.post("/{id}/preflight-check", response_model=PreflightCheckResponse)
def run_preflight_check(
    id: str,
    current_user: Profile = Depends(get_current_user_profile),
    db: Session = Depends(get_db),
):
    workspace = _get_workspace_or_default(id, current_user, db)

    generic_resources = db.query(Resource).filter(Resource.workspace_id == workspace.id).count()
    generic_tasks = db.query(Task).filter(Task.workspace_id == workspace.id).count()
    generic_groups = db.query(Group).filter(Group.workspace_id == workspace.id).count()
    generic_locations = db.query(Location).filter(Location.workspace_id == workspace.id).all()

    # Academic compatibility: legacy resources are still the active UI data model.
    teachers = db.query(Teacher).filter(Teacher.organization_id == workspace.organization_id).count()
    subjects = db.query(Subject).filter(Subject.organization_id == workspace.organization_id).count()
    sections = db.query(Section).filter(Section.organization_id == workspace.organization_id).all()
    rooms = db.query(Room).filter(Room.organization_id == workspace.organization_id).all()

    resource_count = max(generic_resources, teachers)
    task_count = max(generic_tasks, subjects)
    group_count = max(generic_groups, len(sections))
    location_count = max(len(generic_locations), len(rooms))
    max_capacity = max(
        [location.capacity for location in generic_locations] + [room.capacity for room in rooms],
        default=0,
    )

    warnings: list[PreflightWarning] = []
    if resource_count == 0:
        warnings.append(PreflightWarning(type="resources", severity="error", message="Add at least one resource before generating."))
    if task_count == 0:
        warnings.append(PreflightWarning(type="tasks", severity="error", message="Add at least one task before generating."))
    if group_count == 0:
        warnings.append(PreflightWarning(type="groups", severity="warning", message="No groups are defined yet."))
    if location_count == 0:
        warnings.append(PreflightWarning(type="locations", severity="warning", message="No locations are available for assignment."))
    if max_capacity and any(section.size > max_capacity for section in sections):
        warnings.append(PreflightWarning(type="capacity", severity="warning", message="At least one section is larger than the largest room. Enable room split or add a larger room."))

    if not warnings:
        warnings.append(PreflightWarning(type="ready", severity="info", message="No obvious setup blockers found."))

    feasible = not any(warning.severity == "error" for warning in warnings)
    return PreflightCheckResponse(feasible=feasible, warnings=warnings)

@router.get("/{id}/presets/academic/config")
def get_academic_preset_config(
    id: str,
    current_user: Profile = Depends(get_current_user_profile),
    db: Session = Depends(get_db)
):
    _get_workspace_or_default(id, current_user, db)
        
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
    workspace = _get_workspace_or_default(id, current_user, db)
    ws_uuid = workspace.id

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

@router.get("/", response_model=list[WorkspaceResponse])
def list_workspaces(
    current_user: Profile = Depends(get_current_user_profile),
    db: Session = Depends(get_db)
):
    workspaces = db.query(SchedulingWorkspace).filter(
        SchedulingWorkspace.organization_id == current_user.organization_id
    ).all()
    if not workspaces:
        workspace = SchedulingWorkspace(
            organization_id=current_user.organization_id,
            name="Default Workspace",
            domain_preset="academic"
        )
        db.add(workspace)
        db.commit()
        db.refresh(workspace)
        workspaces = [workspace]
    return workspaces

@router.put("/{id}", response_model=WorkspaceResponse)
def update_workspace(
    id: str,
    payload: WorkspaceUpdate,
    current_user: Profile = Depends(require_org_admin),
    db: Session = Depends(get_db)
):
    workspace = _get_workspace_or_default(id, current_user, db)
    if payload.name is not None:
        workspace.name = payload.name
    if payload.domain_preset is not None:
        workspace.domain_preset = payload.domain_preset
    db.commit()
    db.refresh(workspace)
    return workspace

