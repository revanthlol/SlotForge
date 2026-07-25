# Current State

Last updated: 2026-07-25

## Verification snapshot

- Local `dev` HEAD: `796cdaf` (feat: implement phase 11 canvas map).
- Oracle VPS repository checkout: `796cdaf`.
- VPS service: `slotforge-api.service` active.
- VPS `/health`: `200`, status `ok`.
- VPS `/health/db`: `200`, status `ok`, Alembic revision `8a1c2d3e4f50`.
- Known preserved VPS untracked helpers: `deploy.sh`, `diagnose.sh`.
- Latest deployment verification: service restarted after `796cdaf`; `/health`, `/health/db`, Supabase login, and authenticated `/auth/me` returned successfully. All four Canvas API views returned HTTP 200 with live nodes/edges; no new error-level service logs remained.
- Auth repair: demo seeding now preserves the real Supabase Auth user ID when optional admin password synchronization fails, preventing `/auth/me` 404s caused by synthetic fallback profiles.

## Product

SlotForge is a multi-tenant institutional timetable and schedule optimization platform. The academic preset is the primary active experience. It manages teachers, rooms, subjects, sections, teacher/subject qualifications, section teaching maps, solver constraints, generated timetable versions, exports, faculty sharing, heatmaps, a relationship Canvas, and the Constraint Playground rule templates.

## Active implementation state

- Backend: FastAPI + SQLAlchemy + Alembic + PostgreSQL/Supabase auth.
- Solver: Google OR-Tools CP-SAT under `backend/app/solver/`.
- Constraint Playground: Template registry (12 templates), solver function mappings, `ConstraintCompiler`, workspace constraint CRUD endpoints, and rule impact preview API implemented.
- Constraint Playground UI: `/constraints` route with active-rule enable/disable, template gallery, parameter modal, impact preview, edit, and delete flows.
- Frontend: React 19 + TypeScript + Vite + Tailwind CSS v4.
- Frontend API auth: Supabase JWT is attached by `frontend/src/lib/api.ts`.
- Mutating API routes require the organization-admin role.
- Generated timetables are draft versions until promoted/published.
- Phase 9 Version Control is implemented: version metadata/migration, branch/rollback copy service, compare diff engine, publish/archive lifecycle, workspace schedule-run endpoints, and `/versions` history UI.
- Phase 11 Canvas Map is implemented: the workspace `/canvas` endpoint exposes resource, constraint, conflict, and version graphs; the frontend renders them with React Flow, search, focus mode, minimap, pan/zoom controls, and a node inspector.

## Recently fixed / added

- Phase 8 Constraint Playground backend completed: 12 pre-built rule templates added to registry, compiler maps rules to solver CP-SAT constraints, and endpoints added (`GET /api/v1/constraint-templates/`, `GET/POST/PATCH/DELETE /api/v1/workspaces/{id}/constraints`, `POST /api/v1/workspaces/{id}/constraints/preview`).
- Phase 9 Version Control completed: branch creates a child draft with copied assignments, compare reports moved/changed assignments and affected resources, publish archives the prior published version, archive preserves history, and rollback creates a non-published draft.
- Phase 9 verification: focused backend tests `5 passed`; frontend build and lint passed; Oracle migration reached `8a1c2d3e4f50`; authenticated production lifecycle smoke tests passed.
- Phase 11 verification: backend unit suite `25 passed`; frontend build and lint passed; authenticated production Canvas smoke test returned resource `17 nodes/26 edges`, constraint `42/60`, conflict `17/26`, and version `1/0`.
- Teacher/subject assignment Save writes are ordered on the subject-side dialog so full-list replacement requests cannot race and overwrite each other.
- Teacher and subject assignment dialogs now show API failures instead of silently logging them.
- Assignment dialogs cannot be dismissed while a save is in progress.
- Canvas lanes rebalanced to prevent outer column clipping and edge collisions.

## Known limitations and risks

- Assignment replacement is still a full-list `PUT` operation. If multiple users edit the same teacher at the same time, the last completed write wins.
- Assignment-derived constraint inserts now populate `workspace_id`, `name`, and `rule_type` through the compatibility path; verify this flow on the deployed API after backend restarts.
- `/health/db` now validates the deployed generic schema (`resources`, `tasks`, `groups`, `locations`, `constraint_rules`, and related tables) instead of removed legacy table columns.
- The production demo account `demo@slotforge.local` is linked to the Loyola Academy organization as `org_admin`; authenticated `/auth/me` was verified after repair.
- Resource pages only keep the impact drawer visible for loading, errors, or real conflicts; successful no-conflict analysis no longer leaves a fixed panel over the page.
- Constraint payloads are intentionally flexible JSON. A new constraint UI should provide the exact payload fields required by the solver before presenting the rule as fully guided.
- All generic preset adapters now compile active playground rules through `ConstraintCompiler`; hard rules no longer inherit a soft penalty as their solver weight.
- The Canvas is a generated relationship view, not a drag-and-drop editor.
- The frontend build emits a large-chunk warning; this is not currently a build failure.
- Oxlint currently reports existing Fast Refresh warnings in context files.
- Pyrefly may report `ortools.sat.python` as missing when VS Code is using the system Python (`/usr/lib/python3.14`) instead of `backend/.venv`; the backend virtual environment contains the runtime dependency.
- Browser-level Playwright verification is currently unavailable in this environment because the Python Playwright package is not installed; production API and frontend build verification are complete.

## Current priority order

1. Verify assignment and constraint flows against the deployed API with an admin account.
2. Add focused integration coverage for teacher/subject replacement and constraint creation.
3. Continue Canvas usability polish after testing with a real timetable containing many sections and assignments.
4. Consider an atomic bulk assignment endpoint if collaborative editing becomes a requirement.
