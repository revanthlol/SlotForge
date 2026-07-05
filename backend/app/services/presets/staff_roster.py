import uuid
from sqlalchemy.orm import Session
from app.solver.models import ProblemInstance, Teacher, Room, Subject, Section, Constraint as SolverConstraint, TimeSlot
from app.models.resource import Resource
from app.models.task import Task
from app.models.group import Group
from app.models.location import Location
from app.models.timeslot import TimeSlot as DbTimeSlot
from app.models.constraint_rule import ConstraintRule
from app.services.presets.base import BasePreset, BaseSolverAdapter

class StaffRosterAdapter(BaseSolverAdapter):
    time_unit_label = "Shift"

    def build_instance(self, workspace_id: uuid.UUID, db: Session) -> ProblemInstance:
        self.ensure_timeslots_exist(workspace_id, db)
        
        # 1. Load generic entities
        db_resources = db.query(Resource).filter(Resource.workspace_id == workspace_id, Resource.resource_type == "employee").all()
        db_locations = db.query(Location).filter(Location.workspace_id == workspace_id, Location.location_type == "work_zone").all()
        db_tasks = db.query(Task).filter(Task.workspace_id == workspace_id, Task.task_type == "coverage").all()
        db_groups = db.query(Group).filter(Group.workspace_id == workspace_id, Group.group_type == "department").all()
        db_timeslots = db.query(DbTimeSlot).filter(DbTimeSlot.workspace_id == workspace_id).order_by(DbTimeSlot.slot_index).all()
        db_rules = db.query(ConstraintRule).filter(ConstraintRule.workspace_id == workspace_id, ConstraintRule.enabled == True).all()

        # 2. Map resources (employees) to solver Teachers
        org_teachers = [
            Teacher(id=str(t.id), name=t.name) for t in db_resources
        ]

        # 3. Map locations (work zones) to solver Rooms
        org_rooms = [
            Room(id=str(r.id), name=r.name, capacity=r.capacity if r.capacity is not None else 9999, type=r.location_type)
            for r in db_locations
        ]

        # 4. Map tasks (coverage shifts) to solver Subjects
        org_subjects = [
            Subject(id=str(s.id), name=s.name, weekly_hours=s.weekly_hours if s.weekly_hours else 0, session_length=s.session_length)
            for s in db_tasks
        ]

        # 5. Map groups (departments) to solver Sections, splitting them into virtual slots based on size
        org_sections = []
        virtual_section_to_parent = {}
        parent_to_virtuals = {}
        
        for g in db_groups:
            # If size is None or 0, default to 1
            slots_needed = g.size if g.size and g.size > 0 else 1
            parent_to_virtuals[str(g.id)] = []
            for i in range(slots_needed):
                v_id = f"{g.id}_slot_{i}"
                v_name = f"{g.name} - Slot {i+1}"
                org_sections.append(
                    Section(id=v_id, name=v_name, size=1)
                )
                virtual_section_to_parent[v_id] = str(g.id)
                parent_to_virtuals[str(g.id)].append(v_id)

        # 6. Map timeslots to solver TimeSlots
        org_slots = [
            TimeSlot(id=str(slot.id), day=slot.day, period=slot.slot_index) for slot in db_timeslots
        ]

        # 7. Map constraints, duplicating group-related ones to each virtual section
        org_constraints = []
        for c in db_rules:
            # Check if constraint is section-specific
            section_id = c.parameters.get("section_id")
            if section_id and section_id in parent_to_virtuals:
                # Duplicate constraint for each virtual section of this group
                for v_sec_id in parent_to_virtuals[section_id]:
                    new_params = dict(c.parameters)
                    new_params["section_id"] = v_sec_id
                    org_constraints.append(
                        SolverConstraint(
                            id=f"{c.id}_{v_sec_id}",
                            constraint_type=c.template_key,
                            payload=new_params,
                            weight=c.penalty
                        )
                    )
            else:
                org_constraints.append(
                    SolverConstraint(
                        id=str(c.id),
                        constraint_type=c.template_key,
                        payload=c.parameters,
                        weight=c.penalty
                    )
                )

        return ProblemInstance(
            teachers=org_teachers,
            rooms=org_rooms,
            subjects=org_subjects,
            sections=org_sections,
            slots=org_slots,
            constraints=org_constraints
        )


class StaffRosterPreset(BasePreset):
    key = "staff_roster"
    name = "Staff Roster"
    description = "Employees, departments, shift blocks, and coverage rules."
    resource_type = "employee"
    task_type = "coverage"
    group_type = "department"
    location_types = ["work_zone"]
    time_unit = "shifts"
    default_constraints = [
        "no_teacher_double_booking",
        "role_coverage",
        "rest_between_shifts",
    ]
    solver_adapter = StaffRosterAdapter
