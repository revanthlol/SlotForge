import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.core.auth import get_current_user_profile, require_org_admin
from app.core.db import get_db
from app.models.faculty_share_link import FacultyShareLink
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
from app.schemas.faculty_share import FacultyShareLinkCreate, FacultyShareLinkResponse
from app.schemas.resource import ResourceResponse
from app.schemas.schedule_run import ScheduleRunResponse
from app.schemas.workspace import WorkspaceResponse, WorkspaceUpdate
from app.services.faculty_share_service import FacultyShareService
from app.services.timetable_service import TimetableService
from app.services.heatmap_service import HeatmapService
from app.schemas.heatmap import (
    SchedulingPressureReport,
    ViolationReport,
    ImpactAnalysisRequest,
    ImpactAnalysisReport,
    AssignmentExplanationReport
)
from app.models.constraint_rule import ConstraintRule
from app.schemas.constraint import (
    ConstraintRuleCreate,
    ConstraintRuleUpdate,
    ConstraintRuleResponse,
    ConstraintPreviewRequest,
    ConstraintPreviewResponse,
    AffectedAssignmentInfo,
)
from app.services.constraints.registry import CONSTRAINT_TEMPLATES
from app.services.audit_service import AuditService

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


def _resource_schema(resource: Resource) -> dict:
    return {
        "id": resource.id,
        "organization_id": resource.organization_id,
        "workspace_id": resource.workspace_id,
        "name": resource.name,
        "resource_type": resource.resource_type,
        "metadata": resource.resource_metadata,
        "availability": resource.availability,
        "max_hours_per_week": resource.max_hours_per_week,
        "created_at": resource.created_at,
    }


def _require_workspace_resource(
    db: Session,
    workspace: SchedulingWorkspace,
    resource_id: str,
) -> Resource:
    resource_uuid = _parse_uuid(resource_id, "resource_id")
    resource = db.query(Resource).filter(
        Resource.id == resource_uuid,
        Resource.workspace_id == workspace.id,
        Resource.organization_id == workspace.organization_id,
    ).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Faculty resource not found")
    return resource


def _require_successful_run(db: Session, workspace: SchedulingWorkspace, schedule_run_id: uuid.UUID) -> ScheduleRun:
    run = db.query(ScheduleRun).filter(
        ScheduleRun.id == schedule_run_id,
        ScheduleRun.workspace_id == workspace.id,
        ScheduleRun.organization_id == workspace.organization_id,
    ).first()
    if not run:
        raise HTTPException(status_code=404, detail="Schedule run not found")
    if run.status != "success" or not run.schedule_version_id:
        raise HTTPException(status_code=409, detail="Only successful schedule runs can be shared")
    return run


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

@router.get("/{id}/resources", response_model=list[ResourceResponse])
def list_workspace_resources(
    id: str,
    type: str | None = Query(None),
    current_user: Profile = Depends(get_current_user_profile),
    db: Session = Depends(get_db),
):
    workspace = _get_workspace_or_default(id, current_user, db)
    query = db.query(Resource).filter(
        Resource.workspace_id == workspace.id,
        Resource.organization_id == current_user.organization_id,
    )
    if type:
        query = query.filter(Resource.resource_type == type)
    resources = query.order_by(Resource.name.asc()).all()
    return [_resource_schema(resource) for resource in resources]

@router.get("/{id}/schedule-runs/", response_model=list[ScheduleRunResponse])
def list_schedule_runs(
    id: str,
    current_user: Profile = Depends(get_current_user_profile),
    db: Session = Depends(get_db),
):
    workspace = _get_workspace_or_default(id, current_user, db)
    return db.query(ScheduleRun).filter(
        ScheduleRun.workspace_id == workspace.id,
        ScheduleRun.organization_id == current_user.organization_id,
    ).order_by(ScheduleRun.created_at.desc()).all()

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

    resource = db.query(Resource).filter(
        Resource.id == res_uuid,
        Resource.workspace_id == ws_uuid,
        Resource.organization_id == current_user.organization_id,
    ).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Faculty resource not found")

    return FacultyShareService.faculty_assignments(db, run.schedule_version_id, resource.id)

