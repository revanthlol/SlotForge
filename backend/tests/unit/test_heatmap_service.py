import uuid
import pytest
from app.core.db import SessionLocal
from app.models.organization import Organization
from app.models.profile import Profile
from app.models.workspace import SchedulingWorkspace
from app.models.resource import Resource
from app.models.location import Location
from app.models.task import Task
from app.models.group import Group
from app.models.timeslot import TimeSlot
from app.models.constraint_rule import ConstraintRule
from app.models.schedule_run import ScheduleRun
from app.models.schedule_version import ScheduleVersion
from app.models.assignment import Assignment as DbAssignment, SectionSubjectTeacherAssignment
from app.services.heatmap_service import HeatmapService

@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        # Cleanup
        db.query(DbAssignment).delete()
        db.query(ScheduleRun).delete()
        db.query(ScheduleVersion).delete()
        db.query(ConstraintRule).delete()
        db.query(SectionSubjectTeacherAssignment).delete()
        db.query(Resource).delete()
        db.query(Location).delete()
        db.query(Task).delete()
        db.query(Group).delete()
        db.query(TimeSlot).delete()
        db.query(SchedulingWorkspace).delete()
        db.query(Profile).delete()
        db.query(Organization).delete()
        db.commit()
        yield db
    finally:
        db.close()

def test_calculate_pressure_report(db_session):
    db = db_session
    org = Organization(name="Unit Test Org")
    db.add(org)
    db.flush()

    workspace = SchedulingWorkspace(
        organization_id=org.id,
        name="Unit Test Workspace",
        domain_preset="academic"
    )
    db.add(workspace)
    db.flush()

    # Add 1 teacher, 1 classroom room, 1 subject, 1 section, and 5 timeslots
    teacher_id = uuid.uuid4()
    teacher = Resource(
        id=teacher_id,
        organization_id=org.id,
        workspace_id=workspace.id,
        name="Dr. Kumar",
        resource_type="teacher",
        availability={},
        max_hours_per_week=24
    )
    db.add(teacher)

    room_id = uuid.uuid4()
    room = Location(
        id=room_id,
        organization_id=org.id,
        workspace_id=workspace.id,
        name="Room 101",
        location_type="classroom",
        capacity=40,
        metadata={}
    )
    db.add(room)

    subject_id = uuid.uuid4()
    subject = Task(
        id=subject_id,
        organization_id=org.id,
        workspace_id=workspace.id,
        name="Mathematics",
        task_type="subject",
        required_hours=4,
        requires_continuous_slots=False
    )
    db.add(subject)

    section_id = uuid.uuid4()
    section = Group(
        id=section_id,
        organization_id=org.id,
        workspace_id=workspace.id,
        name="BSc CS-A",
        group_type="section",
        size=35
    )
    db.add(section)

    for i in range(1, 6):
        ts = TimeSlot(
            organization_id=org.id,
            workspace_id=workspace.id,
            name=f"Mon - Period {i}",
            day="Mon",
            slot_index=i
        )
        db.add(ts)

    db.flush()

    # Assign section-subject to teacher
    ssta = SectionSubjectTeacherAssignment(
        organization_id=org.id,
        workspace_id=workspace.id,
        section_id=section_id,
        subject_id=subject_id,
        teacher_id=teacher_id
    )
    db.add(ssta)

    db.commit()

    report = HeatmapService.calculate_pressure_report(workspace.id, db)
    assert report is not None
    assert len(report.items) > 0
    
    # Check Dr. Kumar pressure
    teacher_item = next(item for item in report.items if item.type == "teacher")
    assert teacher_item.name == "Dr. Kumar"
    assert teacher_item.required == 4
    assert teacher_item.available == 5
    assert teacher_item.utilization == 80.0
    assert teacher_item.severity == "medium"

    # Check BSC CS-A section pressure
    section_item = next(item for item in report.items if item.type == "section")
    assert section_item.name == "BSc CS-A"
    assert section_item.required == 4
    assert section_item.available == 5
    assert section_item.utilization == 80.0
    assert section_item.severity == "medium"

def test_calculate_violations_report(db_session):
    db = db_session
    org = Organization(name="Unit Test Violations Org")
    db.add(org)
    db.flush()

    workspace = SchedulingWorkspace(
        organization_id=org.id,
        name="Unit Test Workspace",
        domain_preset="academic"
    )
    db.add(workspace)
    db.flush()

    teacher_id = uuid.uuid4()
    teacher = Resource(
        id=teacher_id,
        organization_id=org.id,
        workspace_id=workspace.id,
        name="Dr. Patel",
        resource_type="teacher",
        availability={},
        max_hours_per_week=24
    )
    db.add(teacher)

    room_id = uuid.uuid4()
    room = Location(
        id=room_id,
        organization_id=org.id,
        workspace_id=workspace.id,
        name="Room 101",
        location_type="classroom",
        capacity=40,
        metadata={}
    )
    db.add(room)

    subject_id = uuid.uuid4()
    subject = Task(
        id=subject_id,
        organization_id=org.id,
        workspace_id=workspace.id,
        name="Physics",
        task_type="subject",
        required_hours=3,
        requires_continuous_slots=False
    )
    db.add(subject)

    section_id = uuid.uuid4()
    section = Group(
        id=section_id,
        organization_id=org.id,
        workspace_id=workspace.id,
        name="BSc CS-B",
        group_type="section",
        size=35
    )
    db.add(section)

    for i in range(1, 6):
        ts = TimeSlot(
            organization_id=org.id,
            workspace_id=workspace.id,
            name=f"Tue - Period {i}",
            day="Tue",
            slot_index=i
        )
        db.add(ts)

    db.flush()

    # Create schedule run and version
    version = ScheduleVersion(
        organization_id=org.id,
        workspace_id=workspace.id,
        version_number=1,
        status="draft",
        scores={"overall_score": 80}
    )
    db.add(version)
    db.flush()

    run = ScheduleRun(
        organization_id=org.id,
        workspace_id=workspace.id,
        status="success",
        schedule_version_id=version.id
    )
    db.add(run)
    db.flush()

    # Add assignments: schedule period 1 and period 3 (creating a gap in period 2!)
    a1 = DbAssignment(
        organization_id=org.id,
        workspace_id=workspace.id,
        schedule_version_id=version.id,
        task_id=subject_id,
        group_id=section_id,
        teacher_id=teacher_id,
        room_id=room_id,
        day="Tue",
        period=1,
        duration_slots=1
    )
    a2 = DbAssignment(
        organization_id=org.id,
        workspace_id=workspace.id,
        schedule_version_id=version.id,
        task_id=subject_id,
        group_id=section_id,
        teacher_id=teacher_id,
        room_id=room_id,
        day="Tue",
        period=3,
        duration_slots=1
    )
    db.add(a1)
    db.add(a2)
    db.commit()

    report = HeatmapService.calculate_violations_report(workspace.id, run.id, db)
    assert report is not None
    # We should have a gap violation!
    assert len(report.violations) == 1
    v = report.violations[0]
    assert v.constraint_type == "teacher_gap_minimization"
    assert "gap" in v.message
    assert v.day == "Tue"
    assert v.period == 2

    # Check cells
    assert len(report.heatmap) > 0
    cell = next(c for c in report.heatmap if c.day == "Tue" and c.period == 1)
    assert cell.value == 100.0  # 1/1 rooms occupied
