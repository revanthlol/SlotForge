import io
import re
import uuid
from datetime import datetime

from fastapi import HTTPException, Request
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.assignment import Assignment, AssignmentLocation, AssignmentResource
from app.models.faculty_share_link import FacultyShareLink
from app.models.group import Group
from app.models.location import Location
from app.models.organization import Organization
from app.models.resource import Resource
from app.models.schedule_run import ScheduleRun
from app.models.schedule_version import ScheduleVersion
from app.models.task import Task
from app.models.workspace import SchedulingWorkspace
from app.services.timetable_service import TimetableService


DAY_ORDER = {
    "Mon": 1,
    "Monday": 1,
    "Tue": 2,
    "Tuesday": 2,
    "Wed": 3,
    "Wednesday": 3,
    "Thu": 4,
    "Thursday": 4,
    "Fri": 5,
    "Friday": 5,
    "Sat": 6,
    "Saturday": 6,
    "Sun": 7,
    "Sunday": 7,
}


class FacultyShareService:
    @staticmethod
    def public_base_url(request: Request | None = None) -> str:
        configured = (settings.FRONTEND_ORIGIN or "").strip()
        if configured:
            return configured.rstrip("/")
        if request:
            return str(request.base_url).rstrip("/")
        return ""

    @staticmethod
    def share_url(token: str, request: Request | None = None) -> str:
        return f"{FacultyShareService.public_base_url(request)}/share/faculty/{token}"

    @staticmethod
    def link_schema(link: FacultyShareLink, request: Request | None = None) -> dict:
        return {
            "id": link.id,
            "token": link.token,
            "share_url": FacultyShareService.share_url(link.token, request),
            "organization_id": link.organization_id,
            "workspace_id": link.workspace_id,
            "resource_id": link.resource_id,
            "schedule_run_id": link.schedule_run_id,
            "created_by": link.created_by,
            "expires_at": link.expires_at,
            "is_active": link.is_active,
            "created_at": link.created_at,
            "revoked_at": link.revoked_at,
        }

    @staticmethod
    def is_expired(link: FacultyShareLink) -> bool:
        if not link.expires_at:
            return False
        now = datetime.now(link.expires_at.tzinfo) if link.expires_at.tzinfo else datetime.utcnow()
        return link.expires_at <= now

    @staticmethod
    def faculty_assignments(db: Session, schedule_version_id, resource_id) -> list[dict]:
        rows = db.query(Assignment, Task, Group, Resource, Location).join(
            AssignmentResource,
            Assignment.id == AssignmentResource.assignment_id,
        ).join(
            Task,
            Assignment.task_id == Task.id,
        ).outerjoin(
            Group,
            Assignment.group_id == Group.id,
        ).join(
            Resource,
            Assignment.teacher_id == Resource.id,
        ).join(
            Location,
            Assignment.room_id == Location.id,
        ).filter(
            Assignment.schedule_version_id == schedule_version_id,
            AssignmentResource.resource_id == resource_id,
        ).all()

        assignments: list[dict] = []
        for slot, task, group, teacher, room in rows:
            item = TimetableService._slot_schema(slot)
            room_assignments = item.get("room_assignments", [])
            if room_assignments:
                location_ids = [uuid.UUID(entry["room_id"]) for entry in room_assignments]
                locations = db.query(Location).filter(Location.id.in_(location_ids)).all()
                location_names = {str(location.id): location.name for location in locations}
                for entry in room_assignments:
                    entry["room_name"] = location_names.get(entry["room_id"])

            item.update({
                "section_name": group.name if group else None,
                "subject_name": task.name,
                "teacher_name": teacher.name,
                "room_name": room.name,
                "room_assignments": room_assignments,
            })
            assignments.append(item)

        return sorted(
            assignments,
            key=lambda item: (
                DAY_ORDER.get(item["day"], 99),
                item["day"],
                item["period"],
                item.get("section_name") or "",
                item.get("subject_name") or "",
            ),
        )

    @staticmethod
    def public_payload(db: Session, link: FacultyShareLink) -> dict:
        org = db.query(Organization).filter(Organization.id == link.organization_id).first()
        workspace = db.query(SchedulingWorkspace).filter(SchedulingWorkspace.id == link.workspace_id).first()
        faculty = db.query(Resource).filter(Resource.id == link.resource_id).first()
        run = db.query(ScheduleRun).filter(ScheduleRun.id == link.schedule_run_id).first()
        if not org or not workspace or not faculty or not run:
            raise HTTPException(status_code=404, detail="Share link target not found")

        version = None
        if run.schedule_version_id:
            version = db.query(ScheduleVersion).filter(ScheduleVersion.id == run.schedule_version_id).first()

        expired = FacultyShareService.is_expired(link)
        assignments = []
        if version and not expired:
            assignments = FacultyShareService.faculty_assignments(db, version.id, faculty.id)

        return {
            "token": link.token,
            "share_link_id": link.id,
            "is_active": link.is_active,
            "is_expired": expired,
            "expires_at": link.expires_at,
            "published_at": link.created_at,
            "organization": {"id": org.id, "name": org.name},
            "workspace": {"id": workspace.id, "name": workspace.name, "domain_preset": workspace.domain_preset},
            "faculty": {"id": faculty.id, "name": faculty.name, "resource_type": faculty.resource_type},
            "schedule_run": {"id": run.id, "status": run.status, "created_at": run.created_at},
            "schedule_version": {
                "id": version.id,
                "version_label": version.version_label,
                "version_number": version.version_number,
                "status": version.status,
                "created_at": version.created_at,
            } if version else None,
            "assignments": assignments,
            "message": "This faculty timetable link has expired." if expired else None,
        }

    @staticmethod
    def generate_faculty_pdf(payload: dict) -> bytes:
        out = io.BytesIO()
        doc = SimpleDocTemplate(out, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            "FacultyTimetableTitle",
            parent=styles["Heading1"],
            fontSize=19,
            leading=23,
            textColor=colors.HexColor("#2d5d4f"),
            spaceAfter=12,
        )

        faculty_name = payload["faculty"]["name"]
        org_name = payload["organization"]["name"]
        version = payload.get("schedule_version") or {}
        version_label = version.get("version_label") or "Unversioned"
        published = payload["published_at"].strftime("%b %d, %Y")

        story = [
            Paragraph(f"{faculty_name} - Weekly Timetable", title_style),
            Paragraph(f"{org_name} | {version_label} | Published {published}", styles["Normal"]),
            Spacer(1, 14),
        ]

        table_data = [["Day", "Period", "Subject", "Section", "Room"]]
        for item in payload["assignments"]:
            table_data.append([
                item["day"],
                str(item["period"]),
                item["subject_name"],
                item.get("section_name") or "",
                item["room_name"],
            ])

        table = Table(table_data, colWidths=[78, 52, 150, 130, 130])
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2d5d4f")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("ALIGN", (0, 0), (1, -1), "CENTER"),
            ("ALIGN", (2, 1), (-1, -1), "LEFT"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f7f9f8")]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d7ddd9")),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
        ]))
        story.append(table)
        doc.build(story)
        return out.getvalue()

    @staticmethod
    def pdf_filename(faculty_name: str) -> str:
        clean = re.sub(r"[^A-Za-z0-9]+", "-", faculty_name).strip("-").lower()
        return f"{clean or 'faculty'}-timetable.pdf"
