from sqlalchemy.orm import synonym
from app.models.resource import Resource

class Teacher(Resource):
    teacher_metadata = synonym("resource_metadata")

    __mapper_args__ = {
        "polymorphic_identity": "teacher",
    }
