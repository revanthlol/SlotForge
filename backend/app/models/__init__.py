from app.core.db import Base
from app.models.organization import Organization
from app.models.profile import Profile
from app.models.organization_membership import OrganizationMembership
from app.models.workspace import SchedulingWorkspace
from app.models.resource import Resource
from app.models.task import Task
from app.models.group import Group
from app.models.location import Location
from app.models.timeslot import TimeSlot
from app.models.schedule_version import ScheduleVersion
from app.models.schedule_run import ScheduleRun
from app.models.assignment import Assignment, AssignmentResource, AssignmentLocation
from app.models.constraint_rule import ConstraintRule
from app.models.audit_log import AuditLog

# Legacy models and aliases for backward compatibility
from app.models.teacher import Teacher
from app.models.room import Room
from app.models.subject import Subject
from app.models.section import Section
from app.models.constraint import Constraint
from app.models.timetable_version import TimetableVersion
from app.models.timetable_slot import TimetableSlot
from app.models.assignment import TeacherSubjectAssignment, SectionSubjectTeacherAssignment

__all__ = [
    "Base",
    "Organization",
    "Profile",
    "OrganizationMembership",
    "SchedulingWorkspace",
    "Resource",
    "Task",
    "Group",
    "Location",
    "TimeSlot",
    "ScheduleVersion",
    "ScheduleRun",
    "Assignment",
    "AssignmentResource",
    "AssignmentLocation",
    "ConstraintRule",
    "AuditLog",
    # Legacy
    "Teacher",
    "Room",
    "Subject",
    "Section",
    "Constraint",
    "TimetableVersion",
    "TimetableSlot",
    "TeacherSubjectAssignment",
    "SectionSubjectTeacherAssignment"
]
