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
    preflight_reason = _basic_capacity_infeasibility(instance)
    if preflight_reason:
        return SolverResult(
            status="INFEASIBLE",
            assignments=[],
            scores={k: 0 for k in ["preference_score", "utilization_score", "gap_score", "overall_score"]},
            infeasible_reason=preflight_reason,
        )

    option_reason = _assignment_option_infeasibility(instance)
    if option_reason:
        return SolverResult(
            status="INFEASIBLE",
            assignments=[],
            scores={k: 0 for k in ["preference_score", "utilization_score", "gap_score", "overall_score"]},
            infeasible_reason=option_reason,
        )

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


def _basic_capacity_infeasibility(instance: ProblemInstance) -> Optional[str]:
    slot_count = len(instance.slots)
    section_count = len(instance.sections)
    if slot_count == 0 or section_count == 0:
        return None

    active_pairs = _active_section_subject_pairs(instance)
    subjects_map = {subject.id: subject for subject in instance.subjects}
    section_periods = defaultdict(int)
    for sec_id, sub_id in active_pairs:
        subject = subjects_map.get(sub_id)
        if subject:
            section_periods[sec_id] += subject.weekly_hours

    for sec in instance.sections:
        required_periods = section_periods.get(sec.id, 0)
        if required_periods > slot_count:
            return (
                "Infeasible due to weekly hours requirements "
                f"({required_periods} periods requested for section {sec.name}, "
                f"but only {slot_count} periods are available in the configured cycle)."
            )

    total_required_periods = sum(section_periods.values())
    room_period_capacity = len(instance.rooms) * slot_count
    if total_required_periods > room_period_capacity:
        return (
            "Infeasible due to room-time capacity "
            f"({total_required_periods} section-periods requested across {section_count} sections, "
            f"but {len(instance.rooms)} rooms provide only {room_period_capacity} room-periods)."
        )

    teacher_period_capacity = len(instance.teachers) * slot_count
    if total_required_periods > teacher_period_capacity:
        return (
            "Infeasible due to teacher-time capacity "
            f"({total_required_periods} section-periods requested across {section_count} sections, "
            f"but {len(instance.teachers)} teachers provide only {teacher_period_capacity} teacher-periods)."
        )

    return None


def _active_section_subject_pairs(instance: ProblemInstance) -> set[tuple[str, str]]:
    configured_pairs = {
        (c.payload.get("section_id"), c.payload.get("subject_id"))
        for c in instance.constraints
        if c.constraint_type == "section_subject" and c.weight is None
    }
    configured_pairs = {
        (sec_id, sub_id) for sec_id, sub_id in configured_pairs if sec_id and sub_id
    }
    if configured_pairs:
        return configured_pairs

    return {
        (sec.id, sub.id)
        for sec in instance.sections
        for sub in instance.subjects
    }


