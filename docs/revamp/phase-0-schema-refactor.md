# Phase 0 — Generic Backend Schema Refactor

**Agent:** Antigravity  
**Depends on:** Nothing (start here)  
**Blocks:** Every other phase — do this first  
**Estimated effort:** Large (3–5 days)

---

## Goal

Refactor the entire backend data model from academic-specific terms to a
**generic, domain-agnostic scheduling schema**. This is the foundation for all
5 domain presets. Nothing else builds cleanly until this is done.

---

## What Changes

### Old → New Terminology

| Old (Academic-specific) | New (Generic) |
|---|---|
| Teacher | Resource (with resource_type="teacher") |
| Subject | Task (with task_type="subject") |
| Section | Group (with group_type="section") |
| Room / Lab | Location (with location_type="classroom"/"lab") |
| Period | TimeSlot |
| Timetable | ScheduleVersion |
| Class Assignment | Assignment |

### New Core Models

```python
# workspace.py
class SchedulingWorkspace(Base):
    id: UUID
    organization_id: UUID
    name: str
    domain_preset: str  # "academic" | "staff_roster" | "event" | "exam" | "facility"
    created_at: datetime
    updated_at: datetime

# resource.py
class Resource(Base):
    id: UUID
    workspace_id: UUID
    name: str
    resource_type: str       # "teacher" / "employee" / "speaker" / "room"
    metadata: JSONB          # domain-specific extra fields
    availability: JSONB      # time slot availability matrix
    max_hours_per_week: int | None

# task.py
class Task(Base):
    id: UUID
    workspace_id: UUID
    name: str
    task_type: str           # "subject" / "shift" / "session" / "exam"
    required_hours: int | None
    requires_continuous_slots: bool
    metadata: JSONB

# group.py
class Group(Base):
    id: UUID
    workspace_id: UUID
    name: str
    group_type: str          # "section" / "department" / "team"
    size: int | None
    metadata: JSONB

# location.py
class Location(Base):
    id: UUID
    workspace_id: UUID
    name: str
    location_type: str       # "classroom" / "lab" / "hall" / "room"
    capacity: int
    metadata: JSONB

# timeslot.py
class TimeSlot(Base):
    id: UUID
    workspace_id: UUID
    name: str                # "Period 1" / "Morning Shift" / "9:00-10:00"
    day: str                 # "Monday" / "2024-06-10"
    start_time: time
    end_time: time
    slot_index: int

# schedule_version.py
class ScheduleVersion(Base):
    id: UUID
    workspace_id: UUID
    version_label: str       # "v1", "v2", "Draft A"
    status: str              # "draft" | "published" | "archived"
    scores: JSONB            # quality scores (dict)
    explanation: JSONB | None
    parent_version_id: UUID | None # for branching
    is_manual_override: bool
    metadata: JSONB
    created_by: UUID | None
    created_at: datetime

# schedule_run.py
class ScheduleRun(Base):
    id: UUID
    workspace_id: UUID
    schedule_version_id: UUID | None # version generated/updated by this run
    status: str              # "running" | "success" | "failed"
    solver_score: JSONB | None
    explanation: JSONB | None
    duration_seconds: float | None
    error_message: str | None
    created_at: datetime

# assignment.py
class Assignment(Base):
    id: UUID
    schedule_version_id: UUID
    task_id: UUID
    group_id: UUID | None
    timeslot_id: UUID
    duration_slots: int
    is_manual_override: bool
    metadata: JSONB

# assignment_resources.py
class AssignmentResource(Base):
    assignment_id: UUID      # Composite PK
    resource_id: UUID        # Composite PK

# assignment_locations.py
class AssignmentLocation(Base):
    assignment_id: UUID      # Composite PK
    location_id: UUID        # Composite PK
    student_count: int | None # for section-room split
    sub_group: str | None    # for section-room split

# constraint.py
class ConstraintRule(Base):
    id: UUID
    workspace_id: UUID
    name: str
    rule_type: str           # "hard" | "soft"
    template_key: str        # references constraint template registry
    parameters: JSONB        # template-specific params
    priority: int
    penalty: int | None      # for soft constraints
    enabled: bool
```

---

## Academic Preset — Section-Room Split Feature

One section can be split across multiple classrooms per period.
This is a real college pattern where large sections are divided into rooms.
This is fully supported via the `assignment_locations` join table.

---

## Migration Strategy

1. Create new models alongside old ones.
2. Write a migration script that copies existing academic data into new generic models:
   - Organizations → Default Org used to seed new SchedulingWorkspace
   - Teachers → Resources (resource_type = "teacher")
   - Subjects → Tasks (task_type = "subject")
   - Sections → Groups (group_type = "section")
   - Rooms → Locations (location_type = "classroom")
   - Labs → Locations (location_type = "lab")
   - TimetableVersions → ScheduleVersions
   - TimetableSlots → Assignments + entries in `assignment_resources` and `assignment_locations`
   - Constraints → ConstraintRules
3. Run migration on dev, verify data integrity.
4. Update all API routes to use new models.
5. In the dev env (which is disposable), we remove the old academic-specific tables once the migration works and all backend tests pass.

---

## API Changes

All existing API routes under `/api/v1/teachers/`, `/api/v1/subjects/`, etc.
must be updated or aliased to new generic routes:

```
GET  /api/v1/workspaces/{id}/resources/
POST /api/v1/workspaces/{id}/resources/
GET  /api/v1/workspaces/{id}/tasks/
GET  /api/v1/workspaces/{id}/groups/
GET  /api/v1/workspaces/{id}/locations/
GET  /api/v1/workspaces/{id}/timeslots/
GET  /api/v1/workspaces/{id}/assignments/
GET  /api/v1/workspaces/{id}/constraints/
POST /api/v1/workspaces/{id}/schedule-runs/
```

For backward compatibility during development, keep academic-named aliases
that proxy to the new generic routes.

---

## Solver Adapter

The solver currently references academic-specific field names.
Create a **SolverAdapter** that translates generic model → solver input:

```python
class AcademicSolverAdapter:
    """Translates generic workspace data → solver-compatible format"""
    def build_input(self, workspace_id: UUID) -> SolverInput:
        ...
```

Each preset will have its own adapter in Phase 4.

---

## Files to Create / Modify

### New Files
- `backend/app/models/workspace.py`
- `backend/app/models/resource.py`
- `backend/app/models/task.py`
- `backend/app/models/group.py`
- `backend/app/models/location.py`
- `backend/app/models/timeslot.py`
- `backend/app/models/schedule_version.py`
- `backend/app/models/schedule_run.py`
- `backend/app/models/assignment.py`
- `backend/app/models/constraint_rule.py`
- `backend/app/api/routes/workspaces.py` (new generic router)
- `backend/app/services/solver_adapter.py`
- `backend/migrations/versions/XXXX_generic_schema.py`

### Modified Files
- `backend/app/main.py` — register new routers
- `backend/app/models/__init__.py`
- `backend/app/schemas/` — new Pydantic schemas for all generic models

---

## Done Criteria

- [ ] All new generic models exist and have Alembic migrations
- [ ] Existing academic data is migrated to new tables
- [ ] All API routes return data from new models
- [ ] Old academic-specific tables are removed (or clearly marked deprecated)
- [ ] SolverAdapter for academic preset translates correctly
- [ ] All existing timetable generation still works with the new schema
- [ ] Section-room split model exists via join table and is fully schema-ready
