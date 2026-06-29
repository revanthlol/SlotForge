import json
import os
import pytest

from app.solver.models import ProblemInstance
from app.solver.engine import solve

# Locate the fixtures directory relative to this test file
FIXTURES_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "app", "solver", "fixtures"
)

def test_feasible_solve():
    """Verify that sample_small.json solves successfully with a FEASIBLE or OPTIMAL status."""
    path = os.path.join(FIXTURES_DIR, "sample_small.json")
    with open(path, "r") as f:
        data = json.load(f)
        
    instance = ProblemInstance.model_validate(data)
    result = solve(instance)
    
    assert result.status in ("OPTIMAL", "FEASIBLE")
    assert len(result.assignments) == 7
    assert result.infeasible_reason is None
    
    # Verify no teacher is double-booked
    teacher_slots = {}
    for a in result.assignments:
        key = (a.teacher_id, a.slot_id)
        assert key not in teacher_slots, f"Teacher {a.teacher_id} double-booked at slot {a.slot_id}"
        teacher_slots[key] = a

    # Verify no room is double-booked
    room_slots = {}
    for a in result.assignments:
        key = (a.room_id, a.slot_id)
        assert key not in room_slots, f"Room {a.room_id} double-booked at slot {a.slot_id}"
        room_slots[key] = a

def test_infeasible_solve_room_capacity():
    """Verify that sample_infeasible.json returns INFEASIBLE with room capacity reason."""
    path = os.path.join(FIXTURES_DIR, "sample_infeasible.json")
    with open(path, "r") as f:
        data = json.load(f)
        
    instance = ProblemInstance.model_validate(data)
    result = solve(instance)
    
    assert result.status == "INFEASIBLE"
    assert "room capacity" in result.infeasible_reason.lower()
    assert len(result.assignments) == 0

def test_infeasible_solve_teacher_availability():
    """Verify that a clashing teacher unavailability constraint returns INFEASIBLE with teacher availability reason."""
    # Load sample_small and add a clashing availability constraint
    path = os.path.join(FIXTURES_DIR, "sample_small.json")
    with open(path, "r") as f:
        data = json.load(f)
        
    # We have 8 slots. 7 weekly hours are requested: Math (4h), Phys (3h).
    # Since Math (4h) needs 4 slots, if we make the only teacher for Math (t1)
    # unavailable for 5 slots, we only have 3 slots left for Math. This must be infeasible!
    # Wait, in sample_small, teachers t1 and t2 can teach both subjects by default.
    # Let's add teacher_subject qualification constraints so t1 is the ONLY teacher for Math,
    # and t2 is the ONLY teacher for Physics.
    # Then make t1 unavailable for 5 slots.
    data["constraints"] = [
        # Qualifications
        {"id": "q1", "constraint_type": "teacher_subject", "payload": {"teacher_id": "t1", "subject_id": "s1"}, "weight": None},
        {"id": "q2", "constraint_type": "teacher_subject", "payload": {"teacher_id": "t2", "subject_id": "s2"}, "weight": None},
        # Unavailabilities for t1: Mon 1-2, Tue 1-2, Wed 1 -> 5 slots unavailable.
        # This leaves only Wed 2, Thu 1, Thu 2 (3 slots) for t1, but Math requires 4 hours!
        {"id": "u1", "constraint_type": "teacher_unavailable", "payload": {"teacher_id": "t1", "slot_id": "mon-1"}, "weight": None},
        {"id": "u2", "constraint_type": "teacher_unavailable", "payload": {"teacher_id": "t1", "slot_id": "mon-2"}, "weight": None},
        {"id": "u3", "constraint_type": "teacher_unavailable", "payload": {"teacher_id": "t1", "slot_id": "tue-1"}, "weight": None},
        {"id": "u4", "constraint_type": "teacher_unavailable", "payload": {"teacher_id": "t1", "slot_id": "tue-2"}, "weight": None},
        {"id": "u5", "constraint_type": "teacher_unavailable", "payload": {"teacher_id": "t1", "slot_id": "wed-1"}, "weight": None},
    ]
    
    instance = ProblemInstance.model_validate(data)
    result = solve(instance)
    
    assert result.status == "INFEASIBLE"
    assert "teacher availability" in result.infeasible_reason.lower()


