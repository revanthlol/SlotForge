"""generic_schema

Revision ID: 5bd6dc8d30e7
Revises: e2f3b9d48c10
Create Date: 2026-07-05 16:17:37.565778

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '5bd6dc8d30e7'
down_revision: Union[str, None] = 'e2f3b9d48c10'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- Temp tables to preserve academic config and resources ---
    connection = op.get_bind()
    connection.execute(sa.text("CREATE TEMP TABLE temp_teachers AS SELECT * FROM teachers"))
    connection.execute(sa.text("CREATE TEMP TABLE temp_subjects AS SELECT * FROM subjects"))
    connection.execute(sa.text("CREATE TEMP TABLE temp_sections AS SELECT * FROM sections"))
    connection.execute(sa.text("CREATE TEMP TABLE temp_rooms AS SELECT * FROM rooms"))
    connection.execute(sa.text("CREATE TEMP TABLE temp_constraints AS SELECT * FROM constraints"))
    connection.execute(sa.text("CREATE TEMP TABLE temp_timetable_versions AS SELECT * FROM timetable_versions"))
    connection.execute(sa.text("CREATE TEMP TABLE temp_timetable_slots AS SELECT * FROM timetable_slots"))
    connection.execute(sa.text("CREATE TEMP TABLE temp_tsa AS SELECT * FROM teacher_subject_assignments"))
    connection.execute(sa.text("CREATE TEMP TABLE temp_ssta AS SELECT * FROM section_subject_teacher_assignments"))

    # Drop old tables in dependency-respecting order using CASCADE
    connection.execute(sa.text("DROP TABLE IF EXISTS section_subject_teacher_assignments CASCADE"))
    connection.execute(sa.text("DROP TABLE IF EXISTS teacher_subject_assignments CASCADE"))
    connection.execute(sa.text("DROP TABLE IF EXISTS timetable_slots CASCADE"))
    connection.execute(sa.text("DROP TABLE IF EXISTS timetable_versions CASCADE"))
    connection.execute(sa.text("DROP TABLE IF EXISTS teachers CASCADE"))
    connection.execute(sa.text("DROP TABLE IF EXISTS subjects CASCADE"))
    connection.execute(sa.text("DROP TABLE IF EXISTS sections CASCADE"))
    connection.execute(sa.text("DROP TABLE IF EXISTS rooms CASCADE"))
    connection.execute(sa.text("DROP TABLE IF EXISTS constraints CASCADE"))

    # 1. Create scheduling_workspaces table
    op.create_table(
        'scheduling_workspaces',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('organization_id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('domain_preset', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 2. Create resources table
    op.create_table(
        'resources',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('organization_id', sa.Uuid(), nullable=False),
        sa.Column('workspace_id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('resource_type', sa.String(), nullable=False),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), server_default='{}', nullable=False),
        sa.Column('availability', postgresql.JSONB(astext_type=sa.Text()), server_default='{}', nullable=False),
        sa.Column('max_hours_per_week', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['workspace_id'], ['scheduling_workspaces.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 3. Create tasks table
    op.create_table(
        'tasks',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('organization_id', sa.Uuid(), nullable=False),
        sa.Column('workspace_id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('task_type', sa.String(), nullable=False),
        sa.Column('required_hours', sa.Integer(), nullable=True),
        sa.Column('requires_continuous_slots', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), server_default='{}', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['workspace_id'], ['scheduling_workspaces.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 4. Create groups table
    op.create_table(
        'groups',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('organization_id', sa.Uuid(), nullable=False),
        sa.Column('workspace_id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('group_type', sa.String(), nullable=False),
        sa.Column('size', sa.Integer(), nullable=True),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), server_default='{}', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['workspace_id'], ['scheduling_workspaces.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 5. Create locations table
    op.create_table(
        'locations',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('organization_id', sa.Uuid(), nullable=False),
        sa.Column('workspace_id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('location_type', sa.String(), nullable=False),
        sa.Column('capacity', sa.Integer(), nullable=False),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), server_default='{}', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['workspace_id'], ['scheduling_workspaces.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 6. Create timeslots table
    op.create_table(
        'timeslots',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('organization_id', sa.Uuid(), nullable=False),
        sa.Column('workspace_id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('day', sa.String(), nullable=False),
        sa.Column('start_time', sa.Time(), nullable=True),
        sa.Column('end_time', sa.Time(), nullable=True),
        sa.Column('slot_index', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['workspace_id'], ['scheduling_workspaces.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 7. Create schedule_versions table
    op.create_table(
        'schedule_versions',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('organization_id', sa.Uuid(), nullable=False),
        sa.Column('workspace_id', sa.Uuid(), nullable=False),
        sa.Column('version_label', sa.String(), nullable=False),
        sa.Column('version_number', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(), server_default='draft', nullable=False),
        sa.Column('scores', postgresql.JSONB(astext_type=sa.Text()), server_default='{}', nullable=False),
        sa.Column('explanation', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('parent_version_id', sa.Uuid(), nullable=True),
        sa.Column('is_manual_override', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), server_default='{}', nullable=False),
        sa.Column('created_by', sa.Uuid(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['workspace_id'], ['scheduling_workspaces.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['parent_version_id'], ['schedule_versions.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['created_by'], ['profiles.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('workspace_id', 'version_label', name='uq_workspace_version_label')
    )

    # 8. Create schedule_runs table
    op.create_table(
        'schedule_runs',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('organization_id', sa.Uuid(), nullable=False),
        sa.Column('workspace_id', sa.Uuid(), nullable=False),
        sa.Column('schedule_version_id', sa.Uuid(), nullable=True),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('solver_score', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('explanation', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('duration_seconds', sa.Float(), nullable=True),
        sa.Column('error_message', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['workspace_id'], ['scheduling_workspaces.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['schedule_version_id'], ['schedule_versions.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )

    # 9. Create assignments table
    op.create_table(
        'assignments',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('organization_id', sa.Uuid(), nullable=False),
        sa.Column('workspace_id', sa.Uuid(), nullable=False),
        sa.Column('schedule_version_id', sa.Uuid(), nullable=False),
        sa.Column('task_id', sa.Uuid(), nullable=False),
        sa.Column('group_id', sa.Uuid(), nullable=True),
        sa.Column('timeslot_id', sa.Uuid(), nullable=True),
        sa.Column('duration_slots', sa.Integer(), server_default='1', nullable=False),
        sa.Column('is_manual_override', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), server_default='{}', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('day', sa.String(), nullable=False),
        sa.Column('period', sa.Integer(), nullable=False),
        sa.Column('teacher_id', sa.Uuid(), nullable=False),
        sa.Column('room_id', sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['workspace_id'], ['scheduling_workspaces.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['schedule_version_id'], ['schedule_versions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['group_id'], ['groups.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['timeslot_id'], ['timeslots.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['teacher_id'], ['resources.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['room_id'], ['locations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 10. Create assignment_resources table
    op.create_table(
        'assignment_resources',
        sa.Column('assignment_id', sa.Uuid(), nullable=False),
        sa.Column('resource_id', sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(['assignment_id'], ['assignments.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['resource_id'], ['resources.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('assignment_id', 'resource_id')
    )

    # 11. Create assignment_locations table
    op.create_table(
        'assignment_locations',
        sa.Column('assignment_id', sa.Uuid(), nullable=False),
        sa.Column('location_id', sa.Uuid(), nullable=False),
        sa.Column('student_count', sa.Integer(), nullable=True),
        sa.Column('sub_group', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['assignment_id'], ['assignments.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['location_id'], ['locations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('assignment_id', 'location_id')
    )

    # 12. Create constraint_rules table
    op.create_table(
        'constraint_rules',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('organization_id', sa.Uuid(), nullable=False),
        sa.Column('workspace_id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('rule_type', sa.String(), nullable=False),
        sa.Column('template_key', sa.String(), nullable=False),
        sa.Column('parameters', postgresql.JSONB(astext_type=sa.Text()), server_default='{}', nullable=False),
        sa.Column('priority', sa.Integer(), server_default='1', nullable=False),
        sa.Column('penalty', sa.Integer(), nullable=True),
        sa.Column('enabled', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['workspace_id'], ['scheduling_workspaces.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 13. Create teacher_subject_assignments table pointing to resources/tasks
    op.create_table(
        'teacher_subject_assignments',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('organization_id', sa.Uuid(), nullable=False),
        sa.Column('workspace_id', sa.Uuid(), nullable=False),
        sa.Column('teacher_id', sa.Uuid(), nullable=False),
        sa.Column('subject_id', sa.Uuid(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['workspace_id'], ['scheduling_workspaces.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['teacher_id'], ['resources.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['subject_id'], ['tasks.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('organization_id', 'teacher_id', 'subject_id', name='uq_teacher_subject_assignment_org_teacher_subject')
    )

    # 14. Create section_subject_teacher_assignments table pointing to groups/tasks/resources
    op.create_table(
        'section_subject_teacher_assignments',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('organization_id', sa.Uuid(), nullable=False),
        sa.Column('workspace_id', sa.Uuid(), nullable=False),
        sa.Column('section_id', sa.Uuid(), nullable=False),
        sa.Column('subject_id', sa.Uuid(), nullable=False),
        sa.Column('teacher_id', sa.Uuid(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['workspace_id'], ['scheduling_workspaces.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['section_id'], ['groups.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['subject_id'], ['tasks.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['teacher_id'], ['resources.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('organization_id', 'section_id', 'subject_id', name='uq_section_subject_teacher_assignment_org_section_subject')
    )

    # --- Data Migration ---

    # 1. Seed Scheduling Workspaces
    connection.execute(sa.text("""
        INSERT INTO scheduling_workspaces (id, organization_id, name, domain_preset, created_at, updated_at)
        SELECT gen_random_uuid(), id, 'Default Workspace', 'academic', NOW(), NOW()
        FROM organizations
    """))

    # 2. Migrate Teachers to Resources
    connection.execute(sa.text("""
        INSERT INTO resources (id, organization_id, workspace_id, name, resource_type, metadata, availability, max_hours_per_week, created_at)
        SELECT t.id, t.organization_id, ws.id, t.name, 'teacher', t.metadata, '{}', NULL, t.created_at
        FROM temp_teachers t
        JOIN scheduling_workspaces ws ON ws.organization_id = t.organization_id
    """))

    # 3. Migrate Subjects to Tasks
    connection.execute(sa.text("""
        INSERT INTO tasks (id, organization_id, workspace_id, name, task_type, required_hours, requires_continuous_slots, metadata, created_at)
        SELECT s.id, s.organization_id, ws.id, s.name, 'subject', s.weekly_hours, FALSE, json_build_object('color', s.color, 'session_length', s.session_length)::jsonb, s.created_at
        FROM temp_subjects s
        JOIN scheduling_workspaces ws ON ws.organization_id = s.organization_id
    """))

    # 4. Migrate Sections to Groups
    connection.execute(sa.text("""
        INSERT INTO groups (id, organization_id, workspace_id, name, group_type, size, metadata, created_at)
        SELECT sec.id, sec.organization_id, ws.id, sec.name, 'section', sec.size, '{}', sec.created_at
        FROM temp_sections sec
        JOIN scheduling_workspaces ws ON ws.organization_id = sec.organization_id
    """))

    # 5. Migrate Rooms to Locations
    connection.execute(sa.text("""
        INSERT INTO locations (id, organization_id, workspace_id, name, location_type, capacity, metadata, created_at)
        SELECT r.id, r.organization_id, ws.id, r.name, r.room_type, r.capacity, '{}', r.created_at
        FROM temp_rooms r
        JOIN scheduling_workspaces ws ON ws.organization_id = r.organization_id
    """))

    # 6. Generate TimeSlots
    orgs = connection.execute(sa.text("""
        SELECT id, scheduling_mode, cycle_length, periods_per_day FROM organizations
    """)).all()

    FIXED_WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    for org in orgs:
        org_id = org.id
        mode = org.scheduling_mode or "fixed_weekday"
        cycle = org.cycle_length or 6
        periods = org.periods_per_day or 5

        ws_id = connection.execute(sa.text(f"""
            SELECT id FROM scheduling_workspaces WHERE organization_id = '{org_id}' LIMIT 1
        """)).scalar()

        if ws_id:
            if mode == "day_order":
                roman_numerals = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV"]
                def get_roman(num):
                    return roman_numerals[num] if num < len(roman_numerals) else str(num)
                for i in range(1, cycle + 1):
                    for p in range(1, periods + 1):
                        day_name = f"Day Order {get_roman(i)}"
                        connection.execute(sa.text(f"""
                            INSERT INTO timeslots (id, organization_id, workspace_id, name, day, start_time, end_time, slot_index, created_at)
                            VALUES (gen_random_uuid(), '{org_id}', '{ws_id}', 'Period {p}', '{day_name}', NULL, NULL, {p}, NOW())
                        """))
            else:
                fixed_days = FIXED_WEEKDAYS[:cycle]
                if cycle > len(FIXED_WEEKDAYS):
                    fixed_days.extend(f"Day {i}" for i in range(len(FIXED_WEEKDAYS) + 1, cycle + 1))
                for day in fixed_days:
                    for p in range(1, periods + 1):
                        connection.execute(sa.text(f"""
                            INSERT INTO timeslots (id, organization_id, workspace_id, name, day, start_time, end_time, slot_index, created_at)
                            VALUES (gen_random_uuid(), '{org_id}', '{ws_id}', 'Period {p}', '{day}', NULL, NULL, {p}, NOW())
                        """))

    # 7. Migrate TimetableVersions to ScheduleVersions
    connection.execute(sa.text("""
        INSERT INTO schedule_versions (id, organization_id, workspace_id, version_label, version_number, status, scores, explanation, parent_version_id, is_manual_override, metadata, created_by, created_at)
        SELECT tv.id, tv.organization_id, ws.id, 'v' || tv.version_number, tv.version_number, tv.status, tv.scores, NULL, NULL, FALSE, '{}', tv.created_by, tv.created_at
        FROM temp_timetable_versions tv
        JOIN scheduling_workspaces ws ON ws.organization_id = tv.organization_id
    """))

    # 8. Migrate TimetableSlots to Assignments
    connection.execute(sa.text("""
        INSERT INTO assignments (id, organization_id, workspace_id, schedule_version_id, task_id, group_id, timeslot_id, duration_slots, is_manual_override, metadata, created_at, day, period, teacher_id, room_id)
        SELECT ts.id, ts.organization_id, ws.id, ts.timetable_version_id, ts.subject_id, ts.section_id, NULL, ts.duration_periods, FALSE, '{}', NOW(), ts.day, ts.period, ts.teacher_id, ts.room_id
        FROM temp_timetable_slots ts
        JOIN scheduling_workspaces ws ON ws.organization_id = ts.organization_id
    """))

    # 9. Populate Join Tables
    connection.execute(sa.text("""
        INSERT INTO assignment_resources (assignment_id, resource_id)
        SELECT id, teacher_id FROM assignments
    """))

    connection.execute(sa.text("""
        INSERT INTO assignment_locations (assignment_id, location_id, student_count, sub_group)
        SELECT id, room_id, NULL, NULL FROM assignments
    """))

    # 10. Update timeslot_id in assignments
    connection.execute(sa.text("""
        UPDATE assignments a
        SET timeslot_id = t.id
        FROM timeslots t
        WHERE t.workspace_id = a.workspace_id
          AND t.day = a.day
          AND t.slot_index = a.period
    """))

    # 11. Migrate Constraints to ConstraintRules
    connection.execute(sa.text("""
        INSERT INTO constraint_rules (id, organization_id, workspace_id, name, rule_type, template_key, parameters, priority, penalty, enabled, created_at)
        SELECT c.id, c.organization_id, ws.id, c.constraint_type, 'hard', c.constraint_type, c.payload, 1, c.weight, TRUE, c.created_at
        FROM temp_constraints c
        JOIN scheduling_workspaces ws ON ws.organization_id = c.organization_id
    """))

    # 12. Migrate teacher_subject_assignments config
    connection.execute(sa.text("""
        INSERT INTO teacher_subject_assignments (id, organization_id, workspace_id, teacher_id, subject_id, created_at)
        SELECT tsa.id, tsa.organization_id, ws.id, tsa.teacher_id, tsa.subject_id, tsa.created_at
        FROM temp_tsa tsa
        JOIN scheduling_workspaces ws ON ws.organization_id = tsa.organization_id
    """))

    # 13. Migrate section_subject_teacher_assignments config
    connection.execute(sa.text("""
        INSERT INTO section_subject_teacher_assignments (id, organization_id, workspace_id, section_id, subject_id, teacher_id, created_at)
        SELECT ssta.id, ssta.organization_id, ws.id, ssta.section_id, ssta.subject_id, ssta.teacher_id, ssta.created_at
        FROM temp_ssta ssta
        JOIN scheduling_workspaces ws ON ws.organization_id = ssta.organization_id
    """))

    # Cleanup temp tables
    connection.execute(sa.text("DROP TABLE temp_tsa"))
    connection.execute(sa.text("DROP TABLE temp_ssta"))
    connection.execute(sa.text("DROP TABLE temp_timetable_slots"))
    connection.execute(sa.text("DROP TABLE temp_timetable_versions"))
    connection.execute(sa.text("DROP TABLE temp_constraints"))
    connection.execute(sa.text("DROP TABLE temp_rooms"))
    connection.execute(sa.text("DROP TABLE temp_sections"))
    connection.execute(sa.text("DROP TABLE temp_subjects"))
    connection.execute(sa.text("DROP TABLE temp_teachers"))


def downgrade() -> None:
    pass
