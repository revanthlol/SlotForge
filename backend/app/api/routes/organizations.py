import uuid
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.schemas.organization import Organization as OrgSchema, OrganizationUpdate as OrgUpdateSchema
from app.models.organization import Organization as OrgModel
from app.core.db import get_db
from app.core.auth import get_current_user_profile, require_org_admin
from app.models.profile import Profile
from app.models.audit_log import AuditLog
from app.models.assignment import SectionSubjectTeacherAssignment, TeacherSubjectAssignment
from app.models.constraint import Constraint
from app.models.room import Room
from app.models.section import Section
from app.models.subject import Subject
from app.models.teacher import Teacher
from app.models.timetable_slot import TimetableSlot
from app.models.timetable_version import TimetableVersion

router = APIRouter()

@router.get("/", response_model=list[OrgSchema])
def list_organizations(current_user: Profile = Depends(get_current_user_profile), db: Session = Depends(get_db)):
    org = db.query(OrgModel).filter(OrgModel.id == current_user.organization_id).first()
    if not org:
        return []
    return [org]

@router.get("/{org_id}", response_model=OrgSchema)
def get_organization(org_id: str, current_user: Profile = Depends(get_current_user_profile), db: Session = Depends(get_db)):
    if str(current_user.organization_id) != org_id:
        raise HTTPException(status_code=403, detail="Forbidden: You do not belong to this organization")
    org = db.query(OrgModel).filter(OrgModel.id == current_user.organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org

@router.patch("/{org_id}", response_model=OrgSchema)
def update_organization(
    org_id: str,
    payload: OrgUpdateSchema,
    current_user: Profile = Depends(require_org_admin),
    db: Session = Depends(get_db)
):
    if str(current_user.organization_id) != org_id:
        raise HTTPException(status_code=403, detail="Forbidden: You do not belong to this organization")
    org = db.query(OrgModel).filter(OrgModel.id == current_user.organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(org, key, value)
        
    db.commit()
    db.refresh(org)
    return org


@router.delete("/{org_id}/data")
def wipe_organization_data(
    org_id: str,
    current_user: Profile = Depends(require_org_admin),
    db: Session = Depends(get_db),
):
    if str(current_user.organization_id) != org_id:
        raise HTTPException(status_code=403, detail="Forbidden: You do not belong to this organization")

    org = db.query(OrgModel).filter(OrgModel.id == current_user.organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    deleted: dict[str, int] = {}

    def delete_for_org(label: str, model):
        count = db.query(model).filter(model.organization_id == current_user.organization_id).delete(synchronize_session=False)
        deleted[label] = count

    delete_for_org("timetable_slots", TimetableSlot)
    delete_for_org("timetable_versions", TimetableVersion)
    delete_for_org("section_subject_teacher_assignments", SectionSubjectTeacherAssignment)
    delete_for_org("teacher_subject_assignments", TeacherSubjectAssignment)
    delete_for_org("constraints", Constraint)
    delete_for_org("sections", Section)
    delete_for_org("subjects", Subject)
    delete_for_org("rooms", Room)
    delete_for_org("teachers", Teacher)
    delete_for_org("audit_logs", AuditLog)

    db.commit()
    return {"status": "ok", "deleted": deleted}
