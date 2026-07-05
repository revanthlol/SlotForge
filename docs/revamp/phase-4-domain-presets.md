# Phase 4 — 5 Domain Presets (Full In-Depth)

**Agent:** Antigravity (backend solver adapters) + Codex (preset UI)  
**Depends on:** Phase 0 (generic schema)  
**Blocks:** Phase 5, Phase 8  
**Estimated effort:** Large (4–6 days)

---

## Goal

Implement all **5 domain presets** fully:
1. Academic Timetable (already started in Phase 1 — extend here)
2. Staff Roster / Shift Scheduling
3. Event / Conference Scheduling
4. Exam Scheduling
5. Facility / Room Booking

Each preset needs:
- Backend: SolverAdapter, preset config endpoint, default constraints
- Frontend: Preset-specific resource/task labels and forms

---

## Shared Preset Architecture

All presets share the same generic models from Phase 0.
The preset only changes **labels**, **required fields**, and **default constraints**.

```python
# backend/app/services/preset_registry.py

PRESET_REGISTRY = {
    "academic":      AcademicPreset,
    "staff_roster":  StaffRosterPreset,
    "event":         EventPreset,
    "exam":          ExamPreset,
    "facility":      FacilityPreset,
}

class BasePreset:
    key: str
    name: str
    description: str
    resource_types: list[ResourceTypeDef]
    task_types: list[TaskTypeDef]
    group_types: list[GroupTypeDef]
    location_types: list[LocationTypeDef]
    time_unit: str
    default_constraints: list[str]
    solver_adapter: type[BaseSolverAdapter]
```

---

## Preset 1: Academic Timetable (extend from Phase 1)

Already implemented in Phase 1. Additions here:
- Faculty timetable endpoint is used in Phase 5
- Section-room split already in Phase 1

**Entities:** Teachers, Subjects, Sections, Rooms, Labs, Periods  
**Key constraints:** No double-booking, weekly hours, lab blocks, section-room split capacity

---

## Preset 2: Staff Roster / Shift Scheduling

**Entities:**
- Resources: Employees (name, role, max_hours_per_week, availability)
- Tasks: Shifts (name, start_time, end_time, required_roles: {role: count})
- Groups: Departments
- TimeSlots: Shift blocks per day

**Default Constraints:**

| Constraint | Type |
|---|---|
| No employee double-booked in same shift | Hard |
| Required roles per shift must be covered | Hard |
| Max weekly hours per employee | Hard |
| Employee availability windows respected | Hard |
| Min rest between shifts (e.g., 8 hrs) | Hard |
| Prefer balanced shift distribution | Soft |
| Avoid same employee for night + morning consecutively | Soft |

**SolverAdapter logic:**
```python
class StaffRosterAdapter(BaseSolverAdapter):
    def build_input(self, workspace_id):
        employees = self.get_resources(workspace_id, type="employee")
        shifts = self.get_tasks(workspace_id, type="shift")
        # For each shift, get required role coverage
        # Build CP-SAT model: assign employee to shift slot
        ...
```

**Timetable Output:**
```
Week: Jun 10–16
Employee      Mon      Tue      Wed      Thu      Fri
Alice         Morning  Morning  Off      Night    Morning
Bob           Night    Off      Morning  Morning  Night
Carol         Off      Evening  Evening  Off      Evening
```

---

## Preset 3: Event / Conference Scheduling

**Entities:**
- Resources: Speakers (name, topic_expertise, availability)
- Tasks: Sessions (name, topic, duration_slots, speaker_id)
- Groups: Track / Theme (e.g., "AI Track", "Web Track")
- Locations: Halls (name, capacity, equipment)
- TimeSlots: Conference time blocks (e.g., "Day 1 10:00–11:00")

**Default Constraints:**

| Constraint | Type |
|---|---|
| Speaker can't be in 2 sessions at same time | Hard |
| Hall capacity ≥ expected audience | Hard |
| Sessions in same track don't overlap | Hard |
| Speaker availability windows | Hard |
| Speaker doesn't give consecutive sessions with no break | Soft |
| Popular sessions prefer larger halls | Soft |

**SolverAdapter logic:**
```python
class EventSchedulingAdapter(BaseSolverAdapter):
    def build_input(self, workspace_id):
        speakers = self.get_resources(workspace_id, type="speaker")
        sessions = self.get_tasks(workspace_id, type="session")
        halls = self.get_locations(workspace_id, type="hall")
        # Assign session → hall × timeslot
        # Respect speaker constraints
        ...
```

