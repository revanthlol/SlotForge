from typing import List, Union
from uuid import UUID
from sqlalchemy.orm import Session

from app.models.constraint_rule import ConstraintRule
from app.solver.models import Constraint as SolverConstraint
from app.services.constraints.registry import CONSTRAINT_TEMPLATES
from app.services.constraints.solver_functions import SOLVER_FUNCTIONS


class ConstraintCompiler:
    """
    Compiles database ConstraintRule models into solver-compatible SolverConstraint objects.
    """

    def compile(self, rule: ConstraintRule) -> SolverConstraint:
        template = CONSTRAINT_TEMPLATES.get(rule.template_key)
        if not template:
            # Fallback for custom / legacy constraint types
            weight = rule.penalty if rule.rule_type == "soft" else None
            return SolverConstraint(
                id=str(rule.id),
                constraint_type=rule.template_key,
                payload=rule.parameters or {},
                weight=weight,
            )

        solver_fn_name = template["solver_fn"]
        solver_fn = SOLVER_FUNCTIONS.get(solver_fn_name)
        if solver_fn:
            return solver_fn(
                rule_id=str(rule.id),
                workspace_id=rule.workspace_id,
                parameters=rule.parameters or {},
                penalty=rule.penalty,
                priority=rule.priority,
                rule_type=rule.rule_type or template["type"],
            )

        weight = rule.penalty if (rule.rule_type == "soft" or template["type"] == "soft") else None
        return SolverConstraint(
            id=str(rule.id),
            constraint_type=rule.template_key,
            payload=rule.parameters or {},
            weight=weight,
        )

    def compile_all(self, workspace_id: UUID, db: Session) -> List[SolverConstraint]:
        rules = (
            db.query(ConstraintRule)
            .filter(
                ConstraintRule.workspace_id == workspace_id,
                ConstraintRule.enabled == True,
            )
            .all()
        )
        return [self.compile(r) for r in rules]
