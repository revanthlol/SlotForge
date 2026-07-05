import uuid
from typing import Optional
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.solver.models import ProblemInstance, Teacher, Room, Subject, Section, Constraint as SolverConstraint, TimeSlot
from app.solver.engine import solve

from app.models.organization import Organization as OrgModel
from app.models.teacher import Teacher as TeacherModel
from app.models.room import Room as RoomModel
from app.models.subject import Subject as SubjectModel
from app.models.section import Section as SectionModel
from app.models.constraint import Constraint as ConstraintModel
from app.models.timetable_version import TimetableVersion as VersionModel
from app.models.timetable_slot import TimetableSlot as SlotModel
from app.models.workspace import SchedulingWorkspace
from app.models.schedule_run import ScheduleRun
from app.models.schedule_version import ScheduleVersion
from app.models.timeslot import TimeSlot as DbTimeSlot

FIXED_WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

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
            Subject(id=str(s.id), name=s.name, weekly_hours=s.weekly_hours, session_length=s.session_length) for s in db_subjects
        ]
        org_sections = [
            Section(id=str(sec.id), name=sec.name, size=sec.size) for sec in db_sections
        ]
        org_constraints = [
            SolverConstraint(id=str(c.id), constraint_type=c.constraint_type, payload=c.payload, weight=c.weight)
            for c in db_constraints
        ]
        
        # Dynamically generate slots based on organization configuration
        scheduling_mode = getattr(org, "scheduling_mode", "fixed_weekday")
        cycle_length = getattr(org, "cycle_length", 6) or 6
        periods_per_day = getattr(org, "periods_per_day", 5) or 5
        
        if scheduling_mode == "day_order":
            roman_numerals = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV"]
            def get_roman(num):
                if num < len(roman_numerals):
                    return roman_numerals[num]
                return str(num)
            
            slots_list = [
                {
                    "id": f"day_order_{get_roman(i).lower()}-{p}",
                    "day": f"Day Order {get_roman(i)}",
                    "period": p
                }
                for i in range(1, cycle_length + 1)
                for p in range(1, periods_per_day + 1)
            ]
        else:
            # fixed_weekday: use the configured number of real weekday columns.
            fixed_days = FIXED_WEEKDAYS[:cycle_length]
            if cycle_length > len(FIXED_WEEKDAYS):
                fixed_days.extend(f"Day {i}" for i in range(len(FIXED_WEEKDAYS) + 1, cycle_length + 1))
            slots_list = [
                {
                    "id": f"{day.lower()}-{p}",
                    "day": day,
                    "period": p
                }
                for day in fixed_days
                for p in range(1, periods_per_day + 1)
            ]
            
        org_slots = [
            TimeSlot(id=s["id"], day=s["day"], period=s["period"]) for s in slots_list
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

        latest_version = db.query(VersionModel).filter(
            VersionModel.organization_id == org_id
        ).order_by(VersionModel.version_number.desc()).first()

        if solver_result.status == "INFEASIBLE":
            return {
                "id": str(latest_version.id) if latest_version else None,
                "version_id": str(latest_version.id) if latest_version else None,
                "organization_id": str(org_id),
                "status": solver_result.status,
                "version_status": latest_version.status if latest_version else None,
                "version_number": latest_version.version_number if latest_version else None,
                "assignments": [],
                "scores": solver_result.scores,
                "infeasible_reason": solver_result.infeasible_reason
            }

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
        slot_details = {s["id"]: (s["day"], s["period"]) for s in slots_list}
        
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
                    period=period,
                    duration_periods=a.duration_periods,
                )
                db.add(slot)
                db.flush() # Populate slot.id
                
                from app.models.assignment import AssignmentLocation
                for ra in a.room_assignments:
                    exists = db.query(AssignmentLocation).filter(
                        AssignmentLocation.assignment_id == slot.id,
                        AssignmentLocation.location_id == uuid.UUID(ra.room_id)
                    ).first()
                    if exists:
                        exists.student_count = ra.student_count
                        exists.sub_group = ra.sub_group
                        exists.capacity_contribution = ra.capacity_contribution
                    else:
                        db_al = AssignmentLocation(
                            assignment_id=slot.id,
                            location_id=uuid.UUID(ra.room_id),
                            student_count=ra.student_count,
                            sub_group=ra.sub_group,
                            capacity_contribution=ra.capacity_contribution
                        )
                        db.add(db_al)
                
        db.commit()
        db.refresh(version)
        
        # Load slots to return
        slots_created = db.query(SlotModel).filter(SlotModel.timetable_version_id == version.id).all()
        assignments = [TimetableService._slot_schema(sc) for sc in slots_created]
            
        return {
            "id": str(version.id),
            "version_id": str(version.id),
            "organization_id": str(version.organization_id),
            "status": solver_result.status,
            "version_status": version.status,
            "version_number": version.version_number,
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
        assignments = [TimetableService._slot_schema(sc) for sc in slots]
            
        return {
            "id": str(version.id),
            "version_id": str(version.id),
            "organization_id": str(version.organization_id),
            "status": version.status,
            "version_status": version.status,
            "version_number": version.version_number,
            "assignments": assignments,
            "scores": version.scores,
            "infeasible_reason": None if slots else "No assignments saved for this version"
        }

    @staticmethod
    def _slot_schema(slot: SlotModel) -> dict:
        if slot.day.startswith("Day Order "):
            found_slot_id = f"{slot.day.lower().replace(' ', '_')}-{slot.period}"
        else:
            found_slot_id = f"{slot.day.lower()}-{slot.period}"
            
        from app.models.assignment import AssignmentLocation
        db = Session.object_session(slot)
        room_assigns = []
        if db:
            locs = db.query(AssignmentLocation).filter(AssignmentLocation.assignment_id == slot.id).all()
            room_assigns = [
                {
                    "room_id": str(loc.location_id),
                    "student_count": loc.student_count,
                    "sub_group": loc.sub_group,
                    "capacity_contribution": loc.capacity_contribution
                }
                for loc in locs
            ]
            
        return {
            "id": str(slot.id),
            "section_id": str(slot.section_id),
            "subject_id": str(slot.subject_id),
            "teacher_id": str(slot.teacher_id),
            "room_id": str(slot.room_id),
            "slot_id": found_slot_id,
            "day": slot.day,
            "period": slot.period,
            "duration_periods": slot.duration_periods,
            "room_assignments": room_assigns
        }

    @staticmethod
    def generate_timetable_for_workspace(workspace_id: uuid.UUID, user_id: Optional[uuid.UUID], db: Session) -> Optional[dict]:
        workspace = db.query(SchedulingWorkspace).filter(SchedulingWorkspace.id == workspace_id).first()
        if not workspace:
            return None
        org_id = workspace.organization_id

        import time as pytime
        start_time = pytime.time()
        
        run = ScheduleRun(
            organization_id=org_id,
            workspace_id=workspace_id,
            status="running"
        )
        db.add(run)
        db.flush()

        from app.services.presets import get_preset_adapter, PRESET_REGISTRY
        preset_key = workspace.domain_preset or "academic"
        adapter_cls = get_preset_adapter(preset_key)
        adapter = adapter_cls()
        
        try:
            if hasattr(adapter, "solve_custom"):
                solver_result = adapter.solve_custom(workspace_id, db)
            else:
                instance = adapter.build_instance(workspace_id, db)
                solver_result = solve(instance)
        except Exception as e:
            run.status = "failed"
            run.error_message = str(e)
            db.commit()
            return {
                "run_id": str(run.id),
                "status": "failed",
                "error_message": str(e)
            }

        max_version = db.query(func.max(ScheduleVersion.version_number)).filter(
            ScheduleVersion.workspace_id == workspace_id
        ).scalar() or 0
        new_version_number = max_version + 1

        if solver_result.status == "INFEASIBLE":
            run.status = "failed"
            run.solver_score = solver_result.scores
            run.error_message = solver_result.infeasible_reason
            run.duration_seconds = pytime.time() - start_time
            db.commit()
            return {
                "run_id": str(run.id),
                "status": "failed",
                "solver_score": solver_result.scores,
                "error_message": solver_result.infeasible_reason
            }

        version = ScheduleVersion(
            organization_id=org_id,
            workspace_id=workspace_id,
            version_number=new_version_number,
            status="draft",
            scores=solver_result.scores,
            created_by=user_id
        )
        db.add(version)
        db.flush()

        if solver_result.status in ("OPTIMAL", "FEASIBLE"):
            for a in solver_result.assignments:
                # Parse timeslot ID
                try:
                    ts_id = uuid.UUID(a.slot_id)
                    db_timeslot = db.query(DbTimeSlot).filter(DbTimeSlot.id == ts_id).first()
                except ValueError:
                    db_timeslot = db.query(DbTimeSlot).filter(
                        DbTimeSlot.workspace_id == workspace_id,
                        DbTimeSlot.name == a.slot_id
                    ).first()

                if not db_timeslot:
                    continue
                
                # If section_id has virtual slot suffix, clean it for database section_id key
                section_uuid_str = a.section_id
                sub_group_val = None
                if "_slot_" in section_uuid_str:
                    parts = section_uuid_str.split("_slot_")
                    section_uuid_str = parts[0]
                    sub_group_val = f"Slot {int(parts[1]) + 1}"
                
                section_uuid = uuid.UUID(section_uuid_str)
                
                slot = SlotModel(
                    organization_id=org_id,
                    workspace_id=workspace_id,
                    schedule_version_id=version.id,
                    section_id=section_uuid,
                    subject_id=uuid.UUID(a.subject_id),
                    teacher_id=uuid.UUID(a.teacher_id),
                    room_id=uuid.UUID(a.room_id),
                    timeslot_id=db_timeslot.id,
                    day=db_timeslot.day,
                    period=db_timeslot.slot_index,
                    duration_periods=a.duration_periods
                )
                db.add(slot)
                db.flush()

                from app.models.assignment import AssignmentLocation
                for ra in a.room_assignments:
                    sub_group_to_use = ra.sub_group or sub_group_val
                    exists = db.query(AssignmentLocation).filter(
                        AssignmentLocation.assignment_id == slot.id,
                        AssignmentLocation.location_id == uuid.UUID(ra.room_id)
                    ).first()
                    if exists:
                        exists.student_count = ra.student_count
                        exists.sub_group = sub_group_to_use
                        exists.capacity_contribution = ra.capacity_contribution
                    else:
                        db_al = AssignmentLocation(
                            assignment_id=slot.id,
                            location_id=uuid.UUID(ra.room_id),
                            student_count=ra.student_count,
                            sub_group=sub_group_to_use,
                            capacity_contribution=ra.capacity_contribution
                        )
                        db.add(db_al)

        run.status = "success"
        run.schedule_version_id = version.id
        run.solver_score = solver_result.scores
        run.duration_seconds = pytime.time() - start_time
        
        db.commit()
        db.refresh(run)
        db.refresh(version)

        return {
            "run_id": str(run.id),
            "status": "success",
            "version_id": str(version.id),
            "version_number": version.version_number,
            "scores": version.scores
        }


