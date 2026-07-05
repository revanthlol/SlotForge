# Phase 8 — Constraint Playground (Rule Templates)

**Agent:** Antigravity (backend constraint compiler + solver mapping) + Codex (UI)  
**Depends on:** Phase 7 (conflict engine), Phase 4 (domain presets)  
**Blocks:** Nothing  
**Estimated effort:** Large (4–5 days)

---

## Goal

Build the **Constraint Playground** — a UI where admins can define custom
scheduling rules using pre-built templates, without writing any code.

This is one of the key innovation features: it makes SlotForge configurable
instead of having hardcoded solver rules. Think of it like GitHub Actions
workflow rules — you pick a template, configure the parameters, and it runs.

---

## What It Is NOT

- ❌ Not a scripting language or DSL
- ❌ Not a visual node-based rule editor (too complex)
- ✅ A template gallery where each template has configurable parameters

---

## Constraint Template Registry

```python
# backend/app/services/constraints/registry.py

CONSTRAINT_TEMPLATES = {
    # ── Hard constraints ──────────────────────────────────
    "no_teacher_double_booking": {
        "name": "No Teacher Double-Booking",
        "description": "A teacher cannot be assigned to two classes at the same time.",
        "type": "hard",
        "parameters": [],
        "solver_fn": "hard_no_resource_clash",
    },
    "no_room_double_booking": {
        "name": "No Room Double-Booking",
        "description": "A room cannot host two classes at the same time.",
        "type": "hard",
        "parameters": [],
        "solver_fn": "hard_no_location_clash",
    },
    "weekly_subject_hours": {
        "name": "Weekly Hours Requirement",
        "description": "Each subject must be scheduled for its configured weekly hours.",
        "type": "hard",
        "parameters": [],
        "solver_fn": "hard_weekly_hours",
    },
    "lab_continuous_slots": {
        "name": "Lab Continuous Block",
        "description": "Lab sessions must occupy 2 consecutive periods.",
        "type": "hard",
        "parameters": [{"key": "block_size", "label": "Block Size", "type": "int", "default": 2}],
        "solver_fn": "hard_continuous_slots",
    },
    "teacher_availability": {
        "name": "Teacher Availability",
        "description": "A teacher can only be assigned during their available periods.",
        "type": "hard",
        "parameters": [],
        "solver_fn": "hard_resource_availability",
    },

    # ── Soft constraints ──────────────────────────────────
    "avoid_consecutive_same_subject": {
        "name": "Avoid Consecutive Same Subject",
        "description": "Don't schedule the same subject back-to-back for a section.",
        "type": "soft",
        "parameters": [
            {"key": "penalty", "label": "Penalty Score", "type": "int", "default": 5}
        ],
        "solver_fn": "soft_avoid_consecutive_same_task",
    },
    "avoid_last_period": {
        "name": "Avoid Last Period (Resource)",
        "description": "Prefer not to schedule a specific teacher/resource in the last period.",
        "type": "soft",
        "parameters": [
            {"key": "resource_id", "label": "Resource", "type": "resource_picker"},
            {"key": "penalty", "label": "Penalty Score", "type": "int", "default": 3},
        ],
        "solver_fn": "soft_avoid_last_slot",
    },
    "prefer_morning_labs": {
        "name": "Prefer Morning Labs",
        "description": "Lab sessions should be scheduled in morning periods when possible.",
        "type": "soft",
        "parameters": [
            {"key": "morning_threshold", "label": "Morning periods (up to)", "type": "int", "default": 3},
            {"key": "penalty", "label": "Penalty Score", "type": "int", "default": 4},
        ],
        "solver_fn": "soft_prefer_early_slot",
    },
    "limit_daily_load": {
        "name": "Limit Daily Teaching Load",
        "description": "Don't give a teacher more than N periods per day.",
        "type": "soft",
        "parameters": [
            {"key": "max_periods_per_day", "label": "Max periods/day", "type": "int", "default": 4},
            {"key": "penalty", "label": "Penalty Score", "type": "int", "default": 5},
        ],
        "solver_fn": "soft_daily_load_limit",
    },
    "reserve_period_for_assembly": {
        "name": "Reserve Period (e.g., Assembly)",
        "description": "Block a specific day + period from any scheduling.",
        "type": "hard",
        "parameters": [
            {"key": "day", "label": "Day", "type": "day_picker"},
            {"key": "period", "label": "Period Number", "type": "int"},
            {"key": "label", "label": "Label (e.g., Assembly)", "type": "str"},
        ],
        "solver_fn": "hard_block_slot",
    },
    "avoid_section_overload_day": {
        "name": "Avoid Section Overload on One Day",
        "description": "A section should not have more than N periods on any single day.",
        "type": "soft",
        "parameters": [
            {"key": "max_periods_per_day", "label": "Max periods/day", "type": "int", "default": 5},
            {"key": "penalty", "label": "Penalty Score", "type": "int", "default": 6},
        ],
        "solver_fn": "soft_group_daily_load",
    },
    "room_capacity_required": {
        "name": "Room Capacity Requirement",
        "description": "Room capacity must be ≥ section size for every assignment.",
        "type": "hard",
        "parameters": [],
        "solver_fn": "hard_capacity_constraint",
    },
}
```