def test_section_subject_teacher_constraint_forces_teacher():
    path = os.path.join(FIXTURES_DIR, "sample_small.json")
    with open(path, "r") as f:
        data = json.load(f)

    data["constraints"] = [
        {
            "id": "sst1",
            "constraint_type": "section_subject_teacher",
            "payload": {"section_id": "sec1", "subject_id": "s1", "teacher_id": "t2"},
            "weight": None,
        }
    ]

    instance = ProblemInstance.model_validate(data)
    result = solve(instance)

    assert result.status in ("OPTIMAL", "FEASIBLE")
    forced_assignments = [
        slot for slot in result.assignments
        if slot.section_id == "sec1" and slot.subject_id == "s1"
    ]
    assert forced_assignments
    assert {slot.teacher_id for slot in forced_assignments} == {"t2"}


def test_subject_sessions_spread_without_unnecessary_daily_repeats():
    data = {
        "teachers": [{"id": "t1", "name": "Teacher"}],
        "rooms": [{"id": "r1", "name": "Room", "capacity": 60, "type": "classroom"}],
        "subjects": [{"id": "s1", "name": "AI", "weekly_hours": 3, "session_length": 1}],
        "sections": [{"id": "sec1", "name": "DCS", "size": 50}],
        "slots": [
            {"id": f"d{day}-p{period}", "day": f"Day {day}", "period": period}
            for day in range(1, 6)
            for period in range(1, 4)
        ],
        "constraints": [],
    }

    result = solve(ProblemInstance.model_validate(data))

    assert result.status in ("OPTIMAL", "FEASIBLE")
    days = {}
    for assignment in result.assignments:
        day = assignment.slot_id.split("-")[0]
        days[day] = days.get(day, 0) + 1
    assert max(days.values()) == 1


def test_subject_sessions_allow_only_required_daily_repeats():
    data = {
        "teachers": [{"id": "t1", "name": "Teacher"}],
        "rooms": [{"id": "r1", "name": "Room", "capacity": 60, "type": "classroom"}],
        "subjects": [{"id": "s1", "name": "AI", "weekly_hours": 6, "session_length": 1}],
        "sections": [{"id": "sec1", "name": "DCS", "size": 50}],
        "slots": [
            {"id": f"d{day}-p{period}", "day": f"Day {day}", "period": period}
            for day in range(1, 6)
            for period in range(1, 4)
        ],
        "constraints": [],
    }

    result = solve(ProblemInstance.model_validate(data))

    assert result.status in ("OPTIMAL", "FEASIBLE")
    days = {}
    for assignment in result.assignments:
        day = assignment.slot_id.split("-")[0]
        days[day] = days.get(day, 0) + 1
    assert len(result.assignments) == 6
    assert max(days.values()) == 2


def test_exact_full_fixed_weekday_cycle_with_lab_blocks_solves():
    data = {
        "teachers": [
            {"id": "t1", "name": "Swapna"},
            {"id": "t2", "name": "Medha"},
            {"id": "t3", "name": "Bindhu"},
            {"id": "t4", "name": "Sravani"},
            {"id": "t5", "name": "Therissa"},
        ],
        "rooms": [
            {"id": "r1", "name": "Room 1", "capacity": 60, "type": "classroom"},
        ],
        "sections": [{"id": "sec1", "name": "REF", "size": 50}],
        "subjects": [
            {"id": "aj", "name": "AJ", "weekly_hours": 5, "session_length": 1},
            {"id": "ajp", "name": "AJ P", "weekly_hours": 2, "session_length": 2},
            {"id": "bd", "name": "BD", "weekly_hours": 3, "session_length": 1},
            {"id": "bdp", "name": "BD P", "weekly_hours": 2, "session_length": 2},
            {"id": "mad", "name": "MAD", "weekly_hours": 4, "session_length": 1},
            {"id": "madp", "name": "MAD P", "weekly_hours": 2, "session_length": 2},
            {"id": "or", "name": "OR", "weekly_hours": 5, "session_length": 1},
            {"id": "cn", "name": "CN", "weekly_hours": 4, "session_length": 1},
            {"id": "se", "name": "SE", "weekly_hours": 3, "session_length": 1},
        ],
        "slots": [
            {"id": f"{day.lower()}-{period}", "day": day, "period": period}
            for day in ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
            for period in range(1, 6)
        ],
        "constraints": [
            {"id": "q-aj", "constraint_type": "teacher_subject", "payload": {"teacher_id": "t1", "subject_id": "aj"}, "weight": None},
            {"id": "q-ajp", "constraint_type": "teacher_subject", "payload": {"teacher_id": "t1", "subject_id": "ajp"}, "weight": None},
            {"id": "q-bd", "constraint_type": "teacher_subject", "payload": {"teacher_id": "t2", "subject_id": "bd"}, "weight": None},
            {"id": "q-bdp", "constraint_type": "teacher_subject", "payload": {"teacher_id": "t1", "subject_id": "bdp"}, "weight": None},
            {"id": "q-mad", "constraint_type": "teacher_subject", "payload": {"teacher_id": "t3", "subject_id": "mad"}, "weight": None},
            {"id": "q-madp", "constraint_type": "teacher_subject", "payload": {"teacher_id": "t3", "subject_id": "madp"}, "weight": None},
            {"id": "q-or", "constraint_type": "teacher_subject", "payload": {"teacher_id": "t4", "subject_id": "or"}, "weight": None},
            {"id": "q-cn", "constraint_type": "teacher_subject", "payload": {"teacher_id": "t5", "subject_id": "cn"}, "weight": None},
            {"id": "q-se", "constraint_type": "teacher_subject", "payload": {"teacher_id": "t5", "subject_id": "se"}, "weight": None},
        ],
    }

    result = solve(ProblemInstance.model_validate(data))

    assert result.status in ("OPTIMAL", "FEASIBLE")
    assert result.infeasible_reason is None
    assert sum(slot.duration_periods for slot in result.assignments) == 30


