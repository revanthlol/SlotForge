import uuid
from sqlalchemy.orm import Session
from app.solver.models import ProblemInstance, Teacher, Room, Subject, Section, Constraint as SolverConstraint, TimeSlot
from app.models.resource import Resource
from app.models.task import Task
from app.models.group import Group
from app.models.location import Location
from app.models.timeslot import TimeSlot as DbTimeSlot
from app.models.constraint_rule import ConstraintRule
from app.models.workspace import SchedulingWorkspace

class AcademicSolverAdapter:
    """
    Translates generic workspace data -> solver-compatible format.
    """
    @staticmethod
    def ensure_timeslots_exist(workspace_id: uuid.UUID, db: Session) -> list[DbTimeSlot]:
        existing = db.query(DbTimeSlot).filter(DbTimeSlot.workspace_id == workspace_id).all()
        if existing:
            return existing
            
        workspace = db.query(SchedulingWorkspace).filter(SchedulingWorkspace.id == workspace_id).first()
        if not workspace:
            return []
            
        from app.models.organization import Organization as OrgModel
        org = db.query(OrgModel).filter(OrgModel.id == workspace.organization_id).first()
        if not org:
            return []
            
        scheduling_mode = getattr(org, "scheduling_mode", "fixed_weekday")
        cycle_length = getattr(org, "cycle_length", 5) or 5
        periods_per_day = getattr(org, "periods_per_day", 5) or 5
        
        db_slots = []
        if scheduling_mode == "day_order":
            roman_numerals = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV"]
            def get_roman(num):
                if num < len(roman_numerals):
                    return roman_numerals[num]
                return str(num)
            
            for i in range(1, cycle_length + 1):
                for p in range(1, periods_per_day + 1):
                    slot = DbTimeSlot(
                        organization_id=workspace.organization_id,
                        workspace_id=workspace_id,
                        name=f"Day {get_roman(i)} - Period {p}",
                        day=f"Day Order {get_roman(i)}",
                        slot_index=p
                    )
                    db.add(slot)
                    db_slots.append(slot)
        else:
            fixed_days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][:cycle_length]
            if cycle_length > len(fixed_days):
                fixed_days.extend(f"Day {i}" for i in range(len(fixed_days) + 1, cycle_length + 1))
            for day in fixed_days:
                for p in range(1, periods_per_day + 1):
                    slot = DbTimeSlot(
                        organization_id=workspace.organization_id,
                        workspace_id=workspace_id,
                        name=f"{day} - Period {p}",
                        day=day,
                        slot_index=p
                    )
                    db.add(slot)
                    db_slots.append(slot)
                    
        db.commit()
        
        # Re-query to return with populated IDs
        return db.query(DbTimeSlot).filter(DbTimeSlot.workspace_id == workspace_id).order_by(DbTimeSlot.slot_index).all()

    @staticmethod
    def build_instance(workspace_id: uuid.UUID, db: Session) -> ProblemInstance:
        # Ensure timeslots exist
        AcademicSolverAdapter.ensure_timeslots_exist(workspace_id, db)
        
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
