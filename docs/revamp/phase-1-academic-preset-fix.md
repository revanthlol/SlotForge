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

```python
# In the Assignment model, location_ids is already a list.
# Add metadata for the split:
{
  "assignment_id": "...",
  "task": "Mathematics",
  "resource": "Dr. Smith",
  "group": "BSc CS-A",
  "timeslot": "Monday Period 2",
  "location_ids": ["room-101", "room-102"],
  "split_config": {
    "room-101": { "student_count": 60, "sub_group": "A1" },
    "room-102": { "student_count": 60, "sub_group": "A2" }
  }
}
```

### UI Behaviour (for Codex in Phase 2/3)
- When adding a section, show a toggle: "Split across multiple rooms?"
- If toggled ON, allow specifying sub-groups and room assignments
- Timetable view shows the section as one row, with room split shown as a chip

---

## Solver Adapter — Academic

The AcademicSolverAdapter translates the generic workspace data into what
the CP-SAT solver expects:

```python
class AcademicSolverAdapter:
    def build_input(self, workspace_id: UUID) -> SolverInput:
        return SolverInput(
            teachers=self.get_resources(workspace_id, type="teacher"),
            subjects=self.get_tasks(workspace_id, type="subject"),
            sections=self.get_groups(workspace_id, type="section"),
            rooms=self.get_locations(workspace_id, type=["classroom", "lab"]),
            periods=self.get_timeslots(workspace_id),
            constraints=self.get_constraints(workspace_id),
        )

    def translate_output(self, solver_result: RawSolverResult) -> list[Assignment]:
        """Map solver output back to generic Assignment records"""
        ...
```

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
- `backend/app/services/presets/academic.py` — AcademicSolverAdapter
- `backend/app/api/presets/academic.py` — preset-specific routes

### Modified Files
- `backend/app/solver/solver.py` — use adapter pattern
- `backend/app/solver/constraints.py` — add section-room split constraint
- `backend/app/models/assignment.py` — ensure split_config in metadata

---

## Done Criteria

- [ ] Academic preset config endpoint returns correct schema
- [ ] Timetable generation works end-to-end using new generic schema
- [ ] Section-room split is supported: an assignment can reference multiple locations
- [ ] All 7 constraints in the table above are tested and passing
- [ ] Faculty timetable endpoint (`/faculty/{resource_id}/timetable`) returns correct data
- [ ] Solver output stored correctly as `Assignment` records in the DB
