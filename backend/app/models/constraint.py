from sqlalchemy.orm import synonym
from app.models.constraint_rule import ConstraintRule

class Constraint(ConstraintRule):
    constraint_type = synonym("template_key")
    payload = synonym("parameters")
    weight = synonym("penalty")
