import uuid
from sqlalchemy.orm import Session
from app.solver.models import SolverResult, ScheduledSlot, RoomAssignment, ProblemInstance
from app.models.resource import Resource
from app.models.task import Task
from app.models.group import Group
from app.models.location import Location
from app.models.timeslot import TimeSlot as DbTimeSlot
from app.models.constraint_rule import ConstraintRule
from app.services.presets.base import BasePreset, BaseSolverAdapter

class FacilitySolverAdapter(BaseSolverAdapter):
    time_unit_label = "Slot"

    def build_instance(self, workspace_id: uuid.UUID, db: Session) -> ProblemInstance:
        # Dummy problem instance to satisfy interface
        return ProblemInstance(teachers=[], rooms=[], subjects=[], sections=[], slots=[], constraints=[])

    def solve_custom(self, workspace_id: uuid.UUID, db: Session) -> SolverResult:
        self.ensure_timeslots_exist(workspace_id, db)

        # 1. Load entities
        db_resources = db.query(Resource).filter(Resource.workspace_id == workspace_id, Resource.resource_type == "requester").all()
        db_locations = db.query(Location).filter(Location.workspace_id == workspace_id, Location.location_type == "facility").all()
        db_tasks = db.query(Task).filter(Task.workspace_id == workspace_id, Task.task_type == "booking_type").all()
        db_groups = db.query(Group).filter(Group.workspace_id == workspace_id, Group.group_type == "user_group").all()
        db_timeslots = db.query(DbTimeSlot).filter(DbTimeSlot.workspace_id == workspace_id).order_by(DbTimeSlot.slot_index).all()
        db_rules = db.query(ConstraintRule).filter(ConstraintRule.workspace_id == workspace_id, ConstraintRule.enabled == True).all()

        # 2. Parse constraints to build relationships
        # Determine allowed pairs
        section_subjects = set()
        section_subject_teachers = {}
        teacher_subjects = {}

        for c in db_rules:
            if c.template_key == "section_subject":
                sec_id = c.parameters.get("section_id")
                sub_id = c.parameters.get("subject_id")
                if sec_id and sub_id:
                    section_subjects.add((sec_id, sub_id))
            elif c.template_key == "section_subject_teacher":
                sec_id = c.parameters.get("section_id")
                sub_id = c.parameters.get("subject_id")
                t_id = c.parameters.get("teacher_id")
                if sec_id and sub_id and t_id:
                    section_subject_teachers[(sec_id, sub_id)] = t_id
            elif c.template_key == "teacher_subject":
                t_id = c.parameters.get("teacher_id")
                sub_id = c.parameters.get("subject_id")
                if t_id and sub_id:
                    if sub_id not in teacher_subjects:
                        teacher_subjects[sub_id] = set()
                    teacher_subjects[sub_id].add(t_id)

        # Default to all if no section_subject specified
        if not section_subjects:
            section_subjects = {(str(g.id), str(s.id)) for g in db_groups for s in db_tasks}

        # 3. Greedy allocation tracking
        group_busy = set()
        resource_busy = set()
        location_busy = set()
        assignments = []

        # We want to schedule based on task required hours (weekly_hours)
        for g in db_groups:
            g_id_str = str(g.id)
            for s in db_tasks:
                s_id_str = str(s.id)
                if (g_id_str, s_id_str) not in section_subjects:
                    continue

                # How many bookings are requested
                bookings_needed = s.weekly_hours if s.weekly_hours else 1
                scheduled_count = 0

                # Find qualified requesters (resources)
                req_id = section_subject_teachers.get((g_id_str, s_id_str))
                if req_id:
                    allowed_requesters = [r for r in db_resources if str(r.id) == req_id]
                elif s_id_str in teacher_subjects:
                    allowed_req_ids = teacher_subjects[s_id_str]
                    allowed_requesters = [r for r in db_resources if str(r.id) in allowed_req_ids]
                else:
                    allowed_requesters = list(db_resources)

                # Look for timeslots
                for slot in db_timeslots:
                    slot_id_str = str(slot.id)
                    if scheduled_count >= bookings_needed:
                        break

                    # Check if group is already busy in this slot
                    if (g_id_str, slot_id_str) in group_busy:
                        continue

                    # Find a requester who is free in this slot
                    assigned_req = None
                    for req in allowed_requesters:
                        req_id_str = str(req.id)
                        if (req_id_str, slot_id_str) not in resource_busy:
                            assigned_req = req
                            break

                    if not assigned_req:
                        continue

                    # Find a facility (location) that is free and has capacity >= group size
                    assigned_loc = None
                    for loc in db_locations:
                        loc_id_str = str(loc.id)
                        if (loc_id_str, slot_id_str) in location_busy:
                            continue
                        # Capacity check
                        if loc.capacity is not None and g.size is not None and loc.capacity < g.size:
                            continue
                        assigned_loc = loc
                        break

                    if not assigned_loc:
                        continue

                    # We found a slot, requester, and facility! Make the assignment
                    slot_id_val = str(slot.id)
                    req_id_val = str(assigned_req.id)
                    loc_id_val = str(assigned_loc.id)

                    group_busy.add((g_id_str, slot_id_val))
                    resource_busy.add((req_id_val, slot_id_val))
                    location_busy.add((loc_id_val, slot_id_val))

                    assignments.append(
                        ScheduledSlot(
                            section_id=g_id_str,
                            subject_id=s_id_str,
                            teacher_id=req_id_val,
                            room_id=loc_id_val,
                            slot_id=slot_id_val,
                            duration_periods=1,
                            room_assignments=[
                                RoomAssignment(
                                    room_id=loc_id_val,
                                    student_count=g.size if g.size else 0,
                                    sub_group=None,
                                    capacity_contribution=g.size if g.size else 0
                                )
                            ]
                        )
                    )
                    scheduled_count += 1

        # Determine status
        status = "OPTIMAL" if len(assignments) > 0 else "FEASIBLE"
        if not db_timeslots:
            status = "INFEASIBLE"
            reason = "No timeslots configured for facility booking workspace."
        elif not db_locations:
            status = "INFEASIBLE"
            reason = "No facilities (locations) defined in workspace."
        else:
            reason = None

        return SolverResult(
            status=status,
            assignments=assignments,
            scores={k: 100 for k in ["preference_score", "utilization_score", "gap_score", "overall_score"]},
            infeasible_reason=reason
        )


class FacilityPreset(BasePreset):
    key = "facility"
    name = "Facility Booking"
    description = "Rooms, requesters, availability windows, and booking rules."
    resource_type = "requester"
    task_type = "booking_type"
    group_type = "user_group"
    location_types = ["facility"]
    time_unit = "booking_slots"
    default_constraints = [
        "max_booking_duration",
        "advance_notice",
        "availability_window",
    ]
    solver_adapter = FacilitySolverAdapter