@router.get("/{id}/faculty/{resource_id}/share-links", response_model=list[FacultyShareLinkResponse])
def list_faculty_share_links(
    id: str,
    resource_id: str,
    request: Request,
    current_user: Profile = Depends(get_current_user_profile),
    db: Session = Depends(get_db),
):
    workspace = _get_workspace_or_default(id, current_user, db)
    resource = _require_workspace_resource(db, workspace, resource_id)
    links = db.query(FacultyShareLink).filter(
        FacultyShareLink.workspace_id == workspace.id,
        FacultyShareLink.resource_id == resource.id,
    ).order_by(FacultyShareLink.created_at.desc()).all()
    return [FacultyShareService.link_schema(link, request) for link in links]

@router.post("/{id}/faculty/{resource_id}/share-link", response_model=FacultyShareLinkResponse, status_code=201)
def create_faculty_share_link(
    id: str,
    resource_id: str,
    payload: FacultyShareLinkCreate,
    request: Request,
    current_user: Profile = Depends(require_org_admin),
    db: Session = Depends(get_db),
):
    workspace = _get_workspace_or_default(id, current_user, db)
    resource = _require_workspace_resource(db, workspace, resource_id)
    run = _require_successful_run(db, workspace, payload.schedule_run_id)

    active_links = db.query(FacultyShareLink).filter(
        FacultyShareLink.workspace_id == workspace.id,
        FacultyShareLink.resource_id == resource.id,
        FacultyShareLink.is_active.is_(True),
    ).all()
    for link in active_links:
        link.is_active = False
        link.revoked_at = datetime.utcnow()

    token = str(uuid.uuid4())
    while db.query(FacultyShareLink).filter(FacultyShareLink.token == token).first():
        token = str(uuid.uuid4())

    link = FacultyShareLink(
        token=token,
        organization_id=workspace.organization_id,
        workspace_id=workspace.id,
        resource_id=resource.id,
        schedule_run_id=run.id,
        created_by=current_user.id,
        expires_at=payload.expires_at,
        is_active=True,
    )
    db.add(link)
    db.commit()
    db.refresh(link)
    return FacultyShareService.link_schema(link, request)

@router.delete("/{id}/faculty/{resource_id}/share-link/{link_id}", status_code=204)
def revoke_faculty_share_link(
    id: str,
    resource_id: str,
    link_id: str,
    current_user: Profile = Depends(require_org_admin),
    db: Session = Depends(get_db),
):
    workspace = _get_workspace_or_default(id, current_user, db)
    resource = _require_workspace_resource(db, workspace, resource_id)
    link_uuid = _parse_uuid(link_id, "link_id")
    link = db.query(FacultyShareLink).filter(
        FacultyShareLink.id == link_uuid,
        FacultyShareLink.workspace_id == workspace.id,
        FacultyShareLink.resource_id == resource.id,
    ).first()
    if not link:
        raise HTTPException(status_code=404, detail="Share link not found")

    link.is_active = False
    link.revoked_at = datetime.utcnow()
    db.commit()
    return None

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


@router.post("/{id}/heatmap/pressure", response_model=SchedulingPressureReport)
def get_heatmap_pressure(
    id: str,
    current_user: Profile = Depends(get_current_user_profile),
    db: Session = Depends(get_db)
):
    workspace = _get_workspace_or_default(id, current_user, db)
    return HeatmapService.calculate_pressure_report(workspace.id, db)


@router.get("/{id}/schedule-runs/{run_id}/heatmap/violations", response_model=ViolationReport)
def get_heatmap_violations(
    id: str,
    run_id: str,
    current_user: Profile = Depends(get_current_user_profile),
    db: Session = Depends(get_db)
):
    workspace = _get_workspace_or_default(id, current_user, db)
    run_uuid = _parse_uuid(run_id, "run_id")
    return HeatmapService.calculate_violations_report(workspace.id, run_uuid, db)


@router.post("/{id}/impact-analysis", response_model=ImpactAnalysisReport)
def get_impact_analysis(
    id: str,
    payload: ImpactAnalysisRequest,
    current_user: Profile = Depends(get_current_user_profile),
    db: Session = Depends(get_db)
):
    workspace = _get_workspace_or_default(id, current_user, db)
    return HeatmapService.calculate_impact_report(workspace.id, payload.model_dump(mode="json"), db)


