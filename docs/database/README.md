# SlotForge database schema

[`schema.sql`](schema.sql) is a schema-only PostgreSQL 17 snapshot generated from a clean database after applying Alembic revision `c7d4e5f6a7b8`.

## What it contains

The application currently defines 20 tables, plus Alembic’s revision table:

- identity and tenancy: `profiles`, `organizations`, `organization_memberships`;
- workspace inputs: `scheduling_workspaces`, `resources`, `tasks`, `groups`, `locations`, `timeslots`, `constraint_rules`;
- solving and versioning: `schedule_runs`, `schedule_versions`, `assignments`, `assignment_resources`, `assignment_locations`;
- academic mappings: `teacher_subject_assignments`, `section_subject_teacher_assignments`;
- product workflow: `onboarding_progress`, `faculty_share_links`, `audit_logs`.

Academic UI terms map onto the generic scheduling model: teachers are `resources`, subjects are `tasks`, sections are `groups`, and rooms/labs are `locations`.

## What it excludes

- all table records and production data;
- passwords, keys, tokens, database URLs, and hostnames;
- ownership and privilege statements;
- Supabase-managed schemas such as `auth`, including `auth.users`.

The application connects `profiles.id` to the Supabase Auth user UUID in its identity flow; that external managed relationship is documented rather than reproduced in this standalone public schema.

## Tenancy and RLS

Most scheduling rows include `organization_id` and `workspace_id`. The active authorization boundary is FastAPI membership/admin validation. Do not infer complete RLS policy coverage from this export. If these tables are exposed through the Supabase Data API, configure grants and tested RLS policies before access.

## Regenerate safely

1. Start an empty disposable PostgreSQL database.
2. Point a temporary `DATABASE_URL` at it and run `backend/.venv/bin/alembic upgrade head`.
3. Run `pg_dump --schema-only --schema=public --no-owner --no-privileges --restrict-key=SlotForgeSchemaExport`.
4. Search the result for `COPY`, `INSERT INTO`, connection strings, Supabase hosts, private keys, and real account details.
5. Restore it into a second empty disposable database and confirm the expected 20 application tables plus the empty `alembic_version` table. Schema-only dumps intentionally do not include the revision row.

See [the testing guide](../TESTING.md) for the exact command shape.
