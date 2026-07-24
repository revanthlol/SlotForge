# Current State

Last updated: 2026-07-24

## Verification snapshot

- Local `dev` HEAD: `ebd8f15` (resource-page impact drawer fix).
- Oracle VPS backend checkout: `38af1b0` (latest backend-affecting commit); the later local commits are frontend/context-only.
- VPS service: `slotforge-api.service` active.
- VPS `/health`: `200`, status `ok`.
- VPS `/health/db`: `200`, status `ok`, Alembic revision `fc1b2d3e4f50`.
- Known preserved VPS untracked helpers: `deploy.sh`, `diagnose.sh`.

## Product

SlotForge is a multi-tenant institutional timetable and schedule optimization platform. The academic preset is the primary active experience. It manages teachers, rooms, subjects, sections, teacher/subject qualifications, section teaching maps, solver constraints, generated timetable versions, exports, faculty sharing, heatmaps, and a relationship Canvas.

## Active implementation state

- Backend: FastAPI + SQLAlchemy + Alembic + PostgreSQL/Supabase auth.
- Solver: Google OR-Tools CP-SAT under `backend/app/solver/`.
- Frontend: React 19 + TypeScript + Vite + Tailwind CSS v4.
- Frontend API auth: Supabase JWT is attached by `frontend/src/lib/api.ts`.
- Mutating API routes require the organization-admin role.
- Generated timetables are draft versions until promoted/published.

## Recently fixed

- Teacher/subject assignment Save writes are ordered on the subject-side dialog so full-list replacement requests cannot race and overwrite each other.
- Teacher and subject assignment dialogs now show API failures instead of silently logging them.
- Assignment dialogs cannot be dismissed while a save is in progress.
- Solver Engine now exposes an Add rule flow backed by `POST /constraints/`.
- Canvas lanes were rebalanced to prevent the outer columns from clipping and to reduce edge collisions.

## Known limitations and risks

- Assignment replacement is still a full-list `PUT` operation. If multiple users edit the same teacher at the same time, the last completed write wins.
- Assignment-derived constraint inserts now populate `workspace_id`, `name`, and `rule_type` through the compatibility path; verify this flow on the deployed API after backend restarts.
- `/health/db` now validates the deployed generic schema (`resources`, `tasks`, `groups`, `locations`, `constraint_rules`, and related tables) instead of removed legacy table columns.
- The production demo account `demo@slotforge.local` is linked to the Loyola Academy organization as `org_admin`; authenticated `/auth/me` was verified after repair.
- Resource pages only keep the impact drawer visible for loading, errors, or real conflicts; successful no-conflict analysis no longer leaves a fixed panel over the page.
- Constraint payloads are intentionally flexible JSON. A new constraint UI should provide the exact payload fields required by the solver before presenting the rule as fully guided.
- The Canvas is a generated relationship view, not a drag-and-drop editor.
- The frontend build emits a large-chunk warning; this is not currently a build failure.
- Oxlint currently reports existing Fast Refresh warnings in context files.

## Current priority order

1. Verify assignment and constraint flows against the deployed API with an admin account.
2. Add focused integration coverage for teacher/subject replacement and constraint creation.
3. Continue Canvas usability polish after testing with a real timetable containing many sections and assignments.
4. Consider an atomic bulk assignment endpoint if collaborative editing becomes a requirement.
