import uuid
from typing import Optional
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.solver.models import ProblemInstance, Teacher, Room, Subject, Section, Constraint as SolverConstraint, TimeSlot
from app.solver.engine import solve
from app.solver.defaults import DEFAULT_SLOTS

from app.models.organization import Organization as OrgModel
from app.models.teacher import Teacher as TeacherModel
from app.models.room import Room as RoomModel
from app.models.subject import Subject as SubjectModel
from app.models.section import Section as SectionModel
from app.models.constraint import Constraint as ConstraintModel
from app.models.timetable_version import TimetableVersion as VersionModel
from app.models.timetable_slot import TimetableSlot as SlotModel

class TimetableService:
    @staticmethod
    def generate_timetable(org_id: uuid.UUID, user_id: Optional[uuid.UUID], db: Session) -> Optional[dict]:
        """
        Loads all organization resources from Postgres, runs the CP-SAT solver,
        persists the timetable version and slots to the database, and returns the result.
        """
        # 1. Verify organization exists
        org = db.query(OrgModel).filter(OrgModel.id == org_id).first()
        if not org:
            return None
            
        # 2. Load all resources from DB
        db_teachers = db.query(TeacherModel).filter(TeacherModel.organization_id == org_id).all()
        db_rooms = db.query(RoomModel).filter(RoomModel.organization_id == org_id).all()
        db_subjects = db.query(SubjectModel).filter(SubjectModel.organization_id == org_id).all()
        db_sections = db.query(SectionModel).filter(SectionModel.organization_id == org_id).all()
        db_constraints = db.query(ConstraintModel).filter(ConstraintModel.organization_id == org_id).all()
        
        # 3. Map to solver input domain models
        org_teachers = [
            Teacher(id=str(t.id), name=t.name) for t in db_teachers
        ]
        org_rooms = [
            Room(id=str(r.id), name=r.name, capacity=r.capacity, type=r.room_type) for r in db_rooms
        ]
        org_subjects = [
            Subject(id=str(s.id), name=s.name, weekly_hours=s.weekly_hours) for s in db_subjects
        ]
        org_sections = [
            Section(id=str(sec.id), name=sec.name, size=sec.size) for sec in db_sections
        ]
        org_constraints = [
            SolverConstraint(id=str(c.id), constraint_type=c.constraint_type, payload=c.payload, weight=c.weight)
            for c in db_constraints
        ]
        org_slots = [
            TimeSlot(id=s["id"], day=s["day"], period=s["period"]) for s in DEFAULT_SLOTS
        ]
        
        # 4. Build ProblemInstance
        instance = ProblemInstance(
            teachers=org_teachers,
            rooms=org_rooms,
            subjects=org_subjects,
            sections=org_sections,
            slots=org_slots,
            constraints=org_constraints
        )
        
        # 5. Solve
        solver_result = solve(instance)
        
        # 6. Determine new version number per organization
        max_version = db.query(func.max(VersionModel.version_number)).filter(
            VersionModel.organization_id == org_id
        ).scalar() or 0
        new_version_number = max_version + 1
        
        # 7. Create Timetable Version
        version = VersionModel(
            organization_id=org_id,
            version_number=new_version_number,
            status="draft",
            scores=solver_result.scores,
            created_by=user_id
        )
        db.add(version)
        db.flush()  # populate version.id
        
        # 8. Create slots if solve is successful
        slot_details = {s["id"]: (s["day"], s["period"]) for s in DEFAULT_SLOTS}
        
        if solver_result.status in ("OPTIMAL", "FEASIBLE"):
            for a in solver_result.assignments:
                day, period = slot_details[a.slot_id]
                slot = SlotModel(
                    organization_id=org_id,
                    timetable_version_id=version.id,
                    section_id=uuid.UUID(a.section_id),
                    subject_id=uuid.UUID(a.subject_id),
                    teacher_id=uuid.UUID(a.teacher_id),
                    room_id=uuid.UUID(a.room_id),
                    day=day,
                    period=period
                )
                db.add(slot)
                
        db.commit()
        db.refresh(version)
        
        # Load slots to return
        slots_created = db.query(SlotModel).filter(SlotModel.timetable_version_id == version.id).all()
        assignments = []
        for sc in slots_created:
            # Map back day/period to slot_id
            found_slot_id = f"{sc.day.lower()}-{sc.period}"
            assignments.append({
                "section_id": str(sc.section_id),
                "subject_id": str(sc.subject_id),
                "teacher_id": str(sc.teacher_id),
                "room_id": str(sc.room_id),
                "slot_id": found_slot_id
            })
            
        return {
            "id": str(version.id),
            "organization_id": str(version.organization_id),
            "status": solver_result.status,
            "assignments": assignments,
            "scores": version.scores,
            "infeasible_reason": solver_result.infeasible_reason
        }

    @staticmethod
    def get_timetable(timetable_id: uuid.UUID, org_id: uuid.UUID, db: Session) -> Optional[dict]:
        """
        Retrieves a saved timetable version and its slots from database.
        """
        version = db.query(VersionModel).filter(
            VersionModel.id == timetable_id,
            VersionModel.organization_id == org_id
        ).first()
        
        if not version:
            return None
            
        slots = db.query(SlotModel).filter(SlotModel.timetable_version_id == version.id).all()
        assignments = []
        for sc in slots:
            found_slot_id = f"{sc.day.lower()}-{sc.period}"
            assignments.append({
                "section_id": str(sc.section_id),
                "subject_id": str(sc.subject_id),
                "teacher_id": str(sc.teacher_id),
                "room_id": str(sc.room_id),
                "slot_id": found_slot_id
            })
            
        return {
            "id": str(version.id),
            "organization_id": str(version.organization_id),
            "status": version.status,
            "assignments": assignments,
            "scores": version.scores,
            "infeasible_reason": None if version.status in ("OPTIMAL", "FEASIBLE") else "Infeasible"
        }
