# Current State

Last updated: 2026-07-26

## Verification snapshot

- Workspace revamp release commit: `9bdf2f2` (`revamp workspace graph and account flows`), pushed to `dev`.
- Oracle backend release: `9bdf2f2`; only the known untracked `deploy.sh` and `diagnose.sh` helpers remain.
- VPS service: `slotforge-api.service` active.
- VPS `/health`: `200`, status `ok`.
- VPS `/health/db`: `200`, status `ok`, Alembic revision `c7d4e5f6a7b8`.
- Known preserved VPS untracked helpers: `deploy.sh`, `diagnose.sh`.
- Latest deployment verification: service restarted after `cf1b9d2`; `/health`, `/health/db`, Supabase login, and authenticated `/auth/me` returned successfully. After a simulated missing-demo-graph state, the first authenticated request restored the idempotent demo graph using the real Supabase Auth UUID; a second API restart still returned 200 for auth, workspace access, and Canvas. No new error-level service logs remained.
- Auth repair: demo seeding now preserves the real Supabase Auth user ID when optional admin password synchronization fails, preventing `/auth/me` 404s caused by synthetic fallback profiles.
- Frontend deployment: Vercel reported `success` for `53eb412` with deployment completed.
- Latest API deployment: `9bdf2f2`; Oracle API restart completed with `/health` and `/health/db` at HTTP 200, authenticated `/auth/me` returned 200 with `job_title`, and recent error-level service logs were empty.
- Frontend deployment: Vercel reported `success` for `9bdf2f2`; `https://slotforge-dev.vercel.app/` returned HTTP 200.
- Frontend Git deployments: `dev` is connected to Vercel. The dev URL last returned HTTP 200 after `bf5ffb2`; subsequent frontend-only commits are pushed to `dev` and require no Oracle restart.

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
- Demo Auth recovery is hardened: the known demo account now self-heals the complete application graph, not just its profile, when Supabase Auth survives an interrupted seed/deploy.
- Protected application routes now show a dedicated mobile-unavailable screen below desktop workspace dimensions; desktop-site mode in landscape remains the explicit phone fallback, and the Android app is marked coming soon.
- Authenticated routing now treats `/` as the dashboard, keeps `/landing` available as the public product page, and redirects the legacy `/dashboard` path to `/`.
- Onboarding persists the complete 12-step flow, including assignments, and route guards wait for the active workspace's server-backed progress before redirecting. Completed/skipped users no longer re-enter onboarding during login or reload races.
- Profiles now store an editable professional `job_title` separately from the authorization `role`; signup captures it, `/auth/me` exposes and updates it, and workspace access cannot be changed through profile editing.
- The Canvas now uses an Obsidian-style constellation layout with compact typed nodes, relationship focus/fading, labeled edges, neighbor traversal, search, and a relationship inspector.
- Constraints and solver rules are grouped into readable families instead of repeated rows; version snapshots resolve assignment names instead of exposing UUID fragments; settings save controls remain inside the viewport at browser zoom.

- Light mode is set as the default theme across the application.
- Site colors enhanced with vibrant emerald primary (`#0d7a5b`), warm orange secondary (`#d95714`), and clean surface tints.
- Onboarding setup is mandatory for new user accounts: `ProtectedRoute` and `PublicAuthRoute` automatically redirect new users to `/onboarding` upon account creation or sign-in until completed or skipped.
- Onboarding UX streamlined into a clean responsive wizard with a 5-step progress navigation bar.
- Public landing and shell polish: the landing follows the Stitch-derived editorial/operational composition with auth-aware entry points, a floating navigation, smooth anchor scrolling, workflow/capability sections, FAQ, and a weekly-draft timetable preview. The former abstract scheduling-node diagram has been removed.
- Protected shell behavior: the sidebar and topbar remain mounted between app routes; the topbar is viewport-pinned and only the routed page content transitions. Do not reintroduce a global `AnimatePresence` wrapper around `AppRouter` routes.
- Protected-route loading uses a dedicated Newton's-cradle screen; onboarding renders outside the application sidebar/topbar and includes assignment setup.

## Recently fixed / added

- Workspace experience revamp verification: authenticated browser coverage passed landing/auth transitions, `/` dashboard routing, persistent onboarding, a selectable 17-node Canvas, grouped constraints, solver rules, human-readable version history, editable profile role, and the settings action panel at 125% emulation with no clipping.
- Backend profile/onboarding changes are covered by integration tests; the complete backend suite passes `54 passed`. Frontend production build passes and Oxlint reports only the three existing Fast Refresh warnings.

- Phase 8 Constraint Playground backend completed: 12 pre-built rule templates added to registry, compiler maps rules to solver CP-SAT constraints, and endpoints added (`GET /api/v1/constraint-templates/`, `GET/POST/PATCH/DELETE /api/v1/workspaces/{id}/constraints`, `POST /api/v1/workspaces/{id}/constraints/preview`).
- Phase 9 Version Control completed: branch creates a child draft with copied assignments, compare reports moved/changed assignments and affected resources, publish archives the prior published version, archive preserves history, and rollback creates a non-published draft.
- Phase 9 verification: focused backend tests `5 passed`; frontend build and lint passed; Oracle migration reached `8a1c2d3e4f50`; authenticated production lifecycle smoke tests passed.
- Phase 11 verification: backend unit suite `26 passed`; frontend build and lint passed; authenticated production Canvas smoke test returned resource `17 nodes/26 edges`, constraint `42/60`, conflict `17/26`, and version `1/0`.
- Heatmap overflow fix: the impact drawer now unmounts while closed and portals to `document.body` while open, preventing transformed route containers from leaking the drawer along the right edge.
- Latest verification: complete backend suite `52 passed`; frontend production build passed; Oxlint completed with only the three existing Fast Refresh warnings.
- Teacher/subject assignment Save writes are ordered on the subject-side dialog so full-list replacement requests cannot race and overwrite each other.
- Teacher and subject assignment dialogs now show API failures instead of silently logging them.
- Assignment dialogs cannot be dismissed while a save is in progress.
- Canvas lanes rebalanced to prevent outer column clipping and edge collisions.
- Landing accessibility and responsiveness: workflow step labels use `text-on-surface-variant` for AA contrast, and FAQ state is localized to `LandingFaq` so opening an answer does not re-render the full landing page.
- Landing brand/navigation baseline: public nav uses the Fraunces wordmark, mono uppercase utility links, larger actions, and respects reduced-motion scrolling. Sidebar brand mark has no hover transform or shadow.

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
- The frontend build still emits a large-chunk warning. The current landing work did not introduce a build failure; route-level code splitting remains a future optimization.

## Current priority order

1. Verify assignment and constraint flows against the deployed API with an admin account.
2. Add focused integration coverage for teacher/subject replacement and constraint creation.
3. Continue Canvas usability polish after testing with a real timetable containing many sections and assignments.
4. Consider an atomic bulk assignment endpoint if collaborative editing becomes a requirement.
