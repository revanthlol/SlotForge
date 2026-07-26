from typing import Any, Dict

CONSTRAINT_TEMPLATES: Dict[str, Dict[str, Any]] = {
    # ── Hard constraints ──────────────────────────────────
    "no_teacher_double_booking": {
        "key": "no_teacher_double_booking",
        "name": "No Teacher Double-Booking",
        "description": "A teacher cannot be assigned to two classes at the same time.",
        "type": "hard",
        "parameters": [],
        "solver_fn": "hard_no_resource_clash",
    },
    "no_room_double_booking": {
        "key": "no_room_double_booking",
        "name": "No Room Double-Booking",
        "description": "A room cannot host two classes at the same time.",
        "type": "hard",
        "parameters": [],
        "solver_fn": "hard_no_location_clash",
    },
    "weekly_subject_hours": {
        "key": "weekly_subject_hours",
        "name": "Weekly Hours Requirement",
        "description": "Each subject must be scheduled for its configured weekly hours.",
        "type": "hard",
        "parameters": [],
        "solver_fn": "hard_weekly_hours",
    },
    "lab_continuous_slots": {
        "key": "lab_continuous_slots",
        "name": "Lab Continuous Block",
        "description": "Lab sessions must occupy consecutive periods.",
        "type": "hard",
        "parameters": [{"key": "block_size", "label": "Block Size", "type": "int", "default": 2}],
        "solver_fn": "hard_continuous_slots",
    },
    "teacher_availability": {
        "key": "teacher_availability",
        "name": "Teacher Availability",
        "description": "A teacher can only be assigned during their available periods.",
        "type": "hard",
        "parameters": [],
        "solver_fn": "hard_resource_availability",
    },
    "reserve_period_for_assembly": {
        "key": "reserve_period_for_assembly",
        "name": "Reserve Period (e.g., Assembly)",
        "description": "Block a specific day + period from any scheduling.",
        "type": "hard",
        "parameters": [
            {"key": "day", "label": "Day", "type": "day_picker"},
            {"key": "period", "label": "Period Number", "type": "int", "default": 1},
            {"key": "label", "label": "Label (e.g., Assembly)", "type": "str", "default": "Assembly"},
        ],
        "solver_fn": "hard_block_slot",
    },
    "room_capacity_required": {
        "key": "room_capacity_required",
        "name": "Room Capacity Requirement",
        "description": "Room capacity must be ≥ section size for every assignment.",
        "type": "hard",
        "parameters": [],
        "solver_fn": "hard_capacity_constraint",
    },

    # ── Soft constraints ──────────────────────────────────
    "avoid_consecutive_same_subject": {
        "key": "avoid_consecutive_same_subject",
        "name": "Avoid Consecutive Same Subject",
        "description": "Don't schedule the same subject back-to-back for a section.",
        "type": "soft",
        "parameters": [
            {"key": "penalty", "label": "Penalty Score", "type": "int", "default": 5}
        ],
        "solver_fn": "soft_avoid_consecutive_same_task",
    },
    "avoid_last_period": {
        "key": "avoid_last_period",
        "name": "Avoid Last Period (Resource)",
        "description": "Prefer not to schedule a specific teacher/resource in the last period.",
        "type": "soft",
        "parameters": [
            {"key": "resource_id", "label": "Resource", "type": "resource_picker", "default": ""},
            {"key": "penalty", "label": "Penalty Score", "type": "int", "default": 3},
        ],
        "solver_fn": "soft_avoid_last_slot",
    },
    "prefer_morning_labs": {
        "key": "prefer_morning_labs",
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
        "key": "limit_daily_load",
        "name": "Limit Daily Teaching Load",
        "description": "Don't give a teacher more than N periods per day.",
        "type": "soft",
        "parameters": [
            {"key": "max_periods_per_day", "label": "Max periods/day", "type": "int", "default": 4},
            {"key": "penalty", "label": "Penalty Score", "type": "int", "default": 5},
        ],
        "solver_fn": "soft_daily_load_limit",
    },
    "avoid_section_overload_day": {
        "key": "avoid_section_overload_day",
        "name": "Avoid Section Overload on One Day",
        "description": "A section should not have more than N periods on any single day.",
        "type": "soft",
        "parameters": [
            {"key": "max_periods_per_day", "label": "Max periods/day", "type": "int", "default": 5},
            {"key": "penalty", "label": "Penalty Score", "type": "int", "default": 6},
        ],
        "solver_fn": "soft_group_daily_load",
    },
}
