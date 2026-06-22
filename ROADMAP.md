# SlotForge — Engineering Roadmap (v2)


## Global Decisions (apply to all phases)

| Decision | Value | Rationale |
|---|---|---|
| Backend language | Python 3.12 | OR-Tools, FastAPI, async support |
| Solver | Google OR-Tools CP-SAT | Industry standard for CSP/scheduling; provides feasibility proofs |
| API framework | FastAPI | Async, auto OpenAPI docs, Pydantic validation |
| Database | PostgreSQL via Supabase | Managed Postgres + Auth + Storage in one provider |
| ORM | SQLAlchemy 2.0 + Alembic | Explicit migrations, typed models |
| Auth | Supabase Auth (JWT) | Avoids building auth from scratch |
| Frontend framework | React 18 + TypeScript + Vite | Locked in prior architecture docs |
| **Frontend UI library** | **Ant Design (antd) v5** | Mature, large component catalog (data tables, forms, calendars — all needed for a scheduling admin UI), stable, widely adopted, strong TypeScript support. Superseded Joy UI (too immature) and MUI (rejected — dated default aesthetic) |
| Mobile framework | Flutter (built later, Phase 9+) | Native Material widgets — Flutter has no Ant Design equivalent; cross-platform consistency is achieved via **shared design tokens**, not shared components |
| **Job queue** | **None for now — synchronous solving.** Redis/RQ explicitly deferred to a future "Production Scaling" phase (see bottom of document) | Premature for current dev stage; revisit once concurrent load or solve-time actually requires it |
| Hosting (future) | Oracle Cloud VPS (backend), Vercel (frontend) | Already decided, unchanged |

### Design Token Strategy (applies to Phase 6 onward)
A single `design-tokens.json` file is the source of truth for color, spacing, radius, and typography. React/Ant Design consumes it via `ConfigProvider`. Flutter (future) consumes the same file via a small codegen step that emits Dart `ThemeData` constants. This is how "consistent design across web and mobile" is achieved — NOT by replicating Ant Design components in Flutter, which is explicitly out of scope and should never be attempted.

---

## Phase 0 — Repository & Environment Setup
**Status: ✅ COMPLETE** (per user confirmation — backend skeleton, venv, FastAPI health endpoint, git repo all working). Redis/docker-compose step is **intentionally skipped** — see "Deferred: Production Scaling" at the end of this document.

### Objective
Establish a working backend skeleton with a verifiable health check.

### Deliverables
- [x] `backend/` Python package structure
- [x] `backend/.venv` virtual environment
- [x] `backend/requirements.txt`
- [x] `backend/app/main.py` with `GET /health` returning `{"status": "ok"}`
- [x] `.gitignore`, `.env.example`
- [x] Git repository initialized, pushed to remote

### Completion Criteria
- `curl http://localhost:8000/health` returns `200 {"status": "ok"}` — **VERIFIED DONE**

---

## Phase 1 — Solver Core (Standalone, No API Dependency)
**Status: ✅ COMPLETE**

### Objective
Implement the CP-SAT scheduling engine as a pure Python module with zero dependency on FastAPI, Supabase, or any network layer. Must be fully testable via CLI and pytest in isolation.

### Technology
- `ortools` (CP-SAT solver, already in `requirements.txt`)
- Pure Python dataclasses or Pydantic models for the problem domain (no DB/ORM dependency at this layer)

### Required File Structure
```
backend/
  app/
    solver/
      __init__.py
      models.py          # domain dataclasses: Teacher, Room, Subject, Section, TimeSlot, Constraint
      engine.py          # build_model(), solve() — the actual CP-SAT logic
      scoring.py         # compute_soft_constraint_scores(solution) -> dict
      exceptions.py       # SolverInfeasibleError and any custom exceptions
    solver/fixtures/
      sample_small.json       # already exists — small feasible instance
      sample_infeasible.json  # NEW — deliberately unsolvable instance, for testing error path
      sample_tight.json       # NEW — feasible but constrained, to exercise soft-constraint tradeoffs
  scripts/
    run_solver_cli.py    # CLI entrypoint: python scripts/run_solver_cli.py <fixture_path>
  tests/
    unit/
      test_solver_engine.py
      test_solver_scoring.py
```

