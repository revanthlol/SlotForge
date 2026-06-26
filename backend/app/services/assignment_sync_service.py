import uuid

from sqlalchemy.orm import Session

from app.models.assignment import SectionSubjectTeacherAssignment, TeacherSubjectAssignment
from app.models.constraint import Constraint


ASSIGNMENT_SOURCE = "assignment"


class AssignmentSyncService:
    @staticmethod
    def regenerate_assignment_constraints(db: Session, org_id: uuid.UUID) -> None:
        db.query(Constraint).filter(
            Constraint.organization_id == org_id,
            Constraint.payload["source"].astext == ASSIGNMENT_SOURCE,
        ).delete(synchronize_session=False)

        teacher_subjects = db.query(TeacherSubjectAssignment).filter(
            TeacherSubjectAssignment.organization_id == org_id
        ).all()
        for assignment in teacher_subjects:
            db.add(Constraint(
                organization_id=org_id,
                constraint_type="teacher_subject",
                payload={
                    "source": ASSIGNMENT_SOURCE,
                    "teacher_id": str(assignment.teacher_id),
                    "subject_id": str(assignment.subject_id),
                },
                weight=None,
            ))

        section_teachers = db.query(SectionSubjectTeacherAssignment).filter(
            SectionSubjectTeacherAssignment.organization_id == org_id
        ).all()
        for assignment in section_teachers:
            db.add(Constraint(
                organization_id=org_id,
                constraint_type="section_subject_teacher",
                payload={
                    "source": ASSIGNMENT_SOURCE,
                    "section_id": str(assignment.section_id),
                    "subject_id": str(assignment.subject_id),
                    "teacher_id": str(assignment.teacher_id),
                },
                weight=None,
            ))
