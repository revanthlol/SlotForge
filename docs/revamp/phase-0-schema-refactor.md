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
| Teacher | Resource |
| Subject | Task |
| Section | Group |
| Room / Lab | Location |
| Period | TimeSlot |
| Timetable | Schedule |
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

# assignment.py
class Assignment(Base):
    id: UUID
    schedule_run_id: UUID
    task_id: UUID
    resource_ids: list[UUID]  # can be multiple (teacher + room)
    group_id: UUID | None
    location_ids: list[UUID]  # split section → multiple rooms
    timeslot_id: UUID
    is_manual_override: bool
    metadata: JSONB

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

# schedule_run.py
class ScheduleRun(Base):
    id: UUID
    workspace_id: UUID
    version_label: str
    status: str              # "draft" | "published" | "archived"
    solver_score: float | None
    explanation: JSONB | None
    parent_run_id: UUID | None  # for branching
    created_at: datetime
```

---

## Academic Preset — Section-Room Split Feature

One section can be split across multiple classrooms per period.
This is a real college pattern where large sections are divided into rooms.

```python
# In Assignment model — location_ids is a list
# e.g. Section CS-A (100 students) → Room 101 (50) + Room 102 (50)
class AssignmentRoomSplit(Base):
    assignment_id: UUID
    location_id: UUID
    student_count: int
```

---

## Migration Strategy

1. Create new models alongside old ones (do NOT delete old tables yet)
2. Write a migration script that copies existing academic data into new generic models:
   - Teachers → Resources (resource_type = "teacher")
   - Subjects → Tasks (task_type = "subject")
   - Sections → Groups (group_type = "section")
   - Rooms → Locations (location_type = "classroom")
   - Labs → Locations (location_type = "lab")
   - Periods → TimeSlots
3. Run migration on dev, verify data integrity
4. Update all API routes to use new models
5. Delete old academic-specific tables in a follow-up migration

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
        resources = filter(resources, type="teacher")
        tasks = filter(tasks, type="subject")
        ...
```

Each preset will have its own adapter in Phase 4.

---

## Files to Create / Modify

### New Files
- `backend/app/models/resource.py`
- `backend/app/models/task.py`
- `backend/app/models/group.py`
- `backend/app/models/location.py`
- `backend/app/models/timeslot.py`
- `backend/app/models/assignment.py`
- `backend/app/models/constraint_rule.py`
- `backend/app/models/schedule_run.py`
- `backend/app/models/workspace.py`
- `backend/app/api/workspaces.py` (new generic router)
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
- [ ] Section-room split model exists in Assignment