### Implementation Requirements

**1. Domain models (`backend/app/solver/models.py`)**
Define dataclasses (or Pydantic `BaseModel`) for:
- `Teacher(id: str, name: str)`
- `Room(id: str, name: str, capacity: int, room_type: str)`
- `Subject(id: str, name: str, weekly_hours: int)`
- `Section(id: str, name: str, size: int)`
- `TimeSlot(id: str, day: str, period: int)`
- `Constraint(id: str, constraint_type: str, payload: dict, weight: int | None)` — `weight=None` means hard constraint
- `ProblemInstance(teachers, rooms, subjects, sections, slots, constraints)` — top-level container
- `ScheduledSlot(section_id, subject_id, teacher_id, room_id, slot_id)` — one assignment
- `SolverResult(status: Literal["OPTIMAL","FEASIBLE","INFEASIBLE"], assignments: list[ScheduledSlot], scores: dict, infeasible_reason: str | None)`

**2. Engine (`backend/app/solver/engine.py`)**
Implement `solve(instance: ProblemInstance) -> SolverResult` that:
- Creates one boolean decision variable per `(section, subject, teacher, room, slot)` combination that is structurally valid (room type compatible with subject, teacher able to teach subject if such a mapping exists in constraints)
- **Hard constraints (must always hold):**
  - A teacher occupies at most one slot at any given time
  - A room hosts at most one section at any given time
  - A section attends at most one subject at any given time
  - Each section receives exactly `subject.weekly_hours` slots for each of its required subjects across the week
  - Room `capacity >= section.size`
- **Soft constraints (weighted objective terms, minimize total penalty):**
  - Teacher gap minimization: penalize non-contiguous teacher schedules per day
  - Daily load balancing: penalize days where a section's load deviates significantly from the weekly average
  - Preference satisfaction: constraints with `constraint_type == "teacher_preferred_slot"` reward matching assignments
- On `INFEASIBLE`, use CP-SAT's `AssumptionsAndCores` or manually relax constraint groups one at a time (hard constraints only, in priority order: room capacity → teacher availability → weekly hours) to identify and report which constraint group is the likely cause in `infeasible_reason`.
- Solver time limit: 30 seconds (`solver.parameters.max_time_in_seconds = 30`) — return best found `FEASIBLE` result if optimal isn't reached in time, never hang indefinitely.

**3. Scoring (`backend/app/solver/scoring.py`)**
Implement `compute_soft_constraint_scores(instance: ProblemInstance, assignments: list[ScheduledSlot]) -> dict` returning:
```python
{
    "preference_score": int,    # 0-100
    "utilization_score": int,   # 0-100, based on room/teacher idle time
    "gap_score": int,           # 0-100, lower gaps = higher score
    "overall_score": int        # weighted average of the above
}
```

**4. Constraint loading**
Constraints MUST be loaded from the `constraints` list in `ProblemInstance` — never hardcode constraint values (e.g. no `MAX_CLASSES_PER_DAY = 6` constant in code). If a default is needed when no constraint row exists for a given type, define defaults in a single `backend/app/solver/defaults.py` module, clearly separated from the engine logic, so an agent or developer can find and override them in one place.

**5. CLI runner (`backend/scripts/run_solver_cli.py`)**
```python
# Usage: python scripts/run_solver_cli.py backend/app/solver/fixtures/sample_small.json
# Loads JSON, builds ProblemInstance, calls solve(), prints SolverResult as formatted JSON to stdout.
```

### Completion Criteria (all must pass before Phase 2 starts)
- [x] `python backend/scripts/run_solver_cli.py backend/app/solver/fixtures/sample_small.json` exits 0, prints a `SolverResult` with `status` in `{"OPTIMAL", "FEASIBLE"}` and zero hard-constraint violations
- [x] Same command against `sample_infeasible.json` returns `status: "INFEASIBLE"` with a non-null, specific `infeasible_reason` string
- [x] `pytest backend/tests/unit/test_solver_engine.py` — all tests pass, covering: feasible case, infeasible case, capacity violation rejected, double-booking rejected
- [x] `pytest backend/tests/unit/test_solver_scoring.py` — scoring function returns values in range `[0, 100]` for all four score keys on the tight fixture
- [x] No import of `fastapi`, `sqlalchemy`, or `supabase` anywhere under `backend/app/solver/`

