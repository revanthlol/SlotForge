import uuid
from typing import Literal
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.auth import get_current_user_profile
from app.models.profile import Profile
from app.models.timetable_version import TimetableVersion as VersionModel
from app.models.organization import Organization as OrgModel
from app.schemas.export import ExportResponse
from app.services.export_service import ExportService

router = APIRouter()

@router.get("/{version_id}/export", response_model=ExportResponse)
def export_timetable(
    version_id: str,
    format: Literal["pdf", "xlsx", "csv"] = Query("pdf"),
    current_user: Profile = Depends(get_current_user_profile),
    db: Session = Depends(get_db)
):
    """
    Generates and exports a timetable version as PDF, Excel, or CSV.
    Only published versions can be exported by viewer role; admin role can export any version.
    """
    try:
        v_uuid = uuid.UUID(version_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Timetable version not found")
        
    # 1. Fetch timetable version
    version = db.query(VersionModel).filter(
        VersionModel.id == v_uuid,
        VersionModel.organization_id == current_user.organization_id
    ).first()
    
    if not version:
        raise HTTPException(status_code=404, detail="Timetable version not found")
        
    # 2. RBAC check: Viewers can only export published versions
    if current_user.role == "viewer" and version.status != "published":
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Viewers can only export published timetable versions"
        )
        
    # 3. Retrieve Organization info for doc headers
    org = db.query(OrgModel).filter(OrgModel.id == current_user.organization_id).first()
    org_name = org.name if org else "SlotForge Institution"
    
    # 4. Fetch sorted slots
    slots = ExportService.get_sorted_slots(db, version.id)
    
    # 5. Generate file bytes
    if format == "pdf":
        file_bytes = ExportService.generate_pdf(slots, org_name, version.version_number, version.status)
        extension = "pdf"
    elif format == "xlsx":
        file_bytes = ExportService.generate_excel(slots)
        extension = "xlsx"
    else:
        file_bytes = ExportService.generate_csv(slots)
        extension = "csv"
        
    filename = f"timetable_v{version.version_number}.{extension}"
    
    # 6. Upload file and get signed URL
    url = ExportService.upload_file(current_user.organization_id, filename, file_bytes)
    
    return ExportResponse(url=url)
