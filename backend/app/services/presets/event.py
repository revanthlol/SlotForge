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

class EventSchedulingAdapter(BaseSolverAdapter):
    time_unit_label = "Slot"

    def build_instance(self, workspace_id: uuid.UUID, db: Session) -> ProblemInstance:
        self.ensure_timeslots_exist(workspace_id, db)
        
        # 1. Load generic entities
        db_resources = db.query(Resource).filter(Resource.workspace_id == workspace_id, Resource.resource_type == "speaker").all()
        db_locations = db.query(Location).filter(Location.workspace_id == workspace_id, Location.location_type == "hall").all()
        db_tasks = db.query(Task).filter(Task.workspace_id == workspace_id, Task.task_type == "session").all()
        db_groups = db.query(Group).filter(Group.workspace_id == workspace_id, Group.group_type == "track").all()
        db_timeslots = db.query(DbTimeSlot).filter(DbTimeSlot.workspace_id == workspace_id).order_by(DbTimeSlot.slot_index).all()
        db_rules = db.query(ConstraintRule).filter(ConstraintRule.workspace_id == workspace_id, ConstraintRule.enabled == True).all()

        # 2. Map speakers to solver Teachers
        org_teachers = [
            Teacher(id=str(t.id), name=t.name) for t in db_resources
        ]

        # 3. Map halls to solver Rooms
        org_rooms = [
            Room(id=str(r.id), name=r.name, capacity=r.capacity if r.capacity is not None else 9999, type=r.location_type)
            for r in db_locations
        ]

        # 4. Map sessions to solver Subjects
        org_subjects = [
            Subject(id=str(s.id), name=s.name, weekly_hours=s.weekly_hours if s.weekly_hours else 0, session_length=s.session_length)
            for s in db_tasks
        ]

        # 5. Map tracks to solver Sections
        org_sections = [
            Section(id=str(sec.id), name=sec.name, size=sec.size if sec.size else 0)
            for sec in db_groups
        ]

        # 6. Map timeslots to solver TimeSlots
        org_slots = [
            TimeSlot(id=str(slot.id), day=slot.day, period=slot.slot_index) for slot in db_timeslots
        ]

        # 7. Map constraints
        org_constraints = [
            SolverConstraint(id=str(c.id), constraint_type=c.template_key, payload=c.parameters, weight=c.penalty)
            for c in db_rules
        ]

        return ProblemInstance(
            teachers=org_teachers,
            rooms=org_rooms,
            subjects=org_subjects,
            sections=org_sections,
            slots=org_slots,
            constraints=org_constraints
        )


class EventPreset(BasePreset):
    key = "event"
    name = "Event Scheduling"
    description = "Speakers, sessions, halls, volunteers, and event time blocks."
    resource_type = "speaker"
    task_type = "session"
    group_type = "track"
    location_types = ["hall"]
    time_unit = "event_slots"
    default_constraints = [
        "no_speaker_clash",
        "hall_capacity",
        "equipment_match",
    ]
    solver_adapter = EventSchedulingAdapter
