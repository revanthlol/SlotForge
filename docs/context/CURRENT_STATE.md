# Current State

Last updated: 2026-07-27

## Product

SlotForge is an open-source, multi-tenant academic scheduling platform. It models faculty, subjects, sections, rooms, time, and constraints; generates timetables with Google OR-Tools CP-SAT; explains scheduling pressure and conflicts; and manages draft, published, archived, branched, and rollback versions.

Academic Timetable is the only supported domain preset. Staff roster, event, exam, and facility cards are visible as coming soon and cannot mutate a workspace.

## Current application behavior

- The public landing leads with “Build timetables around reality,” responsive animated solver traces, a lightweight scroll-led solve narrative, a desktop launch chooser, and prominent MIT/GitHub/open-source messaging.
- The landing navbar no longer advertises separate sign-in and create-institution actions. Mobile navigation teases the coming mobile app and links to GitHub.
- Login and signup use the same floating public navbar as the landing page, with a contextual account action instead of a separate three-button auth switcher.
- Login and signup support Google and GitHub through Supabase Auth. A verified identity without an application profile keeps its session and completes idempotent institution setup instead of being signed out on `/auth/me` 404.
- Login, signup, onboarding, and the authenticated console use the mobile experience gate; public, policy, open-source, contact, and faculty share routes remain accessible.
- Canvas is light in light mode, dark in dark mode, and fills all available workspace space below the persistent top bar. Search, view tabs, labels, inspector, pan, zoom, minimap, and selection focus remain interactive.
- Public `/open-source`, `/privacy`, `/terms`, and `/contact` routes share the landing navbar and footer, animate into view, and restore the viewport to the top during route changes. The open-source page reproduces and links the complete MIT License.
- The repository is MIT licensed and includes contribution, conduct, security, issue-template, database, and current documentation.
- UML v2 remains the faculty-facing diagram set and reflects the generic data model plus the Vercel / Oracle / Supabase deployment.

## Architecture and deployment

- Frontend: React 19, TypeScript, Vite, Tailwind CSS, TanStack Query, Motion, React Flow.
- Backend: FastAPI, Pydantic, SQLAlchemy, Alembic.
- Solver: Google OR-Tools CP-SAT.
- Identity/data: Supabase Auth and PostgreSQL.
- Backend tests start a disposable loopback PostgreSQL container and fail closed if isolation is unavailable; they cannot fall back to the configured Supabase database.
- Production: Vercel frontend; `slotforge-api.service` on the Oracle VPS.
- Shritha's main Oracle environment is running release `9a8927d` against its dedicated Supabase project; service and database health checks pass and `/auth/complete-account` is loaded.
- Alembic head: `c7d4e5f6a7b8`.
- Public schema: 20 application tables plus `alembic_version`, structure only.

## Known limitations and risks

- The four non-academic presets are roadmap previews, not usable workflows.
- The Canvas is an exploratory relationship map, not a graph editor.
- Tenant access is currently enforced by FastAPI membership/admin checks. Do not claim complete database RLS coverage.
- Assignment replacement remains a full-list operation; concurrent edits are last-completed-write wins.
- The frontend production bundle emits a large-chunk warning; route-level splitting remains future work.
- The Vercel project still treats `dev` as its Production branch and compiles that deployment against the other Supabase project. Before Shritha's social login can work end to end, set the Vercel Production branch to `main`, set the production `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to Shritha's project, and redeploy. Never expose the Supabase secret key or database URLs to Vite.
- Project-stage privacy and terms pages require professional review before commercial launch.

## Verification and release

Fresh verification and deployment results for this change are recorded at the top of `CHANGELOG.md`. Preserve the unrelated local change in `backend/app/schemas/assignment_generic.py` when staging this release.