---

## Phase 2 — Synchronous API Layer
**Status: ✅ COMPLETE**

### Objective
Expose the Phase 1 solver over HTTP. Persistence is in-memory or SQLite at this stage — real Postgres comes in Phase 4. No job queue — `generate` blocks until the solver returns (acceptable since Redis is deferred; document this tradeoff inline in code comments).

### Required File Structure
```
backend/
  app/
    api/
      routes/
        organizations.py
        teachers.py
        rooms.py
        subjects.py
        sections.py
        constraints.py
        timetables.py
    schemas/
      organization.py     # Pydantic request/response models
      teacher.py
      room.py
      subject.py
      section.py
      constraint.py
      timetable.py
    services/
      timetable_service.py   # bridges API schemas <-> solver ProblemInstance/SolverResult
    core/
      db_memory.py         # temporary in-memory store (dict-based), replaced in Phase 4
  tests/
    integration/
      test_api_timetables.py
```

### Implementation Requirements
1. Each route file exposes standard REST CRUD: `POST`, `GET` (list + single), `PUT`/`PATCH`, `DELETE`.
2. `POST /timetables/generate` accepts an org's full current state (teachers/rooms/subjects/sections/constraints, fetched from `db_memory`), converts to `ProblemInstance` via `timetable_service.py`, calls `solver.engine.solve()` synchronously, stores and returns the `SolverResult`.
3. `GET /timetables/{id}` returns a previously generated result by ID.
4. All routes registered in `app/main.py` via `app.include_router(...)`.
5. Every response model and request model must be an explicit Pydantic class — no raw `dict` responses.
6. OpenAPI docs must be browsable at `/docs` with all routes visible and example payloads filled in (use Pydantic `Field(example=...)` where helpful).

### Completion Criteria
- [x] Full CRUD verified via automated test or documented `curl` sequence for at least one resource (e.g. teachers): create → list → get → update → delete
- [x] `POST /timetables/generate` with a small valid payload returns a `200` with a populated `SolverResult` body within the 30s solver timeout
- [x] `pytest backend/tests/integration/test_api_timetables.py` passes
- [x] `/docs` loads in browser and lists all 6 resource route groups

---

## Phase 3 — Supabase Integration (Database, Auth, Multi-Tenancy)
**Status: ✅ COMPLETE**

### Objective
Replace the in-memory store with real Supabase Postgres persistence. Introduce `organization_id` scoping on every table. Wire Supabase Auth JWT verification into FastAPI.

### Reference
Full SQL schema, RLS policy patterns, and JWT verification code are specified in `SUPABASE_SETUP.md` (Parts A–E). This phase's job is to **execute** that document, not redesign it.

### Required File Structure
```
backend/
  app/
    models/
      organization.py     # SQLAlchemy ORM models, one file per entity
      profile.py
      teacher.py
      room.py
      subject.py
      section.py
      constraint.py
      timetable_version.py
      timetable_slot.py
      audit_log.py
    core/
      db.py               # SQLAlchemy engine/session setup, replaces db_memory.py
      auth.py             # get_current_user() dependency, JWT verification
      config.py           # Pydantic Settings loading from .env (SUPABASE_URL, etc.)
  migrations/
    versions/             # Alembic-generated migration files
  alembic.ini
```