---

## Constraint Compiler

The compiler takes a `ConstraintRule` from the DB (with template_key + parameters)
and converts it into solver-compatible constraints:

```python
class ConstraintCompiler:
    def compile(self, rule: ConstraintRule) -> SolverConstraint:
        template = CONSTRAINT_TEMPLATES[rule.template_key]
        solver_fn = SOLVER_FUNCTIONS[template["solver_fn"]]
        return solver_fn(
            workspace_id=rule.workspace_id,
            parameters=rule.parameters,
            penalty=rule.penalty,
            priority=rule.priority,
        )

    def compile_all(self, workspace_id: UUID) -> list[SolverConstraint]:
        rules = self.get_active_rules(workspace_id)
        return [self.compile(r) for r in rules]
```

---

## API Endpoints

```
GET  /api/v1/constraint-templates/
     → list all available templates with their parameter schemas

GET  /api/v1/workspaces/{id}/constraints/
     → list all active constraint rules for this workspace

POST /api/v1/workspaces/{id}/constraints/
     body: { template_key, parameters, priority, penalty, enabled }
     → create a new constraint rule

PATCH /api/v1/workspaces/{id}/constraints/{rule_id}
     → update a constraint rule (enable/disable, change params)

DELETE /api/v1/workspaces/{id}/constraints/{rule_id}

POST /api/v1/workspaces/{id}/constraints/preview
     body: { rule } 
     → dry-run: what impact does this rule have? (uses impact-analysis from Phase 7)
```

---

## Frontend — Constraint Playground UI

```
Constraint Playground
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Active Rules:
[✓] No Teacher Double-Booking                    [Hard] [Remove]
[✓] No Room Double-Booking                       [Hard] [Remove]
[✓] Weekly Hours Requirement                     [Hard] [Remove]
[✓] Lab Continuous Block (size: 2)               [Hard] [Edit] [Remove]
[✓] Avoid Consecutive Same Subject (penalty: 5)  [Soft] [Edit] [Remove]
[✓] Prefer Morning Labs (periods 1-3, penalty:4) [Soft] [Edit] [Remove]
[•] Limit Daily Load (max: 4/day, penalty: 5)    [Soft] [Edit] [Remove]

+ Add Rule
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Template Gallery:
[Search rules...]

Hard Rules:
  • Teacher Availability
  • Room Capacity Requirement
  • Reserve Period for Assembly

Soft Rules:
  • Avoid Last Period (Resource)
  • Avoid Section Overload on One Day
  • ... (more templates)
```

### Rule Configuration Modal

When adding/editing a rule with parameters:

```
Add Rule: "Reserve Period for Assembly"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Description:
Block a specific day + period from any scheduling.

Configuration:
Day:        [Monday ▼]
Period:     [2]
Label:      [Assembly / Prayer]

Type: Hard   (cannot be overridden by solver)

[Preview Impact]   [Add Rule]   [Cancel]
```

### Preview Impact

Clicking "Preview Impact" calls the `/constraints/preview` endpoint and shows:

```
Preview: "Reserve Period for Assembly" (Monday Period 2)

Impact on current workspace:
• 3 existing assignments will be moved to other periods
• Affected: BSc CS-A Period 2 Monday (Maths), BSc CS-B Period 2 Monday (Physics), ...
• No infeasibility created — enough free slots exist

[Confirm Add Rule]   [Cancel]
```

---

## Files to Create

### Backend (Antigravity)
- `backend/app/services/constraints/registry.py`
- `backend/app/services/constraints/compiler.py`
- `backend/app/services/constraints/solver_functions.py`
- `backend/app/api/constraints.py`

### Frontend (Codex)
- `features/constraints/ConstraintPlaygroundPage.tsx`
- `features/constraints/ActiveRulesList.tsx`
- `features/constraints/TemplateGallery.tsx`
- `features/constraints/RuleConfigModal.tsx`
- `features/constraints/PreviewImpactPanel.tsx`
- `features/constraints/hooks/useConstraints.ts`

---

## Done Criteria

- [ ] Template registry has all 12 templates listed above
- [ ] Constraint compiler correctly maps template + params → solver constraints
- [ ] Active rules are stored in DB and loaded on solver run
- [ ] All solver runs use the compiled rules from the playground (not hardcoded)
- [ ] Frontend shows active rules with enable/disable toggle
- [ ] Template gallery allows browsing and adding new rules
- [ ] Rule parameters are configurable via a form modal
- [ ] "Preview Impact" shows what existing assignments would be affected
- [ ] Soft constraints correctly affect solver score / penalty
