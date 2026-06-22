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
