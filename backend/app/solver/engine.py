import math
from collections import defaultdict
from typing import Optional, Literal

from ortools.sat.python import cp_model

from app.solver.models import ProblemInstance, SolverResult, ScheduledSlot, Constraint
from app.solver import defaults
from app.solver.exceptions import SolverInfeasibleError
from app.solver.scoring import compute_soft_constraint_scores

def solve(instance: ProblemInstance) -> SolverResult:
    """
    Main solve entrypoint. Solves the scheduling problem using CP-SAT.
    If the problem is infeasible, runs sequential relaxation to pinpoint the cause.
    """
    # 1. Try to solve normally
    status, assignments = _solve_model(
        instance,
        relax_room_capacity=False,
        relax_teacher_availability=False,
        relax_weekly_hours=False
    )
    
    if status in ("OPTIMAL", "FEASIBLE"):
        # Compute scores for the feasible solution
        scores = compute_soft_constraint_scores(instance, assignments)
        return SolverResult(
            status=status,
            assignments=assignments,
            scores=scores,
            infeasible_reason=None
        )
        
    # 2. Sequential relaxation to diagnose infeasibility
    # Priority 1: Relax Room Capacity
    status_cap, _ = _solve_model(
        instance,
        relax_room_capacity=True,
        relax_teacher_availability=False,
        relax_weekly_hours=False
    )
    if status_cap in ("OPTIMAL", "FEASIBLE"):
        return SolverResult(
            status="INFEASIBLE",
            assignments=[],
            scores={k: 0 for k in ["preference_score", "utilization_score", "gap_score", "overall_score"]},
            infeasible_reason="Infeasible due to room capacity constraints (some sections are too large for any available room)."
        )
        
    # Priority 2: Relax Teacher Availability
    status_avail, _ = _solve_model(
        instance,
        relax_room_capacity=True,
        relax_teacher_availability=True,
        relax_weekly_hours=False
    )
    if status_avail in ("OPTIMAL", "FEASIBLE"):
        return SolverResult(
            status="INFEASIBLE",
            assignments=[],
            scores={k: 0 for k in ["preference_score", "utilization_score", "gap_score", "overall_score"]},
            infeasible_reason="Infeasible due to teacher availability constraints (teachers are unavailable during required slots)."
        )
        
    # Priority 3: Relax Weekly Hours
    status_hours, _ = _solve_model(
        instance,
        relax_room_capacity=True,
        relax_teacher_availability=True,
        relax_weekly_hours=True
    )
    if status_hours in ("OPTIMAL", "FEASIBLE"):
        return SolverResult(
            status="INFEASIBLE",
            assignments=[],
            scores={k: 0 for k in ["preference_score", "utilization_score", "gap_score", "overall_score"]},
            infeasible_reason="Infeasible due to weekly hours requirements (too many hours requested for the available time slots)."
        )
        
    # Otherwise, structural issues (e.g. basic double booking or no slots defined)
    return SolverResult(
        status="INFEASIBLE",
        assignments=[],
        scores={k: 0 for k in ["preference_score", "utilization_score", "gap_score", "overall_score"]},
        infeasible_reason="Infeasible due to structural conflicts (e.g., resource double-booking or room/teacher/slot count mismatch)."
    )