**Timetable Output:**
```
Time Block    Hall A            Hall B           Hall C
Day1 10:00    Keynote: AI 2030  Web Performance  —
Day1 11:00    LLM Workshop      React Patterns   Cloud Security
Day1 12:00    Lunch Break       Lunch Break      Lunch Break
```

---

## Preset 4: Exam Scheduling

**Entities:**
- Resources: Invigilators (name, department, availability)
- Tasks: Exams / Courses (name, student_count, duration_slots)
- Groups: Student Groups / Programs (to detect clash — same students can't have 2 exams at same time)
- Locations: Halls (capacity, accessibility)
- TimeSlots: Exam blocks (date + time)

**Default Constraints:**

| Constraint | Type |
|---|---|
| No student has 2 exams in same slot | Hard |
| Hall capacity ≥ student count | Hard |
| Invigilator not double-booked | Hard |
| Invigilator availability | Hard |
| Exams for same program spread across days | Soft |
| Accessible halls for students with disabilities | Soft |

**SolverAdapter logic:**
```python
class ExamSchedulingAdapter(BaseSolverAdapter):
    def build_input(self, workspace_id):
        courses = self.get_tasks(workspace_id, type="exam")
        halls = self.get_locations(workspace_id)
        # Build student-course conflict matrix
        # Assign exam → hall × timeslot
        ...
```

**Timetable Output:**
```
Date      Time     Course          Hall    Invigilator
Jun 10    09:00    Mathematics     A101    Prof. Kumar
Jun 10    09:00    Chemistry       B203    Dr. Patel
Jun 10    14:00    Physics         A101    Prof. Kumar
Jun 11    09:00    English         B203    Dr. Patel
```

---

## Preset 5: Facility / Room Booking

**Entities:**
- Resources: Rooms / Facilities (name, capacity, equipment, type)
- Tasks: Bookings (name, requester, purpose, duration)
- Groups: Departments / Teams (who can book what)
- TimeSlots: Time blocks (business hours per day)

**Default Constraints:**

| Constraint | Type |
|---|---|
| Room can only have one booking per time slot | Hard |
| Booking duration ≤ max allowed | Hard |
| Room equipment must match booking requirements | Hard |
| Advance booking window respected | Hard |
| Prefer smaller rooms for smaller groups | Soft |

**Note:** This preset doesn't use the CP-SAT solver in the same way.
It's more of a **booking management system** with conflict detection.
The solver is optional — use a greedy availability algorithm instead.

**UI Output:**
```
Room      Mon 09:00   Mon 10:00   Mon 11:00   Mon 14:00
Conf A    Available   [Booked]    [Booked]    Available
Conf B    [Booked]    Available   Available   [Booked]
Lab 1     Available   Available   [Booked]    Available
```

---

## Frontend — Preset-Aware UI

The frontend must be **aware of the active preset** and show correct labels:

```typescript
// hooks/usePresetConfig.ts
export const usePresetConfig = (workspaceId: string) => {
  const { data: workspace } = useWorkspace(workspaceId);
  const preset = PRESET_CONFIGS[workspace?.domainPreset ?? 'academic'];
  return preset;
};

// components/ResourceTable.tsx — uses preset labels
const { resourceLabel } = usePresetConfig(workspaceId);
// Shows "Teachers" for academic, "Employees" for staff_roster, etc.
```

---

## Files to Create / Modify

### Backend (Antigravity)
- `backend/app/services/presets/__init__.py`
- `backend/app/services/presets/base.py`
- `backend/app/services/presets/staff_roster.py`
- `backend/app/services/presets/event.py`
- `backend/app/services/presets/exam.py`
- `backend/app/services/presets/facility.py`
- `backend/app/api/presets.py` — GET /presets/, GET /presets/{key}/config

### Frontend (Codex)
- `frontend/src/features/presets/PresetConfigs.ts`
- `frontend/src/features/presets/hooks/usePresetConfig.ts`
- `frontend/src/features/presets/PresetSelector.tsx`

---

## Done Criteria

- [ ] All 5 preset configs returned correctly from `/api/v1/presets/`
- [ ] SolverAdapters implemented for Academic, Staff Roster, Event, Exam
- [ ] Facility preset uses booking conflict detection (not full solver)
- [ ] Frontend uses preset config to show correct labels throughout
- [ ] At least 2 non-academic presets can generate a valid schedule end-to-end
- [ ] All default constraints registered in the constraint template registry
