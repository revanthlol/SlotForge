import uuid
from typing import Optional

from app.core.db_memory import db
from app.solver.models import ProblemInstance, Teacher, Room, Subject, Section, Constraint, TimeSlot, SolverResult
from app.solver.engine import solve
from app.solver.defaults import DEFAULT_SLOTS

class TimetableService:
    @staticmethod
    def generate_timetable(org_id: str) -> Optional[dict]:
        """
        Retrieves all resources for the given organization_id from memory,
        builds a ProblemInstance, runs the solver, stores the result, and returns it.
        """
        # Ensure organization exists
        with db.lock:
            if org_id not in db.organizations:
                return None
                
            # Fetch all resources for this organization
            org_teachers = [
                Teacher(id=t["id"], name=t["name"])
                for t in db.teachers.values() if t["organization_id"] == org_id
            ]
            org_rooms = [
                Room(id=r["id"], name=r["name"], capacity=r["capacity"], type=r["room_type"])
                for r in db.rooms.values() if r["organization_id"] == org_id
            ]
            org_subjects = [
                Subject(id=s["id"], name=s["name"], weekly_hours=s["weekly_hours"])
                for s in db.subjects.values() if s["organization_id"] == org_id
            ]
            org_sections = [
                Section(id=sec["id"], name=sec["name"], size=sec["size"])
                for sec in db.sections.values() if sec["organization_id"] == org_id
            ]
            org_constraints = [
                Constraint(id=c["id"], constraint_type=c["constraint_type"], payload=c["payload"], weight=c["weight"])
                for c in db.constraints.values() if c["organization_id"] == org_id
            ]
            
        # Map default slots
        slots = [
            TimeSlot(id=s["id"], day=s["day"], period=s["period"])
            for s in DEFAULT_SLOTS
        ]
        
        # Build ProblemInstance
        instance = ProblemInstance(
            teachers=org_teachers,
            rooms=org_rooms,
            subjects=org_subjects,
            sections=org_sections,
            slots=slots,
            constraints=org_constraints
        )
        
        # Solve
        solver_result = solve(instance)
        
        # Save result
        timetable_id = str(uuid.uuid4())
        result_dict = {
            "id": timetable_id,
            "organization_id": org_id,
            "status": solver_result.status,
            "assignments": [a.model_dump() for a in solver_result.assignments],
            "scores": solver_result.scores,
            "infeasible_reason": solver_result.infeasible_reason
        }
        
        with db.lock:
            db.timetables[timetable_id] = result_dict
            
        return result_dict

    @staticmethod
    def get_timetable(timetable_id: str) -> Optional[dict]:
        """
        Retrieves a saved timetable from memory by its ID.
        """
        with db.lock:
            return db.timetables.get(timetable_id)
