import logging
import os

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import get_db

app = FastAPI(title="SlotForge API", version="0.1.0")
logger = logging.getLogger("slotforge.api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Ensure static directory exists
os.makedirs("app/static/exports", exist_ok=True)
app.mount("/static", StaticFiles(directory="app/static"), name="static")

REQUIRED_SCHEMA_COLUMNS = {
    "organizations": {"id", "name", "created_at", "scheduling_mode", "cycle_length", "periods_per_day"},
    "scheduling_workspaces": {"id", "organization_id", "name", "domain_preset", "created_at", "updated_at"},
    "resources": {"id", "organization_id", "workspace_id", "name", "resource_type", "metadata", "availability", "created_at"},
    "tasks": {"id", "organization_id", "workspace_id", "name", "task_type", "required_hours", "metadata", "created_at"},
    "groups": {"id", "organization_id", "workspace_id", "name", "group_type", "size", "metadata", "created_at"},
    "locations": {"id", "organization_id", "workspace_id", "name", "location_type", "capacity", "metadata", "created_at"},
    "timeslots": {"id", "organization_id", "workspace_id", "name", "day", "slot_index", "created_at"},
    "schedule_versions": {"id", "organization_id", "workspace_id", "version_label", "version_number", "status", "scores", "created_at"},
    "assignments": {
        "id",
        "organization_id",
        "workspace_id",
        "schedule_version_id",
        "task_id",
        "group_id",
        "timeslot_id",
        "duration_slots",
        "metadata",
        "created_at",
        "day",
        "period",
        "teacher_id",
        "room_id",
    },
    "constraint_rules": {"id", "organization_id", "workspace_id", "name", "rule_type", "template_key", "parameters", "priority", "penalty", "enabled", "created_at"},
    "teacher_subject_assignments": {"id", "organization_id", "workspace_id", "teacher_id", "subject_id", "created_at"},
    "section_subject_teacher_assignments": {"id", "organization_id", "workspace_id", "section_id", "subject_id", "teacher_id", "created_at"},
}


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error for %s %s", request.method, request.url.path)
    content = {"detail": "Internal server error"}
    if settings.DEV_MODE:
        content["error_type"] = exc.__class__.__name__
        content["error"] = str(exc)
    return JSONResponse(status_code=500, content=content)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/health/db")
def health_db(db: Session = Depends(get_db)):
    inspector = inspect(db.bind)
    missing: dict[str, list[str]] = {}

    for table, required_columns in REQUIRED_SCHEMA_COLUMNS.items():
        if not inspector.has_table(table):
            missing[table] = sorted(required_columns)
            continue
        actual_columns = {column["name"] for column in inspector.get_columns(table)}
        table_missing = sorted(required_columns - actual_columns)
        if table_missing:
            missing[table] = table_missing

    revision = None
    if inspector.has_table("alembic_version"):
        revision = db.execute(text("select version_num from alembic_version")).scalar()

    status = "ok" if not missing else "degraded"
    status_code = 200 if not missing else 503
    return JSONResponse(
        status_code=status_code,
        content={"status": status, "alembic_revision": revision, "missing_columns": missing},
    )


# Route modules get included here as they're built (Phase 2 onward):
from app.api.routes import auth, organizations, teachers, rooms, subjects, sections, constraints, timetables, exports, assignments, workspaces, presets, share


app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(organizations.router, prefix="/organizations", tags=["organizations"])
app.include_router(teachers.router, prefix="/teachers", tags=["teachers"])
app.include_router(rooms.router, prefix="/rooms", tags=["rooms"])
app.include_router(subjects.router, prefix="/subjects", tags=["subjects"])
app.include_router(sections.router, prefix="/sections", tags=["sections"])
app.include_router(constraints.router, prefix="/constraints", tags=["constraints"])
app.include_router(timetables.router, prefix="/timetables", tags=["timetables"])
app.include_router(exports.router, prefix="/timetables", tags=["exports"])
app.include_router(assignments.router, prefix="/assignments", tags=["assignments"])
app.include_router(workspaces.router, prefix="/api/v1/workspaces", tags=["workspaces"])
app.include_router(presets.router, prefix="/api/v1/presets", tags=["presets"])
app.include_router(share.router, prefix="/api/v1/share", tags=["share"])
