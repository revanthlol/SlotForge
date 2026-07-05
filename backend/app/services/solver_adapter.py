import uuid
from sqlalchemy.orm import Session
from app.solver.models import ProblemInstance, Teacher, Room, Subject, Section, Constraint as SolverConstraint, TimeSlot
from app.models.resource import Resource
from app.models.task import Task
from app.models.group import Group
from app.models.location import Location
from app.models.timeslot import TimeSlot as DbTimeSlot
from app.models.constraint_rule import ConstraintRule

class AcademicSolverAdapter:
    """
    Translates generic workspace data -> solver-compatible format.
    """
    @staticmethod
    def build_instance(workspace_id: uuid.UUID, db: Session) -> ProblemInstance:
        # 1. Load generic entities
        db_resources = db.query(Resource).filter(Resource.workspace_id == workspace_id, Resource.resource_type == "teacher").all()
        db_locations = db.query(Location).filter(Location.workspace_id == workspace_id).all()
        db_tasks = db.query(Task).filter(Task.workspace_id == workspace_id, Task.task_type == "subject").all()
        db_groups = db.query(Group).filter(Group.workspace_id == workspace_id, Group.group_type == "section").all()
        db_timeslots = db.query(DbTimeSlot).filter(DbTimeSlot.workspace_id == workspace_id).order_by(DbTimeSlot.slot_index).all()
        db_rules = db.query(ConstraintRule).filter(ConstraintRule.workspace_id == workspace_id, ConstraintRule.enabled == True).all()

        # 2. Map to solver domain models
        org_teachers = [
            Teacher(id=str(t.id), name=t.name) for t in db_resources
        ]
        org_rooms = [
            Room(id=str(r.id), name=r.name, capacity=r.capacity, type=r.location_type) for r in db_locations
        ]
        org_subjects = [
            Subject(id=str(s.id), name=s.name, weekly_hours=s.session_length * s.weekly_hours if s.weekly_hours else 0, session_length=s.session_length)
            for s in db_tasks
        ]
        # Wait, the legacy subjects.weekly_hours is mapped via weekly_hours synonym in Task which points to required_hours.
        # Let's use s.weekly_hours (or s.required_hours) directly.
        org_subjects = [
            Subject(id=str(s.id), name=s.name, weekly_hours=s.weekly_hours if s.weekly_hours else 0, session_length=s.session_length)
            for s in db_tasks
        ]
        org_sections = [
            Section(id=str(sec.id), name=sec.name, size=sec.size if sec.size else 0) for sec in db_groups
        ]
        org_constraints = [
            SolverConstraint(id=str(c.id), constraint_type=c.template_key, payload=c.parameters, weight=c.penalty)
            for c in db_rules
        ]
        org_slots = [
            TimeSlot(id=str(slot.id), day=slot.day, period=slot.slot_index) for slot in db_timeslots
        ]

        return ProblemInstance(
            teachers=org_teachers,
            rooms=org_rooms,
            subjects=org_subjects,
            sections=org_sections,
            slots=org_slots,
            constraints=org_constraints
        )