@router.get("/{id}/schedule-runs/{run_id}/assignments/{assignment_id}/explanation", response_model=AssignmentExplanationReport)
def get_assignment_explanation(
    id: str,
    run_id: str,
    assignment_id: str,
    current_user: Profile = Depends(get_current_user_profile),
    db: Session = Depends(get_db)
):
    workspace = _get_workspace_or_default(id, current_user, db)
    run_uuid = _parse_uuid(run_id, "run_id")
    assignment_uuid = _parse_uuid(assignment_id, "assignment_id")
    return HeatmapService.calculate_explanation_report(workspace.id, run_uuid, assignment_uuid, db)


# ── Constraint Playground Routes ──────────────────────────────────

@router.get("/{id}/constraints", response_model=list[ConstraintRuleResponse])
@router.get("/{id}/constraints/", response_model=list[ConstraintRuleResponse])
def list_workspace_constraints(
    id: str,
    current_user: Profile = Depends(get_current_user_profile),
    db: Session = Depends(get_db)
):
    workspace = _get_workspace_or_default(id, current_user, db)
    rules = db.query(ConstraintRule).filter(
        ConstraintRule.workspace_id == workspace.id
    ).all()
    return rules


@router.post("/{id}/constraints", response_model=ConstraintRuleResponse, status_code=201)
@router.post("/{id}/constraints/", response_model=ConstraintRuleResponse, status_code=201)
def create_workspace_constraint(
    id: str,
    payload: ConstraintRuleCreate,
    current_user: Profile = Depends(require_org_admin),
    db: Session = Depends(get_db)
):
    workspace = _get_workspace_or_default(id, current_user, db)
    template = CONSTRAINT_TEMPLATES.get(payload.template_key)
    
    rule_name = payload.name or (template["name"] if template else payload.template_key.replace("_", " ").title())
    rule_type = payload.rule_type or (template["type"] if template else ("hard" if payload.penalty is None else "soft"))
    
    rule = ConstraintRule(
        organization_id=workspace.organization_id,
        workspace_id=workspace.id,
        name=rule_name,
        rule_type=rule_type,
        template_key=payload.template_key,
        parameters=payload.parameters or {},
        priority=payload.priority,
        penalty=payload.penalty,
        enabled=payload.enabled
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)

    AuditService.log_action(
        db=db,
        org_id=current_user.organization_id,
        actor_id=current_user.id,
        action="constraint.create",
        target_table="constraint_rules",
        target_id=rule.id,
        diff={"new_values": {"name": rule.name, "template_key": rule.template_key, "parameters": rule.parameters}}
    )

    return rule


@router.patch("/{id}/constraints/{rule_id}", response_model=ConstraintRuleResponse)
@router.put("/{id}/constraints/{rule_id}", response_model=ConstraintRuleResponse)
def update_workspace_constraint(
    id: str,
    rule_id: str,
    payload: ConstraintRuleUpdate,
    current_user: Profile = Depends(require_org_admin),
    db: Session = Depends(get_db)
):
    workspace = _get_workspace_or_default(id, current_user, db)
    r_uuid = _parse_uuid(rule_id, "rule_id")
    
    rule = db.query(ConstraintRule).filter(
        ConstraintRule.id == r_uuid,
        ConstraintRule.workspace_id == workspace.id
    ).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Constraint rule not found")

    old_values = {
        "name": rule.name,
        "rule_type": rule.rule_type,
        "parameters": rule.parameters,
        "enabled": rule.enabled,
        "penalty": rule.penalty,
        "priority": rule.priority
    }

    if payload.name is not None:
        rule.name = payload.name
    if payload.rule_type is not None:
        rule.rule_type = payload.rule_type
    if payload.parameters is not None:
        rule.parameters = payload.parameters
    if payload.priority is not None:
        rule.priority = payload.priority
    if payload.penalty is not None:
        rule.penalty = payload.penalty
    if payload.enabled is not None:
        rule.enabled = payload.enabled

    db.commit()
    db.refresh(rule)

    AuditService.log_action(
        db=db,
        org_id=current_user.organization_id,
        actor_id=current_user.id,
        action="constraint.update",
        target_table="constraint_rules",
        target_id=rule.id,
        diff={"old_values": old_values, "new_values": {"name": rule.name, "enabled": rule.enabled}}
    )

    return rule


