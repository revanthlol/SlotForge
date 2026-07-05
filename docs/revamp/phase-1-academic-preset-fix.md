# Phase 1 — Academic Preset Fix + Section-Room Feature

**Agent:** Antigravity  
**Depends on:** Phase 0 (generic schema must be complete)  
**Blocks:** Phase 3 (Onboarding), Phase 5 (Faculty Timetable)  
**Estimated effort:** Medium (2–3 days)

---

## Goal

Make the **Academic Timetable preset** work fully and correctly on top of the
new generic schema from Phase 0. Add the **section-room split** feature
(one section, taught in different classrooms per period). Fix the solver
adapter so timetable generation is reliable.

---

## Academic Preset Definition

```json
{
  "preset_key": "academic",
  "name": "Academic Timetable",
  "resources": [
    { "type": "teacher", "label": "Teachers", "required": true },
    { "type": "room", "label": "Classrooms", "required": true },
    { "type": "lab", "label": "Labs", "required": false }
  ],
  "tasks": [
    { "type": "subject", "label": "Subjects", "required": true }
  ],
  "groups": [
    { "type": "section", "label": "Sections", "required": true }
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
```

---

## Section-Room Split Feature

### The Problem
Most colleges have **one section** (e.g., BSc CS-A with 120 students) that is
taught together but physically split across **multiple classrooms** for the same
period because no single room holds 120 students.

### Data Model (on top of Phase 0)
Using the `assignment_locations` join table, one assignment can link to multiple locations. Each link stores split-specific metadata:
- `assignment_id` (foreign key to `assignments.id`)
- `location_id` (foreign key to `locations.id`)
- `student_count` (integer, nullable)
- `sub_group` (string, nullable)
- `capacity_contribution` (integer, nullable)

---

## Solver Adapter — Academic

The `AcademicSolverAdapter` translates generic workspace models into what `app.solver.engine.py` and `app.solver.models.ProblemInstance` expect. It maps solver outputs back to generic `Assignment` and `AssignmentLocation` records.

---

## API Endpoints to Wire Up

```
GET  /api/v1/workspaces/{id}/presets/academic/config
POST /api/v1/workspaces/{id}/schedule-runs/            (trigger solve)
GET  /api/v1/workspaces/{id}/schedule-runs/{run_id}/assignments
GET  /api/v1/workspaces/{id}/schedule-runs/{run_id}/timetable
     → returns full timetable grid (group × timeslot → assignment)
GET  /api/v1/workspaces/{id}/schedule-runs/{run_id}/faculty/{resource_id}/timetable
     → individual teacher timetable (used in Phase 5)
```

---

## Constraint Fixes

The following constraints must be working correctly after this phase:

| Constraint | Type | Description |
|---|---|---|
| No teacher double-booking | Hard | Teacher can't be in 2 places at same time |
| No room double-booking | Hard | Room can't have 2 assignments in same slot |
| Weekly subject hours | Hard | Each subject's required hours must be met |
| Lab continuous slots | Hard | Lab sessions must occupy 2 consecutive periods |
| Section room split capacity | Hard | Total room capacity ≥ section size |
| Teacher availability | Soft | Respect teacher's unavailable slots |
| Avoid consecutive periods (same subject) | Soft | Don't schedule same subject back-to-back |

---

## Files to Create / Modify

### New Files
- `backend/app/services/presets/academic.py` — AcademicSolverAdapter (or update `backend/app/services/solver_adapter.py`)
- `backend/app/api/routes/workspaces.py` — workspace & preset-specific routes

### Modified Files
- `backend/app/solver/engine.py` — CP-SAT model building, section-room split constraint
- `backend/app/models/assignment.py` — update `AssignmentLocation` model to include `capacity_contribution`
- `backend/app/services/timetable_service.py` — update to use solver adapter and save `AssignmentLocation` records

---

## Done Criteria

- [ ] Academic preset config endpoint returns correct schema
- [ ] Timetable generation works end-to-end using new generic schema
- [ ] Section-room split is supported: an assignment can reference multiple locations through `assignment_locations` with split metadata
- [ ] All 7 constraints in the table above are tested and passing
- [ ] Faculty timetable endpoint (`/faculty/{resource_id}/timetable`) returns correct data
- [ ] Solver output stored correctly as `Assignment` and `AssignmentLocation` records in the DB

