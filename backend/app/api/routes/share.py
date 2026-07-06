from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.faculty_share_link import FacultyShareLink
from app.schemas.faculty_share import PublicFacultyTimetableResponse
from app.services.faculty_share_service import FacultyShareService

router = APIRouter()


def _get_active_link(token: str, db: Session) -> FacultyShareLink:
    link = db.query(FacultyShareLink).filter(FacultyShareLink.token == token).first()
    if not link or not link.is_active:
        raise HTTPException(status_code=404, detail="Share link not found")
    return link


@router.get("/faculty/{token}", response_model=PublicFacultyTimetableResponse)
def get_public_faculty_timetable(
    token: str,
    db: Session = Depends(get_db),
):
    link = _get_active_link(token, db)
    return FacultyShareService.public_payload(db, link)


@router.get("/faculty/{token}/pdf")
def export_public_faculty_timetable_pdf(
    token: str,
    db: Session = Depends(get_db),
):
    link = _get_active_link(token, db)
    payload = FacultyShareService.public_payload(db, link)
    if payload["is_expired"]:
        raise HTTPException(status_code=410, detail="Share link has expired")

    pdf_bytes = FacultyShareService.generate_faculty_pdf(payload)
    filename = FacultyShareService.pdf_filename(payload["faculty"]["name"])
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
