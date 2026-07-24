from typing import Any, Dict, Optional
from uuid import UUID
from app.solver.models import Constraint as SolverConstraint

def _build_solver_constraint(
    rule_id: str,
    constraint_type: str,
    parameters: Dict[str, Any],
    penalty: Optional[int],
    rule_type: str
) -> SolverConstraint:
    weight = penalty if rule_type == "soft" else None
    return SolverConstraint(
        id=str(rule_id),
        constraint_type=constraint_type,
        payload=parameters or {},
        weight=weight
    )

def hard_no_resource_clash(rule_id: str, workspace_id: UUID, parameters: Dict[str, Any], penalty: Optional[int] = None, priority: int = 1, rule_type: str = "hard") -> SolverConstraint:
    return _build_solver_constraint(rule_id, "no_teacher_double_booking", parameters, penalty, "hard")

def hard_no_location_clash(rule_id: str, workspace_id: UUID, parameters: Dict[str, Any], penalty: Optional[int] = None, priority: int = 1, rule_type: str = "hard") -> SolverConstraint:
    return _build_solver_constraint(rule_id, "no_room_double_booking", parameters, penalty, "hard")

def hard_weekly_hours(rule_id: str, workspace_id: UUID, parameters: Dict[str, Any], penalty: Optional[int] = None, priority: int = 1, rule_type: str = "hard") -> SolverConstraint:
    return _build_solver_constraint(rule_id, "weekly_subject_hours", parameters, penalty, "hard")

def hard_continuous_slots(rule_id: str, workspace_id: UUID, parameters: Dict[str, Any], penalty: Optional[int] = None, priority: int = 1, rule_type: str = "hard") -> SolverConstraint:
    return _build_solver_constraint(rule_id, "lab_continuous_slots", parameters, penalty, "hard")

def hard_resource_availability(rule_id: str, workspace_id: UUID, parameters: Dict[str, Any], penalty: Optional[int] = None, priority: int = 1, rule_type: str = "hard") -> SolverConstraint:
    return _build_solver_constraint(rule_id, "teacher_availability", parameters, penalty, "hard")

def soft_avoid_consecutive_same_task(rule_id: str, workspace_id: UUID, parameters: Dict[str, Any], penalty: Optional[int] = None, priority: int = 1, rule_type: str = "soft") -> SolverConstraint:
    p = penalty if penalty is not None else parameters.get("penalty", 5)
    return _build_solver_constraint(rule_id, "avoid_consecutive_same_subject", parameters, p, "soft")

def soft_avoid_last_slot(rule_id: str, workspace_id: UUID, parameters: Dict[str, Any], penalty: Optional[int] = None, priority: int = 1, rule_type: str = "soft") -> SolverConstraint:
    p = penalty if penalty is not None else parameters.get("penalty", 3)
    return _build_solver_constraint(rule_id, "avoid_last_period", parameters, p, "soft")

def soft_prefer_early_slot(rule_id: str, workspace_id: UUID, parameters: Dict[str, Any], penalty: Optional[int] = None, priority: int = 1, rule_type: str = "soft") -> SolverConstraint:
    p = penalty if penalty is not None else parameters.get("penalty", 4)
    return _build_solver_constraint(rule_id, "prefer_morning_labs", parameters, p, "soft")

def soft_daily_load_limit(rule_id: str, workspace_id: UUID, parameters: Dict[str, Any], penalty: Optional[int] = None, priority: int = 1, rule_type: str = "soft") -> SolverConstraint:
    p = penalty if penalty is not None else parameters.get("penalty", 5)
    return _build_solver_constraint(rule_id, "limit_daily_load", parameters, p, "soft")

def hard_block_slot(rule_id: str, workspace_id: UUID, parameters: Dict[str, Any], penalty: Optional[int] = None, priority: int = 1, rule_type: str = "hard") -> SolverConstraint:
    return _build_solver_constraint(rule_id, "reserve_period_for_assembly", parameters, None, "hard")

def soft_group_daily_load(rule_id: str, workspace_id: UUID, parameters: Dict[str, Any], penalty: Optional[int] = None, priority: int = 1, rule_type: str = "soft") -> SolverConstraint:
    p = penalty if penalty is not None else parameters.get("penalty", 6)
    return _build_solver_constraint(rule_id, "avoid_section_overload_day", parameters, p, "soft")

def hard_capacity_constraint(rule_id: str, workspace_id: UUID, parameters: Dict[str, Any], penalty: Optional[int] = None, priority: int = 1, rule_type: str = "hard") -> SolverConstraint:
    return _build_solver_constraint(rule_id, "room_capacity_required", parameters, None, "hard")

SOLVER_FUNCTIONS = {
    "hard_no_resource_clash": hard_no_resource_clash,
    "hard_no_location_clash": hard_no_location_clash,
    "hard_weekly_hours": hard_weekly_hours,
    "hard_continuous_slots": hard_continuous_slots,
    "hard_resource_availability": hard_resource_availability,
    "soft_avoid_consecutive_same_task": soft_avoid_consecutive_same_task,
    "soft_avoid_last_slot": soft_avoid_last_slot,
    "soft_prefer_early_slot": soft_prefer_early_slot,
    "soft_daily_load_limit": soft_daily_load_limit,
    "hard_block_slot": hard_block_slot,
    "soft_group_daily_load": soft_group_daily_load,
    "hard_capacity_constraint": hard_capacity_constraint,
}
