from fastapi import APIRouter, HTTPException

router = APIRouter()

PRESETS = [
    {
        "key": "academic",
        "name": "Academic Timetable",
        "description": "Teachers, subjects, sections, rooms, labs, and period-based timetables.",
    },
    {
        "key": "staff_roster",
        "name": "Staff Roster",
        "description": "Employees, departments, shifts, roles, and coverage requirements.",
    },
    {
        "key": "event",
        "name": "Event Scheduling",
        "description": "Speakers, sessions, halls, volunteers, and event time blocks.",
    },
    {
        "key": "exam",
        "name": "Exam Scheduling",
        "description": "Courses, halls, invigilators, exam slots, and clash prevention.",
    },
    {
        "key": "facility",
        "name": "Facility Booking",
        "description": "Facilities, requesters, booking windows, and reservation rules.",
    },
]

PRESET_CONFIGS = {
    "academic": {
        "preset_key": "academic",
        "name": "Academic Timetable",
        "resources": [
            {"type": "teacher", "label": "Teachers", "required": True},
        ],
        "tasks": [
            {"type": "subject", "label": "Subjects", "required": True},
        ],
        "groups": [
            {"type": "section", "label": "Sections", "required": True, "supports_room_split": True},
        ],
        "locations": [
            {"type": "classroom", "label": "Classrooms", "required": True},
            {"type": "lab", "label": "Labs", "required": False},
        ],
        "time_unit": "periods",
        "default_constraints": [
            "no_teacher_double_booking",
            "no_room_double_booking",
            "weekly_subject_hours",
            "lab_continuous_slots",
            "section_room_split_capacity",
        ],
    },
    "staff_roster": {
        "preset_key": "staff_roster",
        "name": "Staff Roster",
        "resources": [{"type": "employee", "label": "Employees", "required": True}],
        "tasks": [{"type": "coverage", "label": "Coverage Requirements", "required": True}],
        "groups": [{"type": "department", "label": "Departments", "required": True}],
        "locations": [{"type": "work_zone", "label": "Work Zones", "required": False}],
        "time_unit": "shifts",
        "default_constraints": ["coverage_per_shift", "rest_between_shifts", "role_coverage"],
    },
    "event": {
        "preset_key": "event",
        "name": "Event Scheduling",
        "resources": [{"type": "speaker", "label": "Speakers", "required": True}],
        "tasks": [{"type": "session", "label": "Sessions", "required": True}],
        "groups": [{"type": "track", "label": "Tracks", "required": False}],
        "locations": [{"type": "hall", "label": "Halls", "required": True}],
        "time_unit": "event_slots",
        "default_constraints": ["no_speaker_clash", "hall_capacity", "equipment_match"],
    },
    "exam": {
        "preset_key": "exam",
        "name": "Exam Scheduling",
        "resources": [{"type": "invigilator", "label": "Invigilators", "required": True}],
        "tasks": [{"type": "course", "label": "Courses", "required": True}],
        "groups": [{"type": "student_group", "label": "Student Groups", "required": True}],
        "locations": [{"type": "exam_hall", "label": "Exam Halls", "required": True}],
        "time_unit": "exam_slots",
        "default_constraints": ["no_student_clash", "hall_capacity", "invigilator_load"],
    },
    "facility": {
        "preset_key": "facility",
        "name": "Facility Booking",
        "resources": [{"type": "requester", "label": "Requesters", "required": False}],
        "tasks": [{"type": "booking_type", "label": "Booking Types", "required": True}],
        "groups": [{"type": "user_group", "label": "User Groups", "required": False}],
        "locations": [{"type": "facility", "label": "Facilities", "required": True}],
        "time_unit": "booking_slots",
        "default_constraints": ["max_booking_duration", "advance_notice", "availability_window"],
    },
}


@router.get("/")
def list_presets():
    return PRESETS


@router.get("/{key}/config")
def get_preset_config(key: str):
    config = PRESET_CONFIGS.get(key)
    if not config:
        raise HTTPException(status_code=404, detail="Preset not found")
    return config
