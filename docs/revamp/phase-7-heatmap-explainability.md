# Phase 7 — Conflict Heatmap + Explainable Scheduling

**Agent:** Antigravity (backend analysis + explainability engine) + Codex (heatmap UI)  
**Depends on:** Phase 0 (schema), Phase 1 (solver working)  
**Blocks:** Phase 8 (Constraint Playground uses the same conflict engine)  
**Estimated effort:** Large (3–5 days)

---

## Goal

Replace the current **fake/frontend-only heatmap** with a real, data-driven
**conflict heatmap** that shows scheduling pressure BEFORE generation and
violation analysis AFTER generation. Add **explainable scheduling** — plain
English explanations for why things failed or succeeded.

This also powers the GitHub-style conflict detection: when you make a change
(like adding a constraint or modifying a teacher's availability), instantly
show what conflicts that creates — just like GitHub shows conflicts when merging.

---

## Two Modes of the Heatmap

### Mode 1: Pre-Generation Pressure Analysis

Run BEFORE the solver. Detects how hard the scheduling problem is.

```
Resource Pressure Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 CRITICAL  Lab 1: needs 18 periods, only 12 valid slots available
🟠 HIGH      Dr. Kumar: teaching load 28h/week vs 24h available
🟡 MEDIUM    Room 205: demand 35 slots vs 40 slots available (87%)
🟢 LOW       Room 101: demand 20 slots vs 40 available (50%)

Teacher Load Pressure:        [████████░░] 78%
Room Demand Pressure:         [██████░░░░] 62%
Lab Availability Pressure:    [█████████░] 91%  ← HIGH RISK
Section Weekly-Hour Pressure: [████░░░░░░] 45%
```

### Mode 2: Post-Generation Violation Analysis

Run AFTER solver completes. Shows what soft constraints were violated.

```
Schedule Quality Report  (Score: 74/100)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠ 3 soft constraint violations:
  • Dr. Patel has back-to-back Physics periods on Tuesday (avoid-consecutive rule)
  • Section BSc CS-B has 5 periods on Monday (overloaded day)
  • Lab 2 used in last period on Friday (prefer-morning-labs rule violated)

Timetable Grid Heatmap:
         Period 1    Period 2    Period 3    Period 4    Period 5
Mon      ████████    ██████░░    ████████    ████████    ██░░░░░░
Tue      ████████    ░░░░░░░░    ████████    ████░░░░    ████████
Wed      ░░░░░░░░    ████████    ████░░░░    ░░░░░░░░    ████░░░░
Thu      ████░░░░    ████████    ░░░░░░░░    ████████    ████░░░░
Fri      ████████    ████░░░░    ████░░░░    ░░░░░░░░    ░░░░░░░░
(Color: dark = high utilization, light = free)
```

---

## GitHub-style Live Conflict Detection

When a user **modifies** any entity (teacher availability, constraint, etc.),
immediately show what conflicts arise — before they even run the solver.

```
User changed: Dr. Smith availability (removed Tuesday)

Impact Analysis:
⚠ 3 subjects currently scheduled on Tuesday require Dr. Smith
  • Maths — BSc CS-A — Tuesday Period 2
  • Maths — BSc CS-B — Tuesday Period 4
  • Physics — BSc CS-C — Tuesday Period 1

These would become unschedulable. Re-run solver or reassign these manually.

[Re-run Solver]   [Reassign Manually]   [Cancel Change]
```

This should appear as a **conflict panel** that slides in (like GitHub's merge conflict view).

---

## Explainable Scheduling — Failure Messages

When the solver fails (INFEASIBLE result), generate plain-English explanation:

```
❌ Timetable Generation Failed

Reasons:
1. Section BSc CS-A requires 42 weekly periods.
   → The configured week has only 36 usable periods (6 days × 6 periods).
   → You need to either reduce subjects by 6 hours or add more periods.

2. Physics Lab requires 2 consecutive periods for each session.
   → Physics Lab has 4 sessions needed.
   → Only 2 valid consecutive-period slots exist in the schedule.
   → Consider adding a continuous block on Thursday or Friday.

3. Dr. Kumar is the only teacher for Mathematics.
   → Mathematics needs 8 periods across 4 sections.
   → Dr. Kumar is available for only 6 periods (Wednesday unavailable).
   → Assign a second teacher to Mathematics or remove 2 periods.

Suggested fixes:
• Add 1 more period per day (6 → 7 periods)
• Assign Physics Lab to a 2-period morning slot on Mon or Wed
• Add Mr. Sharma as a co-teacher for Mathematics
```

---

## Explainable Scheduling — Assignment Explanation

On hover or click, show WHY a specific assignment was placed there:

```
Maths — Dr. Kumar — BSc CS-A — Monday Period 2
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Placed here because:
✓ Dr. Kumar is available on Monday Period 2
✓ BSc CS-A has no other class at this time
✓ Room 101 is free (capacity 60 ≥ section size 55)
✓ Mathematics still needed 6 more weekly hours at this point
✓ Constraint "Prefer morning periods for theory" satisfied
```

---

## Backend — Analysis Endpoints

```
# Pre-generation pressure analysis
POST /api/v1/workspaces/{id}/heatmap/pressure
     → SchedulingPressureReport

# Post-generation violation report
GET  /api/v1/workspaces/{id}/schedule-runs/{run_id}/heatmap/violations
     → ViolationReport

# Live conflict detection on entity change
POST /api/v1/workspaces/{id}/impact-analysis
     body: { change_type: "teacher_availability", entity_id, new_value }
     → ImpactAnalysisReport

# Assignment explanation
GET  /api/v1/workspaces/{id}/schedule-runs/{run_id}/assignments/{id}/explanation
     → AssignmentExplanation
```

---

## Backend — Pressure Analysis Engine

```python
class SchedulingPressureAnalyzer:
    def analyze(self, workspace_id: UUID) -> SchedulingPressureReport:
        report = SchedulingPressureReport()
        
        # Teacher load pressure
        for teacher in self.get_teachers(workspace_id):
            required_hours = sum(s.hours for s in teacher.subjects)
            available_slots = count_available_slots(teacher.availability)
            report.add_pressure("teacher", teacher.name, required_hours, available_slots)
        
        # Room demand pressure
        for room in self.get_rooms(workspace_id):
            demand = count_room_demand(workspace_id, room.id)
            capacity = count_available_slots(room)
            report.add_pressure("room", room.name, demand, capacity)
        
        # Lab availability pressure (continuous slots needed)
        for lab in self.get_labs(workspace_id):
            needed_blocks = count_lab_sessions(workspace_id, lab.id)
            available_blocks = count_consecutive_slots(lab)
            report.add_pressure("lab", lab.name, needed_blocks, available_blocks)
        
        return report
```

---

## Frontend — Heatmap Component

```
features/heatmap/
├── HeatmapPage.tsx            # main heatmap page
├── PressureAnalysisView.tsx   # pre-generation bars + warnings
├── ViolationReport.tsx        # post-generation violation list
├── TimetableHeatGrid.tsx      # the colored grid visualization
├── ConflictPanel.tsx          # GitHub-style slide-in conflict panel
├── AssignmentExplanation.tsx  # hover tooltip / modal
└── hooks/
    ├── usePressureAnalysis.ts
    ├── useViolationReport.ts
    └── useImpactAnalysis.ts
```

---

## Done Criteria

- [ ] Pre-generation pressure analysis returns real data (not fake frontend data)
- [ ] Pressure is shown as color-coded bars with specific numbers and warnings
- [ ] Post-generation violation report lists all soft constraint violations
- [ ] Timetable grid heatmap colors cells by utilization level
- [ ] Infeasibility explanation shows specific plain-English reasons with fix suggestions
- [ ] Assignment explanation shows WHY each slot was chosen (on hover/click)
- [ ] GitHub-style conflict panel appears when any entity is modified
- [ ] All analysis runs in < 2 seconds for typical academic timetable sizes
