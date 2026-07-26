from app.models.task import Task

class Subject(Task):
    __mapper_args__ = {
        "polymorphic_identity": "subject",
    }