@router.delete("/{id}/constraints/{rule_id}", status_code=204)
def delete_workspace_constraint(
    id: str,
    rule_id: str,
    current_user: Profile = Depends(require_org_admin),
    db: Session = Depends(get_db)
):
    workspace = _get_workspace_or_default(id, current_user, db)
    r_uuid = _parse_uuid(rule_id, "rule_id")
    
    rule = db.query(ConstraintRule).filter(
        ConstraintRule.id == r_uuid,
        ConstraintRule.workspace_id == workspace.id
    ).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Constraint rule not found")

    rule_id_val = rule.id
    db.delete(rule)
    db.commit()

    AuditService.log_action(
        db=db,
        org_id=current_user.organization_id,
        actor_id=current_user.id,
        action="constraint.delete",
        target_table="constraint_rules",
        target_id=rule_id_val,
        diff={"old_values": {"name": rule.name}}
    )
    return


@router.post("/{id}/constraints/preview", response_model=ConstraintPreviewResponse)
def preview_workspace_constraint(
    id: str,
    payload: ConstraintPreviewRequest,
    current_user: Profile = Depends(get_current_user_profile),
    db: Session = Depends(get_db)
):
    workspace = _get_workspace_or_default(id, current_user, db)
    template = CONSTRAINT_TEMPLATES.get(payload.template_key)
    
    assignments = db.query(SlotModel).filter(
        SlotModel.workspace_id == workspace.id
    ).all()
    
    impacted: list[AffectedAssignmentInfo] = []
    rule_type = template["type"] if template else "hard"

    if payload.template_key in ("reserve_period_for_assembly", "hard_block_slot"):
        target_day = payload.parameters.get("day")
        target_period = payload.parameters.get("period")
        label = payload.parameters.get("label", "Assembly")
        if target_day is not None and target_period is not None:
            for a in assignments:
                if str(a.day) == str(target_day) and int(a.period) == int(target_period):
                    impacted.append(
                        AffectedAssignmentInfo(
                            section_id=str(a.group_id or a.metadata.get("section_id", "") if a.metadata else ""),
                            subject_id=str(a.task_id or a.metadata.get("subject_id", "") if a.metadata else ""),
                            teacher_id=str(a.teacher_id or ""),
                            room_id=str(a.room_id or ""),
                            day=str(a.day),
                            period=int(a.period),
                            reason=f"Conflicts with reserved period for '{label}'",
                        )
                    )

    elif payload.template_key == "avoid_last_period":
        resource_id = payload.parameters.get("resource_id")
        max_period_by_day = {}
        for a in assignments:
            max_period_by_day[a.day] = max(max_period_by_day.get(a.day, 0), a.period)
        for a in assignments:
            if resource_id and str(a.teacher_id) != str(resource_id):
                continue
            if a.period == max_period_by_day.get(a.day):
                impacted.append(
                    AffectedAssignmentInfo(
                        section_id=str(a.group_id or a.metadata.get("section_id", "") if a.metadata else ""),
                        subject_id=str(a.task_id or a.metadata.get("subject_id", "") if a.metadata else ""),
                        teacher_id=str(a.teacher_id or ""),
                        room_id=str(a.room_id or ""),
                        day=str(a.day),
                        period=int(a.period),
                        reason="Scheduled in the last period of the day",
                    )
                )

    elif payload.template_key == "prefer_morning_labs":
        thresh = payload.parameters.get("morning_threshold", 3)
        for a in assignments:
            is_lab = getattr(a, "duration_slots", 1) > 1 or (a.metadata and "lab" in str(a.metadata.get("subject_name", "")).lower())
            if is_lab and a.period > thresh:
                impacted.append(
                    AffectedAssignmentInfo(
                        section_id=str(a.group_id or a.metadata.get("section_id", "") if a.metadata else ""),
                        subject_id=str(a.task_id or a.metadata.get("subject_id", "") if a.metadata else ""),
                        teacher_id=str(a.teacher_id or ""),
                        room_id=str(a.room_id or ""),
                        day=str(a.day),
                        period=int(a.period),
                        reason=f"Lab scheduled after morning threshold (period {a.period} > {thresh})",
                    )
                )

    impact_count = len(impacted)
    infeasibility_risk = bool(rule_type == "hard" and impact_count > 5)
    
    if impact_count == 0:
        summary = f"No existing assignments impacted by rule '{payload.template_key}'."
    else:
        summary = f"{impact_count} existing assignment(s) will be affected by this rule."

    return ConstraintPreviewResponse(
        template_key=payload.template_key,
        impacted_assignments_count=impact_count,
        impacted_assignments=impacted,
        infeasibility_risk=infeasibility_risk,
        summary=summary,
    )
