# Architecture Map

## Request flow

```text
React page
  -> frontend/src/hooks/useApi.ts or frontend/src/lib/api/hooks/
  -> frontend/src/lib/api.ts (Axios + Supabase access token)
  -> backend/app/main.py router
  -> route dependency (current user / org admin)
  -> SQLAlchemy model + service
  -> PostgreSQL/Supabase
```

## Backend ownership

- `backend/app/main.py` — FastAPI app, middleware, route registration, health checks.
- `backend/app/api/routes/` — HTTP endpoints for resources, assignments, constraints, timetables, exports, workspaces, and sharing.
- `backend/app/models/` — SQLAlchemy persistence models.
- `backend/app/schemas/` — request and response validation.
- `backend/app/services/` — cross-model behavior such as assignment-to-constraint synchronization, timetable generation, versioning, exports, and heatmap analysis.
- `backend/app/solver/` — solver models, constraint compilation, scoring, diagnostics, and fixtures.
- `backend/migrations/` — Alembic schema history.

## Important assignment flow

1. `TeachersPage.tsx` opens a teacher’s subject list and sends `PUT /assignments/teacher-subjects/{teacher_id}`.
2. `SubjectsPage.tsx` edits the inverse view. It determines affected teachers and sends the same full-list replacement endpoint in sequence.
3. `backend/app/api/routes/assignments.py` validates tenant ownership, replaces rows, regenerates assignment-derived hard constraints, commits, and returns the teacher’s rows.
4. `AssignmentSyncService` in `backend/app/services/assignment_sync_service.py` rebuilds `teacher_subject`, `section_subject`, and `section_subject_teacher` constraints marked with `payload.source = "assignment"`.

## Important frontend locations

- `frontend/src/features/timetable/pages/TeachersPage.tsx` — teachers and teacher-subject assignment dialog.
- `frontend/src/features/timetable/pages/SubjectsPage.tsx` — subjects and subject-teacher assignment dialog.
- `frontend/src/features/timetable/pages/SectionsPage.tsx` — section curriculum and teacher map.
- `frontend/src/features/timetable/pages/SolverEnginePage.tsx` — constraint display/editing and schedule generation.
- `frontend/src/features/canvas/pages/CanvasViewPage.tsx` — full-bleed, theme-aware generated relationship graph.
- `frontend/src/features/auth/pages/LandingPage.tsx` — public product landing, solver-trace hero, launch chooser, and open-source messaging.
- `frontend/src/features/public/PublicPages.tsx` — open-source, privacy, terms, and audience-specific contact routes.
- `frontend/src/components/layout/MobileRouteGate.tsx` — shared narrow-portrait gate for auth, onboarding, and the protected console.
- `frontend/src/hooks/useApi.ts` — typed resource hooks and API response types.
- `frontend/src/components/ui/Modal.tsx` — shared modal and Enter-to-submit behavior.

## Data naming warning

The current codebase contains both the newer workspace/resource/task model and legacy teacher/room/subject/section terminology. Check the route and model being used before changing schemas or adding foreign keys. Do not assume a frontend label maps directly to a table name.

The public application schema is generated from Alembic into `docs/database/schema.sql`. It contains 20 application tables plus `alembic_version`; Supabase-managed auth tables and all data are excluded.

## Public route boundary

`/`, `/landing`, `/open-source`, `/privacy`, `/terms`, `/contact`, and `/share/faculty/:token` remain public. `/login`, `/signup`, `/onboarding`, and authenticated console routes are blocked by the mobile experience gate on narrow portrait/coarse-pointer devices. The landing page does not mount the animated solver trace on mobile.