def test_room_time_capacity_is_reported_before_weekly_hours_relaxation():
    data = {
        "teachers": [
            {"id": "t1", "name": "Teacher 1"},
            {"id": "t2", "name": "Teacher 2"},
        ],
        "rooms": [{"id": "r1", "name": "Room 1", "capacity": 60, "type": "classroom"}],
        "sections": [
            {"id": "sec1", "name": "A", "size": 50},
            {"id": "sec2", "name": "B", "size": 50},
        ],
        "subjects": [
            {"id": "s1", "name": "Subject 1", "weekly_hours": 15, "session_length": 1},
            {"id": "s2", "name": "Subject 2", "weekly_hours": 15, "session_length": 1},
        ],
        "slots": [
            {"id": f"d{day}-p{period}", "day": f"Day {day}", "period": period}
            for day in range(1, 7)
            for period in range(1, 6)
        ],
        "constraints": [],
    }

    result = solve(ProblemInstance.model_validate(data))

    assert result.status == "INFEASIBLE"
    assert "room-time capacity" in result.infeasible_reason


def test_missing_subject_teacher_assignment_reports_teacher_constraint():
    data = {
        "teachers": [{"id": "t1", "name": "Teacher"}],
        "rooms": [{"id": "r1", "name": "Room 1", "capacity": 60, "type": "classroom"}],
        "sections": [{"id": "sec1", "name": "REF", "size": 50}],
        "subjects": [
            {"id": "s1", "name": "Assigned", "weekly_hours": 1, "session_length": 1},
            {"id": "s2", "name": "Unassigned", "weekly_hours": 1, "session_length": 1},
        ],
        "slots": [{"id": "mon-1", "day": "Mon", "period": 1}, {"id": "mon-2", "day": "Mon", "period": 2}],
        "constraints": [
            {"id": "q1", "constraint_type": "teacher_subject", "payload": {"teacher_id": "t1", "subject_id": "s1"}, "weight": None},
        ],
    }

    result = solve(ProblemInstance.model_validate(data))

    assert result.status == "INFEASIBLE"
    assert "no qualified teacher" in result.infeasible_reason
    assert "Unassigned" in result.infeasible_reason


def test_section_too_large_for_room_reports_room_constraint():
    data = {
        "teachers": [{"id": "t1", "name": "Teacher"}],
        "rooms": [{"id": "r1", "name": "Room 1", "capacity": 30, "type": "classroom"}],
        "sections": [{"id": "sec1", "name": "REF", "size": 50}],
        "subjects": [{"id": "s1", "name": "Subject", "weekly_hours": 1, "session_length": 1}],
        "slots": [{"id": "mon-1", "day": "Mon", "period": 1}],
        "constraints": [],
    }

    result = solve(ProblemInstance.model_validate(data))

    assert result.status == "INFEASIBLE"
    assert "room constraints" in result.infeasible_reason
    assert "Subject" in result.infeasible_reason