def _solve_model(
    instance: ProblemInstance,
    relax_room_capacity: bool = False,
    relax_teacher_availability: bool = False,
    relax_weekly_hours: bool = False
) -> tuple[Literal["OPTIMAL", "FEASIBLE", "INFEASIBLE"], list[ScheduledSlot]]:
    """
    Builds and solves the CP-SAT model. Supports relaxing specific hard constraints for diagnostics.
    """
    model = cp_model.CpModel()
    
    # Pre-parse lists and mapping for fast lookup
    teachers_map = {t.id: t for t in instance.teachers}
    rooms_map = {r.id: r for r in instance.rooms}
    subjects_map = {s.id: s for s in instance.subjects}
    sections_map = {sec.id: sec for sec in instance.sections}
    slots_map = {slot.id: slot for slot in instance.slots}
    
    # 1. Parse Hard Constraints from constraints list
    # Subject room type requirements
    subject_room_types = {}
    for c in instance.constraints:
        if c.constraint_type == "subject_requires_room_type" and c.weight is None:
            sub_id = c.payload.get("subject_id")
            room_type = c.payload.get("room_type")
            if sub_id and room_type:
                subject_room_types[sub_id] = room_type
                
    # Teacher subject qualifications
    teacher_qualified_subjects = defaultdict(set)
    has_qualification_constraints = False
    section_subject_teachers = {}
    for c in instance.constraints:
        if c.constraint_type == "teacher_subject" and c.weight is None:
            t_id = c.payload.get("teacher_id")
            sub_id = c.payload.get("subject_id")
            if t_id and sub_id:
                teacher_qualified_subjects[sub_id].add(t_id)
                has_qualification_constraints = True
        elif c.constraint_type == "section_subject_teacher" and c.weight is None:
            sec_id = c.payload.get("section_id")
            sub_id = c.payload.get("subject_id")
            t_id = c.payload.get("teacher_id")
            if sec_id and sub_id and t_id:
                section_subject_teachers[(sec_id, sub_id)] = t_id
                
    # Teacher unavailability
    unavailable_teacher_slots = set()
    for c in instance.constraints:
        if c.constraint_type == "teacher_unavailable" and c.weight is None:
            t_id = c.payload.get("teacher_id")
            s_id = c.payload.get("slot_id")
            if not s_id:
                day = c.payload.get("day")
                period = c.payload.get("period")
                for slot in instance.slots:
                    if slot.day == day and slot.period == period:
                        s_id = slot.id
                        break
            if t_id and s_id:
                unavailable_teacher_slots.add((t_id, s_id))
                
    # Room preferences / requirements (hard)
    room_requirements_subject = {}
    room_requirements_teacher = {}
    for c in instance.constraints:
        if c.constraint_type == "preferred_room" and c.weight is None:
            r_id = c.payload.get("room_id")
            sub_id = c.payload.get("subject_id")
            t_id = c.payload.get("teacher_id")
            if r_id:
                if sub_id:
                    room_requirements_subject[sub_id] = r_id
                if t_id:
                    room_requirements_teacher[t_id] = r_id

    # 2. Decision Variables
    # x[sec, sub, t, r, slot] = Boolean variable indicating assignment
    x = {}
    for sec in instance.sections:
        for sub in instance.subjects:
            for t in instance.teachers:
                required_teacher = section_subject_teachers.get((sec.id, sub.id))
                if required_teacher and t.id != required_teacher:
                    continue
                # Qualification check
                if has_qualification_constraints and t.id not in teacher_qualified_subjects[sub.id]:
                    continue
                for r in instance.rooms:
                    # Capacity check
                    if not relax_room_capacity and r.capacity < sec.size:
                        continue
                    # Room type check
                    req_type = subject_room_types.get(sub.id)
                    if req_type and r.room_type != req_type:
                        continue
                    # Room requirement check (subject)
                    req_room_sub = room_requirements_subject.get(sub.id)
                    if req_room_sub and r.id != req_room_sub:
                        continue
                    # Room requirement check (teacher)
                    req_room_t = room_requirements_teacher.get(t.id)
                    if req_room_t and r.id != req_room_t:
                        continue
                        
                    for slot in instance.slots:
                        # Teacher unavailability check
                        if not relax_teacher_availability and (t.id, slot.id) in unavailable_teacher_slots:
                            continue
                            
                        # If all checks pass, create decision variable
                        var_name = f"x_{sec.id}_{sub.id}_{t.id}_{r.id}_{slot.id}"
                        x[(sec.id, sub.id, t.id, r.id, slot.id)] = model.NewBoolVar(var_name)

    # 3. Hard Constraints
    # Constraint A: Teacher occupies at most one slot at any given time
    for t in instance.teachers:
        for slot in instance.slots:
            vars_for_teacher_slot = [
                var for (sec_id, sub_id, t_id, r_id, slot_id), var in x.items()
                if t_id == t.id and slot_id == slot.id
            ]
            if vars_for_teacher_slot:
                model.Add(sum(vars_for_teacher_slot) <= 1)
                
    # Constraint B: Room hosts at most one section at any given time
    for r in instance.rooms:
        for slot in instance.slots:
            vars_for_room_slot = [
                var for (sec_id, sub_id, t_id, r_id, slot_id), var in x.items()
                if r_id == r.id and slot_id == slot.id
            ]
            if vars_for_room_slot:
                model.Add(sum(vars_for_room_slot) <= 1)
                
    # Constraint C: Section attends at most one subject at any given time
    for sec in instance.sections:
        for slot in instance.slots:
            vars_for_section_slot = [
                var for (sec_id, sub_id, t_id, r_id, slot_id), var in x.items()
                if sec_id == sec.id and slot_id == slot.id
            ]
            if vars_for_section_slot:
                model.Add(sum(vars_for_section_slot) <= 1)
                
    # Constraint D: Each section receives exactly `subject.weekly_hours` (or <= if relaxed)
    for sec in instance.sections:
        for sub in instance.subjects:
            vars_for_sec_sub = [
                var for (sec_id, sub_id, t_id, r_id, slot_id), var in x.items()
                if sec_id == sec.id and sub_id == sub.id
            ]
            if relax_weekly_hours:
                model.Add(sum(vars_for_sec_sub) <= sub.weekly_hours)
            else:
                model.Add(sum(vars_for_sec_sub) == sub.weekly_hours)

    # 4. Soft Constraints & Objective
    objective_terms = []
    
    # Retrieve penalties/rewards from constraints or use defaults
    gap_penalty = defaults.TEACHER_GAP_PENALTY
    load_balance_penalty = defaults.DAILY_LOAD_BALANCE_PENALTY
    
    for c in instance.constraints:
        if c.constraint_type == "teacher_gap_minimization":
            if c.weight is not None:
                gap_penalty = c.weight
        elif c.constraint_type == "daily_load_balancing":
            if c.weight is not None:
                load_balance_penalty = c.weight

    # A. Teacher Gap Minimization
    # Get unique days
    days = list(set(slot.day for slot in instance.slots))
    # Map slots to day and period
    slots_by_day = defaultdict(list)
    for slot in instance.slots:
        slots_by_day[slot.day].append(slot)
    for day in slots_by_day:
        slots_by_day[day] = sorted(slots_by_day[day], key=lambda s: s.period)
        
    # Teacher presence helper variables Y[t, d, p]
    teacher_active = {}
    for t in instance.teachers:
        for day in days:
            day_slots = slots_by_day[day]
            num_periods = len(day_slots)
            for slot in day_slots:
                # Sum variables for teacher t in this slot
                vars_for_t_slot = [
                    var for (sec_id, sub_id, t_id, r_id, slot_id), var in x.items()
                    if t_id == t.id and slot_id == slot.id
                ]
                if vars_for_t_slot:
                    y_var = model.NewBoolVar(f"y_{t.id}_{day}_{slot.period}")
                    model.Add(y_var == sum(vars_for_t_slot))
                    teacher_active[(t.id, day, slot.period)] = y_var
                else:
                    teacher_active[(t.id, day, slot.period)] = 0
                    
            # For periods > 2, define gap variables
            if num_periods > 2 and gap_penalty > 0:
                for idx_2 in range(1, num_periods - 1):
                    p2 = day_slots[idx_2].period
                    gap_var = model.NewBoolVar(f"gap_{t.id}_{day}_{p2}")
                    
                    # For any p1 < p2 and p3 > p2
                    for idx_1 in range(0, idx_2):
                        p1 = day_slots[idx_1].period
                        for idx_3 in range(idx_2 + 1, num_periods):
                            p3 = day_slots[idx_3].period
                            
                            y1 = teacher_active[(t.id, day, p1)]
                            y2 = teacher_active[(t.id, day, p2)]
                            y3 = teacher_active[(t.id, day, p3)]
                            
                            # gap_var >= y1 + y3 - y2 - 1
                            # Model it as gap_var - y1 - y3 + y2 >= -1
                            model.Add(gap_var >= y1 + y3 - y2 - 1)
                            
                    objective_terms.append(gap_var * gap_penalty)

    # B. Daily Load Balancing
    num_days = len(days)
    if num_days > 0 and load_balance_penalty > 0:
        for sec in instance.sections:
            total_hours = sum(sub.weekly_hours for sub in instance.subjects)
            min_ideal = math.floor(total_hours / num_days)
            max_ideal = math.ceil(total_hours / num_days)
            
            for day in days:
                day_slot_ids = {s.id for s in slots_by_day[day]}
                # Sum assignments for this section on this day
                vars_for_sec_day = [
                    var for (sec_id, sub_id, t_id, r_id, slot_id), var in x.items()
                    if sec_id == sec.id and slot_id in day_slot_ids
                ]
                
                if vars_for_sec_day:
                    # Daily load L[sec, d]
                    load_var = model.NewIntVar(0, len(day_slot_ids), f"load_{sec.id}_{day}")
                    model.Add(load_var == sum(vars_for_sec_day))
                    
                    over_var = model.NewIntVar(0, len(day_slot_ids), f"over_{sec.id}_{day}")
                    under_var = model.NewIntVar(0, len(day_slot_ids), f"under_{sec.id}_{day}")
                    
                    model.Add(load_var - max_ideal <= over_var)
                    model.Add(min_ideal - load_var <= under_var)
                    
                    objective_terms.append(over_var * load_balance_penalty)
                    objective_terms.append(under_var * load_balance_penalty)

    # C. Preference Satisfaction (Teacher Preferred Slots & Preferred Rooms)
    for c in instance.constraints:
        if c.weight is not None:  # Soft constraint
            if c.constraint_type == "teacher_preferred_slot":
                t_id = c.payload.get("teacher_id")
                s_id = c.payload.get("slot_id")
                if not s_id:
                    day = c.payload.get("day")
                    period = c.payload.get("period")
                    for slot in instance.slots:
                        if slot.day == day and slot.period == period:
                            s_id = slot.id
                            break
                if t_id and s_id:
                    # Teacher presence variable Y[t_id, s_id]
                    slot_obj = slots_map.get(s_id)
                    if slot_obj:
                        y_term = teacher_active.get((t_id, slot_obj.day, slot_obj.period), 0)
                        if isinstance(y_term, cp_model.IntVar):
                            # Minimize penalty, which is equivalent to subtracting reward:
                            # Cost += c.weight * (1 - y_term) -> equivalent to subtracting c.weight * y_term
                            objective_terms.append(-c.weight * y_term)
                            
            elif c.constraint_type == "preferred_room":
                r_id = c.payload.get("room_id")
                sub_id = c.payload.get("subject_id")
                t_id = c.payload.get("teacher_id")
                if r_id:
                    # Penalize any assignment that does NOT use the preferred room
                    for (sec_id, s_id, teacher_id, room_id, slot_id), var in x.items():
                        match_sub = (sub_id is None or s_id == sub_id)
                        match_t = (t_id is None or teacher_id == t_id)
                        if match_sub and match_t and room_id != r_id:
                            objective_terms.append(c.weight * var)
                            
            elif c.constraint_type == "teacher_unavailable":
                # Soft teacher unavailable penalty
                t_id = c.payload.get("teacher_id")
                s_id = c.payload.get("slot_id")
                if not s_id:
                    day = c.payload.get("day")
                    period = c.payload.get("period")
                    for slot in instance.slots:
                        if slot.day == day and slot.period == period:
                            s_id = slot.id
                            break
                if t_id and s_id:
                    slot_obj = slots_map.get(s_id)
                    if slot_obj:
                        y_term = teacher_active.get((t_id, slot_obj.day, slot_obj.period), 0)
                        if isinstance(y_term, cp_model.IntVar):
                            objective_terms.append(c.weight * y_term)

    # Set objective
    if objective_terms:
        model.Minimize(sum(objective_terms))

    # 5. Solve
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 30.0
    
    status = solver.Solve(model)
    
    if status == cp_model.OPTIMAL:
        status_str = "OPTIMAL"
    elif status == cp_model.FEASIBLE:
        status_str = "FEASIBLE"
    else:
        return "INFEASIBLE", []
        
    # Extract assignments
    assignments = []
    for (sec_id, sub_id, t_id, r_id, slot_id), var in x.items():
        if solver.Value(var) == 1:
            assignments.append(
                ScheduledSlot(
                    section_id=sec_id,
                    subject_id=sub_id,
                    teacher_id=t_id,
                    room_id=r_id,
                    slot_id=slot_id
                )
            )
            
    return status_str, assignments
