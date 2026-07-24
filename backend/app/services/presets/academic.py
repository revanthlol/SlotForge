import uuid
from sqlalchemy.orm import Session
from app.solver.models import ProblemInstance, Teacher, Room, Subject, Section, TimeSlot
from app.models.resource import Resource
from app.models.task import Task
from app.models.group import Group
from app.models.location import Location
from app.models.timeslot import TimeSlot as DbTimeSlot
from app.models.constraint_rule import ConstraintRule
from app.services.presets.base import BasePreset, BaseSolverAdapter
from app.services.constraints.compiler import ConstraintCompiler

class AcademicSolverAdapter(BaseSolverAdapter):
    time_unit_label = "Period"

    def build_instance(self, workspace_id: uuid.UUID, db: Session) -> ProblemInstance:
        self.ensure_timeslots_exist(workspace_id, db)
        
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
            Subject(id=str(s.id), name=s.name, weekly_hours=s.weekly_hours if s.weekly_hours else 0, session_length=s.session_length)
            for s in db_tasks
        ]
        org_sections = [
            Section(id=str(sec.id), name=sec.name, size=sec.size if sec.size else 0) for sec in db_groups
        ]
        org_constraints = [ConstraintCompiler().compile(c) for c in db_rules]
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


class AcademicPreset(BasePreset):
    key = "academic"
    name = "Academic Timetable"
    description = "Teachers, subjects, sections, classrooms, labs, and fixed periods."
    resource_type = "teacher"
    task_type = "subject"
    group_type = "section"
    location_types = ["classroom", "lab"]
    time_unit = "periods"
    default_constraints = [
        "no_teacher_double_booking",
        "no_room_double_booking",
        "weekly_subject_hours",
        "lab_continuous_slots",
        "section_room_split_capacity",
    ]
    solver_adapter = AcademicSolverAdapter