### Implementation Requirements
1. All SQLAlchemy models defined per the schema in `SUPABASE_SETUP.md` Part B.1, including `organization_id` foreign key on every tenant-scoped table.
2. Alembic configured (`alembic init migrations` already accounted for in folder structure) and an initial migration generated and applied against the real Supabase Postgres instance.
3. RLS policies from `SUPABASE_SETUP.md` Part C applied directly via Supabase SQL Editor (RLS policies are not something Alembic manages well — apply manually or via a raw SQL migration file checked into `migrations/manual_rls.sql`).
4. `app/core/auth.py` implements JWT verification exactly as specified in `SUPABASE_SETUP.md` Part D.1, returning the authenticated user's `organization_id` and `role` for use as a FastAPI dependency in all Phase 2 routes.
5. Every Phase 2 route updated to require `Depends(get_current_user)` and filter all queries by the authenticated `organization_id` — no endpoint may return cross-tenant data.
6. Signup flow: a new endpoint `POST /auth/signup-organization` that creates a Supabase Auth user, an `organizations` row, and a `profiles` row (role=`org_admin`) atomically (wrap in a try/except that rolls back the org row if profile creation fails).

### Completion Criteria
- [x] Two test organizations created via the signup endpoint
- [x] Org A's JWT cannot read Org B's teachers — verified with an explicit test (`test_multi_tenancy_isolation.py`), not assumed
- [x] All Phase 2 CRUD endpoints now persist to and read from real Postgres (verified by restarting the API process and confirming data survives)
- [x] `alembic upgrade head` runs cleanly against a fresh Supabase database

---

## Phase 4 — Versioning, Draft/Publish, Audit Log
**Status: NOT STARTED**

### Objective
Make timetable generations immutable and comparable; introduce a draft → published state machine; log mutating actions.

### Required File Structure
```
backend/
  app/
    api/routes/
      timetables.py        # extended: list versions, publish, rollback
    services/
      versioning_service.py
      audit_service.py
    models/
      timetable_version.py # already created in Phase 3, extended with status transitions
```

### Implementation Requirements
1. `POST /timetables/generate` now creates a new `timetable_versions` row with `status="draft"` and an incrementing `version_number` scoped per organization (never reuse or overwrite a version number).
2. `GET /timetables/versions` lists all versions for the caller's org with their `scores` and `status`.
3. `POST /timetables/{version_id}/publish` sets the target version's `status="published"` and demotes any previously published version for that org to `"archived"` in the same transaction (only one `published` version per org at a time).
4. `POST /timetables/{version_id}/rollback` is equivalent to re-publishing a previously archived version (must not delete or mutate the version being rolled back to — append-only history).
5. `audit_service.py` exposes `log_action(org_id, actor_id, action, target_table, target_id, diff)`, called from every mutating endpoint added since Phase 2 (teachers, rooms, subjects, sections, constraints, timetable publish/rollback).
6. Implement as FastAPI middleware or explicit service calls — pick one approach and apply it consistently across all mutating routes, not a mix of both.

### Completion Criteria
- [ ] Generating 3 times for the same org produces `timetable_versions` rows `v1`, `v2`, `v3`, all retained
- [ ] Publishing `v2` then `v3` results in exactly one `published` row (`v3`) and `v2` moved to `archived`
- [ ] Deleting a teacher produces a row in `audit_logs` with `action="teacher.delete"` and a non-null `actor_id`
- [ ] A non-admin (`role="viewer"`) JWT receives `403` on any `POST/PUT/DELETE` route

---

## Phase 5 — Export Service
**Status: NOT STARTED**

### Objective
Allow a published timetable to be downloaded as PDF, Excel, or CSV.

### Required File Structure
```
backend/
  app/
    api/routes/
      exports.py
    services/
      export_service.py     # generate_pdf(), generate_excel(), generate_csv()
```

### Implementation Requirements
1. `GET /timetables/{version_id}/export?format={pdf|xlsx|csv}` — generates the file, uploads to Supabase Storage bucket `exports` (per `SUPABASE_SETUP.md` Part E), returns a signed URL (expiry: 1 hour).
2. Only `published` versions may be exported by `viewer` role; `org_admin` may export any version including drafts.
3. Use `reportlab` for PDF, `openpyxl` for Excel (both already in `requirements.txt`).
4. Export content: one row/section per timetable slot — section, subject, teacher, room, day, period — grouped and sorted by day then period.

### Completion Criteria
- [ ] All three formats download successfully and open without corruption
- [ ] A `viewer` role gets `403` attempting to export a `draft` version
- [ ] Exported PDF/Excel content matches the actual slot assignments in the database (spot-check at least 5 rows)

---

