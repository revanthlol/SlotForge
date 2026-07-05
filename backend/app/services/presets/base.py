import uuid
from sqlalchemy.orm import Session
from app.solver.models import ProblemInstance
from app.models.timeslot import TimeSlot as DbTimeSlot
from app.models.workspace import SchedulingWorkspace
from app.models.organization import Organization as OrgModel

class BaseSolverAdapter:
    time_unit_label = "Period"

    def ensure_timeslots_exist(self, workspace_id: uuid.UUID, db: Session) -> list[DbTimeSlot]:
        existing = db.query(DbTimeSlot).filter(DbTimeSlot.workspace_id == workspace_id).all()
        if existing:
            return existing
            
        workspace = db.query(SchedulingWorkspace).filter(SchedulingWorkspace.id == workspace_id).first()
        if not workspace:
            return []
            
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
                        name=f"Day {get_roman(i)} - {self.time_unit_label} {p}",
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
                        name=f"{day} - {self.time_unit_label} {p}",
                        day=day,
                        slot_index=p
                    )
                    db.add(slot)
                    db_slots.append(slot)
                    
        db.commit()
        return db.query(DbTimeSlot).filter(DbTimeSlot.workspace_id == workspace_id).order_by(DbTimeSlot.slot_index).all()

    def build_instance(self, workspace_id: uuid.UUID, db: Session) -> ProblemInstance:
        raise NotImplementedError()


class BasePreset:
    key: str
    name: str
    description: str
    resource_type: str
    task_type: str
    group_type: str
    location_types: list[str]
    time_unit: str
    default_constraints: list[str]
    solver_adapter: type[BaseSolverAdapter]