def _assignment_option_infeasibility(instance: ProblemInstance) -> Optional[str]:
    subject_room_types = {}
    teacher_qualified_subjects = defaultdict(set)
    has_qualification_constraints = False
    section_subject_teachers = {}
    unavailable_teacher_slots = set()
    room_requirements_subject = {}
    room_requirements_teacher = {}

    slots_by_day_period = {(slot.day, slot.period): slot for slot in instance.slots}

    for c in instance.constraints:
        if c.constraint_type == "subject_requires_room_type" and c.weight is None:
            sub_id = c.payload.get("subject_id")
            room_type = c.payload.get("room_type")
            if sub_id and room_type:
                subject_room_types[sub_id] = room_type
        elif c.constraint_type == "teacher_subject" and c.weight is None:
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
        elif c.constraint_type == "teacher_unavailable" and c.weight is None:
            t_id = c.payload.get("teacher_id")
            s_id = c.payload.get("slot_id")
            if not s_id:
                day = c.payload.get("day")
                period = c.payload.get("period")
                slot = slots_by_day_period.get((day, period))
                if slot:
                    s_id = slot.id
            if t_id and s_id:
                unavailable_teacher_slots.add((t_id, s_id))
        elif c.constraint_type == "preferred_room" and c.weight is None:
            r_id = c.payload.get("room_id")
            sub_id = c.payload.get("subject_id")
            t_id = c.payload.get("teacher_id")
            if r_id:
                if sub_id:
                    room_requirements_subject[sub_id] = r_id
                if t_id:
                    room_requirements_teacher[t_id] = r_id

    teacher_ids = {teacher.id for teacher in instance.teachers}

    active_pairs = _active_section_subject_pairs(instance)
    for sec in instance.sections:
        for sub in instance.subjects:
            if (sec.id, sub.id) not in active_pairs:
                continue
            required_teacher = section_subject_teachers.get((sec.id, sub.id))
            if required_teacher:
                allowed_teachers = [teacher for teacher in instance.teachers if teacher.id == required_teacher]
            elif has_qualification_constraints:
                allowed_teacher_ids = teacher_qualified_subjects[sub.id]
                allowed_teachers = [teacher for teacher in instance.teachers if teacher.id in allowed_teacher_ids]
            else:
                allowed_teachers = list(instance.teachers)

            if required_teacher and required_teacher not in teacher_ids:
                return (
                    "Infeasible due to teacher assignment constraints "
                    f"(section {sec.name} subject {sub.name} is assigned to a teacher that no longer exists)."
                )
            if not allowed_teachers:
                return (
                    "Infeasible due to teacher assignment constraints "
                    f"(no qualified teacher is available for section {sec.name} subject {sub.name})."
                )

            room_type = subject_room_types.get(sub.id)
            required_room = room_requirements_subject.get(sub.id)
            allowed_rooms = []
            for room in instance.rooms:
                if room_type and room.room_type != room_type:
                    continue
                if required_room and room.id != required_room:
                    continue
                allowed_rooms.append(room)

            total_capacity = sum(r.capacity for r in allowed_rooms)
            if total_capacity < sec.size:
                return (
                    "Infeasible due to room constraints (room capacity: "
                    f"the combined capacity of all compatible rooms ({total_capacity}) is less than section size for section {sec.name} ({sec.size}) and subject {sub.name})."
                )

            available_starts = 0
            session_length = getattr(sub, "session_length", 1) or 1
            for teacher in allowed_teachers:
                required_teacher_room = room_requirements_teacher.get(teacher.id)
                teacher_rooms = [
                    room for room in allowed_rooms
                    if not required_teacher_room or room.id == required_teacher_room
                ]
                if not teacher_rooms:
                    continue

                for slot in instance.slots:
                    covered_slots = []
                    for offset in range(session_length):
                        covered_slot = slots_by_day_period.get((slot.day, slot.period + offset))
                        if not covered_slot:
                            covered_slots = []
                            break
                        covered_slots.append(covered_slot.id)
                    if not covered_slots:
                        continue
                    if any((teacher.id, covered_slot_id) in unavailable_teacher_slots for covered_slot_id in covered_slots):
                        continue
                    available_starts += len(teacher_rooms)

            if available_starts == 0:
                return (
                    "Infeasible due to teacher availability or slot-span constraints "
                    f"(section {sec.name} subject {sub.name} has no legal starting period)."
                )

    return None


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
    slots_by_day_period = {(slot.day, slot.period): slot for slot in instance.slots}
    active_section_subjects = _active_section_subject_pairs(instance)
    
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
    # x[sec, sub, t, slot] = Boolean variable indicating session is scheduled
    # y[sec, sub, t, slot, r] = Boolean variable indicating room r is assigned to session
    x = {}
    y = {}
    covered_slots_by_assignment = {}
    for sec in instance.sections:
        for sub in instance.subjects:
            if (sec.id, sub.id) not in active_section_subjects:
                continue
            session_length = getattr(sub, "session_length", 1) or 1
            for t in instance.teachers:
                required_teacher = section_subject_teachers.get((sec.id, sub.id))
                if required_teacher and t.id != required_teacher:
                    continue
                # Qualification check
                if has_qualification_constraints and t.id not in teacher_qualified_subjects[sub.id]:
                    continue
                    
                for slot in instance.slots:
                    covered_slots = []
                    for offset in range(session_length):
                        covered_slot = slots_by_day_period.get((slot.day, slot.period + offset))
                        if not covered_slot:
                            covered_slots = []
                            break
                        covered_slots.append(covered_slot.id)
                    if not covered_slots:
                        continue
                    # Teacher unavailability check
                    if not relax_teacher_availability and any((t.id, covered_slot_id) in unavailable_teacher_slots for covered_slot_id in covered_slots):
                        continue
                        
                    # Filter rooms allowed for this session
                    allowed_rooms = []
                    for r in instance.rooms:
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
                        allowed_rooms.append(r)
                        
                    if not allowed_rooms:
                        continue
                        
                    session_key = (sec.id, sub.id, t.id, slot.id)
                    x[session_key] = model.NewBoolVar(f"x_{sec.id}_{sub.id}_{t.id}_{slot.id}")
                    covered_slots_by_assignment[session_key] = covered_slots
                    
                    # Room decision variables
                    for r in allowed_rooms:
                        room_key = (sec.id, sub.id, t.id, slot.id, r.id)
                        y[room_key] = model.NewBoolVar(f"y_{sec.id}_{sub.id}_{t.id}_{slot.id}_{r.id}")
                        # Room activation link: room can only be assigned if session is active
                        model.Add(y[room_key] <= x[session_key])
                        
                    # Capacity constraint: total room capacity >= section size (if active)
                    if not relax_room_capacity:
                        model.Add(
                            sum(y[(sec.id, sub.id, t.id, slot.id, r.id)] * r.capacity for r in allowed_rooms) 
                            >= x[session_key] * sec.size
                        )

    # 3. Hard Constraints
    # Constraint A: Teacher occupies at most one slot at any given time
    for t in instance.teachers:
        for slot in instance.slots:
            vars_for_teacher_slot = [
                var for (sec_id, sub_id, t_id, slot_id), var in x.items()
                if t_id == t.id and slot.id in covered_slots_by_assignment[(sec_id, sub_id, t_id, slot_id)]
            ]
            if vars_for_teacher_slot:
                model.Add(sum(vars_for_teacher_slot) <= 1)
                
    # Constraint B: Room hosts at most one section at any given time
    for r in instance.rooms:
        for slot in instance.slots:
            vars_for_room_slot = [
                var for (sec_id, sub_id, t_id, slot_id, r_id), var in y.items()
                if r_id == r.id and slot.id in covered_slots_by_assignment[(sec_id, sub_id, t_id, slot_id)]
            ]
            if vars_for_room_slot:
                model.Add(sum(vars_for_room_slot) <= 1)
                
    # Constraint C: Section attends at most one subject at any given time
    for sec in instance.sections:
        for slot in instance.slots:
            vars_for_section_slot = [
                var for (sec_id, sub_id, t_id, slot_id), var in x.items()
                if sec_id == sec.id and slot.id in covered_slots_by_assignment[(sec_id, sub_id, t_id, slot_id)]
            ]
            if vars_for_section_slot:
                model.Add(sum(vars_for_section_slot) <= 1)
                
    # Constraint D: Each section receives exactly `subject.weekly_hours` (or <= if relaxed)
    for sec in instance.sections:
        for sub in instance.subjects:
            if (sec.id, sub.id) not in active_section_subjects:
                continue
            vars_for_sec_sub = [
                var * (getattr(subjects_map[sub_id], "session_length", 1) or 1)
                for (sec_id, sub_id, t_id, slot_id), var in x.items()
                if sec_id == sec.id and sub_id == sub.id
            ]
            if relax_weekly_hours:
                model.Add(sum(vars_for_sec_sub) <= sub.weekly_hours)
            else:
                model.Add(sum(vars_for_sec_sub) == sub.weekly_hours)

    # Constraint E: Spread subject sessions across day orders before allowing repeats.
    days = list(set(slot.day for slot in instance.slots))
    num_days = len(days)
    if num_days > 0:
        for sec in instance.sections:
            for sub in instance.subjects:
                if (sec.id, sub.id) not in active_section_subjects:
                    continue
                session_length = getattr(sub, "session_length", 1) or 1
                required_sessions = math.ceil(sub.weekly_hours / session_length)
                max_sessions_per_day = max(1, math.ceil(required_sessions / num_days))
                for day in days:
                    day_slot_ids = {s.id for s in instance.slots if s.day == day}
                    vars_for_sec_sub_day = [
                        var for (sec_id, sub_id, t_id, slot_id), var in x.items()
                        if sec_id == sec.id and sub_id == sub.id and slot_id in day_slot_ids
                    ]
                    if vars_for_sec_sub_day:
                        model.Add(sum(vars_for_sec_sub_day) <= max_sessions_per_day)

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
    slots_by_day = defaultdict(list)
    for slot in instance.slots:
        slots_by_day[slot.day].append(slot)
    for day in slots_by_day:
        slots_by_day[day] = sorted(slots_by_day[day], key=lambda s: s.period)
        
    teacher_active = {}
    for t in instance.teachers:
        for day in days:
            day_slots = slots_by_day[day]
            num_periods = len(day_slots)
            for slot in day_slots:
                vars_for_t_slot = [
                    var for (sec_id, sub_id, t_id, slot_id), var in x.items()
                    if t_id == t.id and slot.id in covered_slots_by_assignment[(sec_id, sub_id, t_id, slot_id)]
                ]
                if vars_for_t_slot:
                    y_var = model.NewBoolVar(f"y_t_act_{t.id}_{day}_{slot.period}")
                    model.Add(y_var == sum(vars_for_t_slot))
                    teacher_active[(t.id, day, slot.period)] = y_var
                else:
                    teacher_active[(t.id, day, slot.period)] = 0
                    
            if num_periods > 2 and gap_penalty > 0:
                for idx_2 in range(1, num_periods - 1):
                    p2 = day_slots[idx_2].period
                    gap_var = model.NewBoolVar(f"gap_{t.id}_{day}_{p2}")
                    
                    for idx_1 in range(0, idx_2):
                        p1 = day_slots[idx_1].period
                        for idx_3 in range(idx_2 + 1, num_periods):
                            p3 = day_slots[idx_3].period
                            
                            y1 = teacher_active[(t.id, day, p1)]
                            y2 = teacher_active[(t.id, day, p2)]
                            y3 = teacher_active[(t.id, day, p3)]
                            
                            model.Add(gap_var >= y1 + y3 - y2 - 1)
                            
                    objective_terms.append(gap_var * gap_penalty)

    # B. Daily Load Balancing
    if num_days > 0 and load_balance_penalty > 0:
        for sec in instance.sections:
            total_hours = sum(
                sub.weekly_hours for sub in instance.subjects
                if (sec.id, sub.id) in active_section_subjects
            )
            min_ideal = math.floor(total_hours / num_days)
            max_ideal = math.ceil(total_hours / num_days)
            
            for day in days:
                day_slot_ids = {s.id for s in slots_by_day[day]}
                vars_for_sec_day = [
                    var * (getattr(subjects_map[sub_id], "session_length", 1) or 1)
                    for (sec_id, sub_id, t_id, slot_id), var in x.items()
                    if sec_id == sec.id and slot_id in day_slot_ids
                ]
                
                if vars_for_sec_day:
                    load_var = model.NewIntVar(0, len(day_slot_ids), f"load_{sec.id}_{day}")
                    model.Add(load_var == sum(vars_for_sec_day))
                    
                    over_var = model.NewIntVar(0, len(day_slot_ids), f"over_{sec.id}_{day}")
                    under_var = model.NewIntVar(0, len(day_slot_ids), f"under_{sec.id}_{day}")
                    
                    model.Add(load_var - max_ideal <= over_var)
                    model.Add(min_ideal - load_var <= under_var)
                    
                    objective_terms.append(over_var * load_balance_penalty)
                    objective_terms.append(under_var * load_balance_penalty)

        for sec in instance.sections:
            for sub in instance.subjects:
                if (sec.id, sub.id) not in active_section_subjects:
                    continue
                session_length = getattr(sub, "session_length", 1) or 1
                required_sessions = math.ceil(sub.weekly_hours / session_length)
                min_sessions = math.floor(required_sessions / num_days)
                max_sessions = math.ceil(required_sessions / num_days)

                for day in days:
                    day_slot_ids = {s.id for s in slots_by_day[day]}
                    vars_for_sec_sub_day = [
                        var for (sec_id, sub_id, t_id, slot_id), var in x.items()
                        if sec_id == sec.id and sub_id == sub.id and slot_id in day_slot_ids
                    ]
                    if not vars_for_sec_sub_day:
                        continue

                    session_count = model.NewIntVar(0, len(day_slot_ids), f"subject_load_{sec.id}_{sub.id}_{day}")
                    model.Add(session_count == sum(vars_for_sec_sub_day))
                    over_var = model.NewIntVar(0, len(day_slot_ids), f"subject_over_{sec.id}_{sub.id}_{day}")
                    under_var = model.NewIntVar(0, len(day_slot_ids), f"subject_under_{sec.id}_{sub.id}_{day}")
                    model.Add(session_count - max_sessions <= over_var)
                    model.Add(min_sessions - session_count <= under_var)
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
                    slot_obj = slots_map.get(s_id)
                    if slot_obj:
                        y_term = teacher_active.get((t_id, slot_obj.day, slot_obj.period), 0)
                        if isinstance(y_term, cp_model.IntVar):
                            objective_terms.append(-c.weight * y_term)
                            
            elif c.constraint_type == "preferred_room":
                r_id = c.payload.get("room_id")
                sub_id = c.payload.get("subject_id")
                t_id = c.payload.get("teacher_id")
                if r_id:
                    # Penalize any assignment that does NOT use the preferred room
                    for (sec_id, sub_id_key, teacher_id, slot_id, room_id), var in y.items():
                        match_sub = (sub_id is None or sub_id_key == sub_id)
                        match_t = (t_id is None or teacher_id == t_id)
                        if match_sub and match_t and room_id != r_id:
                            objective_terms.append(c.weight * var)
                            
            elif c.constraint_type == "teacher_unavailable":
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

    # Penalize assigning multiple rooms to avoid unnecessary splits
    for var in y.values():
        objective_terms.append(var * 1)

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
    from app.solver.models import RoomAssignment
    for (sec_id, sub_id, t_id, slot_id), var in x.items():
        if solver.Value(var) == 1:
            # Find all rooms assigned to this session
            assigned_rooms = [
                r_id for (s_id, sb_id, teacher_id, sl_id, r_id), r_var in y.items()
                if s_id == sec_id and sb_id == sub_id and teacher_id == t_id and sl_id == slot_id and solver.Value(r_var) == 1
            ]
            
            total_cap = sum(rooms_map[r].capacity for r in assigned_rooms)
            room_assignments = []
            
            if not assigned_rooms:
                primary_room = "none"
            else:
                primary_room = assigned_rooms[0]
                sec_size = sections_map[sec_id].size
                remaining_students = sec_size
                for idx, r_id in enumerate(assigned_rooms):
                    room_cap = rooms_map[r_id].capacity
                    if idx == len(assigned_rooms) - 1:
                        student_count = remaining_students
                    else:
                        student_count = min(room_cap, int(math.ceil(sec_size * (room_cap / total_cap))) if total_cap else 0)
                        student_count = min(student_count, remaining_students)
                    
                    remaining_students -= student_count
                    
                    room_assignments.append(
                        RoomAssignment(
                            room_id=r_id,
                            student_count=student_count,
                            sub_group=f"{sections_map[sec_id].name}_{idx+1}" if len(assigned_rooms) > 1 else None,
                            capacity_contribution=student_count
                        )
                    )
            
            assignments.append(
                ScheduledSlot(
                    section_id=sec_id,
                    subject_id=sub_id,
                    teacher_id=t_id,
                    room_id=primary_room,
                    slot_id=slot_id,
                    duration_periods=getattr(subjects_map[sub_id], "session_length", 1) or 1,
                    room_assignments=room_assignments
                )
            )
            
    return status_str, assignments
