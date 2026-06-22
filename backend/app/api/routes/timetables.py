import uuid
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.schemas.timetable import TimetableGenerateRequest, TimetableResponse, TimetableVersionResponse
from app.services.timetable_service import TimetableService
from app.services.versioning_service import VersioningService
from app.services.audit_service import AuditService
from app.core.db import get_db
from app.core.auth import get_current_user_profile, require_org_admin
from app.models.profile import Profile

router = APIRouter()

@router.post("/generate", response_model=TimetableResponse)
def generate_timetable(
    payload: TimetableGenerateRequest,
    current_user: Profile = Depends(require_org_admin),
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
        
    AuditService.log_action(
        db=db,
        org_id=org_uuid,
        actor_id=current_user.id,
        action="timetable.generate",
        target_table="timetable_versions",
        target_id=uuid.UUID(result["id"]),
        diff={"scores": result["scores"]}
    )
        
    return result

@router.get("/versions", response_model=list[TimetableVersionResponse])
def list_versions(
    current_user: Profile = Depends(get_current_user_profile),
    db: Session = Depends(get_db)
):
    versions = VersioningService.list_versions(db, current_user.organization_id)
    return [
        TimetableVersionResponse(
            id=str(v.id),
            organization_id=str(v.organization_id),
            version_number=v.version_number,
            status=v.status,
            scores=v.scores,
            created_by=str(v.created_by) if v.created_by else None,
            created_at=v.created_at
        ) for v in versions
    ]

@router.post("/{version_id}/publish", response_model=TimetableVersionResponse)
def publish_version(
    version_id: str,
    current_user: Profile = Depends(require_org_admin),
    db: Session = Depends(get_db)
):
    try:
        v_uuid = uuid.UUID(version_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Version not found")
        
    version = VersioningService.publish_version(db, v_uuid, current_user.organization_id, current_user.id)
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
        
    return TimetableVersionResponse(
        id=str(version.id),
        organization_id=str(version.organization_id),
        version_number=version.version_number,
        status=version.status,
        scores=version.scores,
        created_by=str(version.created_by) if version.created_by else None,
        created_at=version.created_at
    )

@router.post("/{version_id}/rollback", response_model=TimetableVersionResponse)
def rollback_version(
    version_id: str,
    current_user: Profile = Depends(require_org_admin),
    db: Session = Depends(get_db)
):
    try:
        v_uuid = uuid.UUID(version_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Version not found")
        
    version = VersioningService.rollback_version(db, v_uuid, current_user.organization_id, current_user.id)
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
        
    return TimetableVersionResponse(
        id=str(version.id),
        organization_id=str(version.organization_id),
        version_number=version.version_number,
        status=version.status,
        scores=version.scores,
        created_by=str(version.created_by) if version.created_by else None,
        created_at=version.created_at
    )

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

