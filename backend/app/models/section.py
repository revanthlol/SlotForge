from sqlalchemy.ext.hybrid import hybrid_property
import uuid
from app.models.group import Group

class Section(Group):
    __mapper_args__ = {
        "polymorphic_identity": "section",
    }

    @hybrid_property
    def class_teacher_id(self):
        val = self.group_metadata.get("class_teacher_id")
        return uuid.UUID(val) if val else None

    @class_teacher_id.setter
    def class_teacher_id(self, value):
        if self.group_metadata is None:
            self.group_metadata = {}
        # Make a copy to trigger update detection
        meta = dict(self.group_metadata)
        meta["class_teacher_id"] = str(value) if value else None
        self.group_metadata = meta
