import uuid
from app.services.constraints.registry import CONSTRAINT_TEMPLATES
from app.services.constraints.solver_functions import SOLVER_FUNCTIONS
from app.services.constraints.compiler import ConstraintCompiler
from app.models.constraint_rule import ConstraintRule

def test_registry_contains_all_twelve_templates():
    expected_templates = [
        "no_teacher_double_booking",
        "no_room_double_booking",
        "weekly_subject_hours",
        "lab_continuous_slots",
        "teacher_availability",
        "reserve_period_for_assembly",
        "room_capacity_required",
        "avoid_consecutive_same_subject",
        "avoid_last_period",
        "prefer_morning_labs",
        "limit_daily_load",
        "avoid_section_overload_day",
    ]
    for key in expected_templates:
        assert key in CONSTRAINT_TEMPLATES
        template = CONSTRAINT_TEMPLATES[key]
        assert "name" in template
        assert "description" in template
        assert "type" in template
        assert template["solver_fn"] in SOLVER_FUNCTIONS

def test_constraint_compiler_hard_rule():
    rule = ConstraintRule(
        id=uuid.uuid4(),
        organization_id=uuid.uuid4(),
        workspace_id=uuid.uuid4(),
        name="Reserve Assembly",
        rule_type="hard",
        template_key="reserve_period_for_assembly",
        parameters={"day": "Monday", "period": 1, "label": "Assembly"},
        priority=1,
        penalty=None,
        enabled=True
    )
    compiler = ConstraintCompiler()
    solver_c = compiler.compile(rule)
    assert solver_c.constraint_type == "reserve_period_for_assembly"
    assert solver_c.weight is None
    assert solver_c.payload["day"] == "Monday"
    assert solver_c.payload["period"] == 1

def test_constraint_compiler_soft_rule():
    rule = ConstraintRule(
        id=uuid.uuid4(),
        organization_id=uuid.uuid4(),
        workspace_id=uuid.uuid4(),
        name="Avoid Last Period",
        rule_type="soft",
        template_key="avoid_last_period",
        parameters={"penalty": 3},
        priority=1,
        penalty=5,
        enabled=True
    )
    compiler = ConstraintCompiler()
    solver_c = compiler.compile(rule)
    assert solver_c.constraint_type == "avoid_last_period"
    assert solver_c.weight == 5