## Phase 6 — Frontend Web App (React + TypeScript + Ant Design)
**Status: NOT STARTED**

### Objective
Build the admin web application consuming the Phase 2–5 API surface.

### Technology
- React 18, TypeScript, Vite
- **Ant Design (antd) v5** — `npm install antd`
- `@supabase/supabase-js` for client-side auth session handling
- `@tanstack/react-query` for API data fetching/caching (recommended given antd has no opinion on data fetching)
- `dayjs` (antd's date dependency) for any date/time display logic

### Required File Structure
```
frontend/
  src/
    main.tsx
    App.tsx
    theme/
      design-tokens.json      # SINGLE SOURCE OF TRUTH for color/spacing/typography/radius
      antdTheme.ts             # maps design-tokens.json -> antd ConfigProvider token object
    lib/
      supabaseClient.ts
      apiClient.ts             # thin wrapper around fetch/axios, attaches JWT to every request
    pages/
      LoginPage.tsx
      SignupPage.tsx
      DashboardPage.tsx
      TeachersPage.tsx
      RoomsPage.tsx
      SubjectsPage.tsx
      SectionsPage.tsx
      ConstraintsPage.tsx
      TimetableGeneratePage.tsx
      TimetableViewPage.tsx
      TimetableVersionsPage.tsx
    components/
      AppLayout.tsx             # antd Layout + Sider + Header shell
      ConflictBadge.tsx
      ConstraintBuilderForm.tsx
    routes/
      router.tsx                 # react-router-dom route table, auth-guarded
  package.json
  vite.config.ts
  .env.example                 # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_BASE_URL
```

### Implementation Requirements
1. `theme/design-tokens.json` defines `color`, `spacing`, `radius`, `typography` keys exactly as specified in the "Design Token Strategy" section at the top of this document. This file is intentionally framework-agnostic JSON (no antd-specific or React-specific keys) so it can be reused verbatim when Flutter work starts later.
2. `theme/antdTheme.ts` imports `design-tokens.json` and exports an antd `ThemeConfig` object passed to `<ConfigProvider theme={...}>` wrapping the whole app in `main.tsx`.
3. Auth: `LoginPage`/`SignupPage` use `supabaseClient.ts`; on success, store session, redirect to `DashboardPage`. `apiClient.ts` reads the current Supabase session token and attaches it as `Authorization: Bearer <token>` on every backend API call.
4. CRUD pages (`TeachersPage`, `RoomsPage`, etc.) use antd `Table` + `Modal` + `Form` for list/create/edit/delete, backed by `react-query` hooks calling `apiClient.ts`.
5. `ConstraintBuilderForm.tsx` is a guided form (antd `Form` with conditional fields based on a `constraint_type` `Select`) — NOT a raw JSON textarea — that writes structured payloads matching the backend's `Constraint` schema.
6. `TimetableGeneratePage.tsx` triggers `POST /timetables/generate`, shows an antd `Spin`/`Progress` indicator while the (synchronous, per Phase 2) request is in flight, then redirects to `TimetableViewPage` on success.
7. `TimetableViewPage.tsx` renders the schedule as a grid (days as columns, periods as rows) using antd `Table` with custom cell rendering — manual drag-and-drop reordering is **out of scope for this phase**, defer to a later phase if needed.
8. `TimetableVersionsPage.tsx` lists versions with their scores (antd `Statistic` or `Descriptions` components for score display) and exposes Publish/Rollback buttons calling the Phase 4 endpoints.
9. Routing is auth-guarded: unauthenticated users can only reach `LoginPage`/`SignupPage`; all other routes redirect to login if no valid session exists.

### Completion Criteria
- [ ] `npm run build` completes with zero TypeScript errors
- [ ] Full admin journey works end-to-end against the real backend: signup → login → create 2 teachers, 1 room, 2 subjects, 1 section → add 1 constraint → generate → view result → publish → export PDF
- [ ] Ant Design's default blue theme is visibly overridden by `design-tokens.json` colors (confirms the token pipeline works, not just that antd renders)
- [ ] No hardcoded color hex values anywhere in `.tsx` files outside of `theme/` — all styling derives from antd's theme token system

---

## Phase 7 — Deployment
**Status: NOT STARTED**

### Objective
Ship the system to real infrastructure: Oracle VPS (backend) + Vercel (frontend) + Supabase (already cloud-hosted since Phase 3).

### Required Deliverables
```
deploy/
  systemd/
    slotforge-api.service
  nginx/
    slotforge.conf
```

### Implementation Requirements
1. `slotforge-api.service` — systemd unit running `uvicorn app.main:app` bound to a unix socket or `127.0.0.1:8000`, `Restart=on-failure`, runs as a non-root user.
2. Nginx reverse-proxies `api.yourdomain.com` (or VPS IP if no domain yet) to the uvicorn socket, with TLS via Certbot/Let's Encrypt.
3. Frontend: `vercel.json` if any custom routing/redirect rules are needed; otherwise default Vite+Vercel zero-config deploy. Environment variables (`VITE_SUPABASE_URL`, etc.) set in Vercel project settings, not committed.
4. CORS on the FastAPI app (`app/main.py`) updated from `allow_origins=["*"]` to the actual Vercel deployment URL.

### Completion Criteria
- [ ] Public Vercel URL successfully completes the full Phase 6 user journey against the live Oracle VPS API and live Supabase project
- [ ] `systemctl restart slotforge-api` recovers cleanly with zero manual intervention
- [ ] HTTPS enforced (HTTP redirects to HTTPS) on the API domain

---

## Phase 8 — Premium AI Review Layer
**Status: NOT STARTED — explicitly post-MVP**

### Objective
LLM-based plain-language review of a published timetable's soft-constraint scores.

### Required File Structure
```
backend/
  app/
    api/routes/
      ai_review.py
    services/
      ai_review_service.py
```

### Implementation Requirements
1. `POST /timetables/{version_id}/ai-review` — gated behind an org-level `is_premium` flag (add this column to `organizations` table via a new Alembic migration).
2. `ai_review_service.py` constructs a prompt from the version's `scores` JSON and a summary of slot assignments, calls the configured `LLM_API_KEY`/`LLM_MODEL` (from `.env`), returns structured commentary.
3. Frontend: new `AIReviewPanel.tsx` component on `TimetableViewPage`, rendered only if `organization.is_premium === true`, triggered on-demand via a button (never automatic).

### Completion Criteria
- [ ] Non-premium org receives `403` from `ai-review` endpoint
- [ ] Premium org receives specific, non-generic commentary referencing actual scores/teachers from that exact timetable version (not boilerplate text)

---

## Deferred: Production Scaling (Do NOT build now)

These items are explicitly postponed until real usage demands them. Do not implement speculatively — each adds operational complexity (a new running process, a new failure mode) that isn't justified before there's a concrete trigger.

| Item | Trigger that justifies building it |
|---|---|
| Redis job queue + separate solver worker process | Solve times regularly exceed ~10s under real usage, OR concurrent generate requests from multiple orgs start queueing/blocking each other in practice |
| APScheduler background jobs (cleanup, nightly backups) | Manual cleanup becomes a recurring annoyance, or stale draft versions start accumulating noticeably |
| Multi-worker horizontal scaling | Single worker process can't keep up with job volume (requires Redis queue to already exist) |
| Supabase Realtime sync | A concrete feature requires live multi-admin collaboration (e.g. two admins editing the same draft simultaneously) |
| Flutter mobile app | Phase 6 (web frontend) is fully complete and deployed (Phase 7) |
| Push notifications | Flutter app exists and there's a concrete notification use case (e.g. "your published timetable changed") |
| Analytics dashboard | Enough real usage data exists to make a dashboard meaningful |

When the Redis phase is eventually triggered, it slots in as a new **Phase 2.5** equivalent: `POST /timetables/generate` changes from synchronous to job-enqueue-and-poll, a `backend/app/workers/worker.py` process is built out (already stubbed from Phase 0), and `docker-compose.yml` (already present, currently unused) gets activated. This is a backward-compatible change to the API contract if designed as "returns a job reference immediately" from the start — worth keeping in mind during Phase 2 even though Redis itself isn't built yet.
