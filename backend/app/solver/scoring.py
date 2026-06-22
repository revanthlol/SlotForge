from collections import defaultdict
from app.solver.models import ProblemInstance, ScheduledSlot

def compute_soft_constraint_scores(instance: ProblemInstance, assignments: list[ScheduledSlot]) -> dict:
    """
    Computes quality scores (0-100) for a solved timetable based on:
    - preference_score: percentage of satisfied teacher preferences.
    - utilization_score: average of room and teacher utilization.
    - gap_score: normalized count of schedule gaps for teachers.
    - overall_score: weighted average of the above.
    """
    # Create lookup map for slot_id -> TimeSlot
    slot_map = {slot.id: slot for slot in instance.slots}
    
    # 1. Preference Score
    pref_constraints = [c for c in instance.constraints if c.constraint_type == "teacher_preferred_slot"]
    if not pref_constraints:
        preference_score = 100
    else:
        satisfied_prefs = 0
        # Build set of scheduled (teacher_id, slot_id)
        scheduled_teacher_slots = {(a.teacher_id, a.slot_id) for a in assignments}
        
        for c in pref_constraints:
            t_id = c.payload.get("teacher_id")
            s_id = c.payload.get("slot_id")
            
            # If payload specifies day and period instead of slot_id, find the slot_id
            if not s_id:
                day = c.payload.get("day")
                period = c.payload.get("period")
                for slot in instance.slots:
                    if slot.day == day and slot.period == period:
                        s_id = slot.id
                        break
                        
            if t_id and s_id:
                if (t_id, s_id) in scheduled_teacher_slots:
                    satisfied_prefs += 1
                    
        preference_score = round(100 * satisfied_prefs / len(pref_constraints))

    # 2. Utilization Score
    num_assignments = len(assignments)
    num_rooms = len(instance.rooms)
    num_teachers = len(instance.teachers)
    num_slots = len(instance.slots)
    
    room_capacity = num_rooms * num_slots
    teacher_capacity = num_teachers * num_slots
    
    room_util = num_assignments / room_capacity if room_capacity > 0 else 0.0
    teacher_util = num_assignments / teacher_capacity if teacher_capacity > 0 else 0.0
    
    utilization_score = round(100 * (room_util + teacher_util) / 2)

    # 3. Gap Score
    # Group slot periods by day
    slots_by_day = defaultdict(list)
    for slot in instance.slots:
        slots_by_day[slot.day].append(slot.period)
        
    periods_per_day = {day: len(periods) for day, periods in slots_by_day.items()}
    
    # Group teacher assignments by (teacher_id, day) -> list of periods
    teacher_day_periods = defaultdict(list)
    for a in assignments:
        slot = slot_map.get(a.slot_id)
        if slot:
            teacher_day_periods[(a.teacher_id, slot.day)].append(slot.period)
            
    total_gaps = 0
    max_possible_gaps = 0
    
    # For each teacher and day where they teach
    for (t_id, day), periods in teacher_day_periods.items():
        if not periods:
            continue
        unique_periods = sorted(list(set(periods)))
        span = unique_periods[-1] - unique_periods[0] + 1
        gaps = span - len(unique_periods)
        total_gaps += gaps
        
        # Max possible gaps is the number of slots in that day - 2 (only if slots > 2)
        day_slots_count = periods_per_day.get(day, 0)
        if day_slots_count > 2:
            max_possible_gaps += (day_slots_count - 2)
            
    if max_possible_gaps == 0:
        gap_score = 100
    else:
        gap_score = max(0, round(100 * (1 - total_gaps / max_possible_gaps)))

    # 4. Overall Score
    overall_score = round(0.4 * preference_score + 0.3 * utilization_score + 0.3 * gap_score)
    
    return {
        "preference_score": preference_score,
        "utilization_score": utilization_score,
        "gap_score": gap_score,
        "overall_score": overall_score
    }
