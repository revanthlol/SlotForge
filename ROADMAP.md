# SlotForge — Build Roadmap

Backend-first sequencing: solver engine → API → auth/DB (Supabase) → frontend (React + Joy UI) → mobile (Flutter, later, separate effort).

Each phase has a **definition of done** — don't move to the next phase until you can check every box. This is what prevents "70% done on six things, 0% shippable."

---

## Phase 0 — Repo & Environment Setup
**Goal:** project skeleton exists, everyone can run something, even if it does nothing useful yet.

- [ ] Monorepo structure created (`setup.sh` handles this — see deliverable 2)
- [ ] Python venv + dependency manifest (`requirements.txt` or `pyproject.toml`) committed
- [ ] `.env.example` committed, real `.env` gitignored
- [ ] Pre-commit hooks: `black`, `ruff` (Python lint/format) — optional but saves arguments later
- [ ] `docker-compose.yml` for local Redis (so you're not installing Redis bare-metal on your laptop)

**Done when:** `./setup.sh` followed by `uvicorn app.main:app --reload` returns a 200 on a `/health` endpoint.

---

## Phase 1 — Solver Core (pure Python, no API yet)
**Goal:** prove the CP-SAT model actually works in isolation before wrapping it in anything.

This is the actual Operations Research content of your project — treat it as its own deliverable, testable without a server running.

- [ ] Define the data contract: what a "problem instance" looks like as a Python dict/dataclass (teachers, rooms, subjects, sections, slots, constraints)
- [ ] Hard constraints encoded in OR-Tools CP-SAT:
  - No teacher in two places at once
  - No room double-booked
  - No section double-booked
  - Room capacity / type compatibility (lab vs lecture hall)
  - Every section's weekly subject-hour requirement met exactly
- [ ] Soft constraints encoded as weighted objective terms:
  - Minimize teacher gap-hours
  - Balance daily load across the week
  - Respect teacher preferred slots (where stated)
- [ ] Solver returns one of three states clearly: `OPTIMAL`, `FEASIBLE`, `INFEASIBLE` — and on infeasible, which constraint group is the likely culprit (CP-SAT gives you assumption-based infeasibility hints — use them)
- [ ] Constraint definitions are loaded from a Python dict/JSON fixture, **not hardcoded** — this is the seed of the later "constraints as DB rows" requirement
- [ ] Unit tests: at least one feasible toy instance, one deliberately infeasible instance, one "kind of tight" instance to check soft-constraint behavior
- [ ] Soft constraint scoring function: given a solved schedule, output a breakdown (e.g. `{"preference_score": 85, "utilization_score": 95, "gap_score": 92}`)

**Done when:** you can run `python solver/run.py fixtures/sample_small.json` from the CLI and get back a valid, scored, conflict-free schedule — with zero FastAPI/Redis/DB involved.

---

## Phase 2 — API Skeleton (FastAPI, synchronous first)
**Goal:** wrap the solver in HTTP, without async job infrastructure yet — get the contract right before adding queueing complexity on top.

- [ ] FastAPI app boots, `/health` endpoint works
- [ ] Pydantic schemas mirror the solver's data contract from Phase 1 (this is your API contract — get it stable before frontend work starts)
- [ ] CRUD endpoints, **in-memory or SQLite for now** (real Postgres/Supabase comes in Phase 4):
  - Organizations
  - Teachers
  - Rooms
  - Subjects
  - Sections
  - Constraints (generic key-value/JSON rule rows, not per-type tables)
- [ ] `POST /timetables/generate` — synchronous call straight into the Phase 1 solver, blocking response (yes, this will be slow — that's expected and exactly why Phase 3 exists)
- [ ] `GET /timetables/{id}` — fetch a generated result
- [ ] OpenAPI docs auto-render at `/docs`, used to validate the contract with your partner before frontend work begins

**Done when:** you can `curl` a full org → teachers → rooms → subjects → sections → generate flow end-to-end against a running local server, no DB persistence required yet (in-memory dict is fine).

---

## Phase 3 — Async Job Queue (Redis + Worker)
**Goal:** decouple the slow solve from the request/response cycle.

- [ ] Redis running locally via docker-compose
- [ ] Job queue library chosen — **recommend RQ over Celery** for a 2-person project: simpler setup, no separate message broker config split, good enough at this scale. Celery is the "right" choice if you ever need multi-queue priority routing; you don't, yet.
- [ ] `POST /timetables/generate` now: validates input → enqueues job → returns `{job_id, status: "queued"}` immediately
- [ ] `GET /jobs/{job_id}` — poll for status (`queued`, `running`, `done`, `failed`) and result once done
- [ ] Separate worker entrypoint (`worker.py`), runs as its own process, listens on the Redis queue, calls into the Phase 1 solver
- [ ] Verify independence: kill the worker process mid-job, confirm the API is still responsive (this is the entire point of this phase — prove it, don't assume it)
- [ ] Local systemd unit files drafted (even if not deployed yet) — `slotforge-api.service`, `slotforge-worker.service`

**Done when:** you can fire 3 concurrent generate requests, watch them queue and process one at a time (or in parallel if you spin up 2 worker processes), and the API never blocks.

---

## Phase 4 — Supabase Integration (DB, Auth, Storage)
**Goal:** swap in-memory/SQLite for real persistence; add real multi-tenant auth.

- [ ] Supabase project created (see `SUPABASE_SETUP.md`, deliverable 3)
- [ ] Schema migrated via SQLAlchemy + Alembic — **every table gets `organization_id`** from this point on, no exceptions, including junction/log tables
- [ ] Tables: `organizations`, `users` (or rely on Supabase's own `auth.users` + a `profiles` table), `teachers`, `rooms`, `subjects`, `sections`, `constraints`, `timetable_versions`, `timetable_slots`, `audit_logs`
- [ ] Row-Level Security (RLS) policies in Supabase scoped by `organization_id` — this is Supabase's actual value-add over plain Postgres, don't skip it
- [ ] Supabase Auth wired into FastAPI — verify JWTs issued by Supabase on incoming requests, extract `org_id` + role from claims
- [ ] Role model: `org_admin` (full CRUD + generate + publish) vs `viewer` (read published only) — minimum viable role split
- [ ] Supabase Storage bucket created for exports/logos, signed URL generation tested
- [ ] Versioning model implemented: every generate creates a new immutable `timetable_versions` row (`v1`, `v2`...), never overwrites
- [ ] Draft/published state machine: new versions default to `draft`; explicit `POST /timetables/{id}/publish` flips state; only one `published` version active per org at a time
- [ ] Audit log middleware/hooks: every mutating endpoint writes an `audit_logs` row (who, what, when, before/after diff if cheap to capture)

**Done when:** two different fake organizations can both create teachers/rooms/generate timetables through the same API, and neither can see or touch the other's data — test this explicitly, don't assume RLS is doing its job.

---

## Phase 5 — Export & Polish Backend Features
**Goal:** the features people ask for in week one of real usage.

- [ ] Export service: published timetable → PDF, Excel, CSV
- [ ] Export files written to Supabase Storage, signed URL returned to client (don't stream large files through FastAPI if avoidable)
- [ ] Background scheduler (APScheduler) wired in for at least one real job — nightly cleanup of stale `draft` versions is a good first one
- [ ] Basic rate limiting on `/timetables/generate` per organization (prevents one tenant from hammering the solver worker)

**Done when:** a published timetable can be downloaded as a PDF and an Excel file from a real signed URL.

---

## Phase 6 — Frontend (React + TypeScript + Joy UI)
**Goal:** admin web app consuming the now-stable API contract.

- [ ] Vite + React + TypeScript scaffold
- [ ] Joy UI installed and themed (Material You–adjacent expressive theme — Joy UI's theming system, not MUI Material's, since you're using Joy specifically)
- [ ] Auth flow: Supabase Auth client-side SDK, login/signup, session persisted, JWT attached to API calls
- [ ] Org-scoped routing: everything after login is implicitly scoped to the logged-in user's organization
- [ ] CRUD screens: Teachers, Rooms, Subjects, Sections — tables with create/edit/delete
- [ ] Constraint builder UI — this is the trickiest UI piece: a guided form that writes structured constraint rows, not a JSON textbox
- [ ] Generate flow: trigger generate → poll job status → show progress → render result
- [ ] Timetable view: grid/calendar rendering of a version, with version switcher (compare v1 vs v2 vs v3)
- [ ] Drag-and-drop manual override on a draft version, with live re-validation against hard constraints (flag conflicts inline, don't silently allow them)
- [ ] Publish action, with a confirmation step (publishing is a one-way-ish door per version)
- [ ] Export buttons wired to Phase 5 endpoints

**Done when:** a complete admin journey — signup org → add 3 teachers/2 rooms/4 subjects/2 sections → set constraints → generate → review → publish → export PDF — works start to finish in a browser with zero backend code changes needed.

---

## Phase 7 — Deployment
**Goal:** it's live, not just running on localhost.

- [ ] Oracle Cloud VPS provisioned, firewall rules set (only 80/443/SSH open)
- [ ] FastAPI + worker + Redis running as systemd services, `slotforge-api` and `slotforge-worker` independently restartable
- [ ] Nginx (or Caddy) reverse proxy + TLS (Let's Encrypt / Caddy auto-TLS)
- [ ] Frontend deployed to Vercel, environment variables pointed at the VPS API and Supabase project
- [ ] Supabase project moved from free-tier dev settings to whatever production settings make sense (connection pooling via Supabase's pooler if you expect concurrent load)
- [ ] Basic uptime check (even just a cron curl + email/Discord webhook) on the API health endpoint

**Done when:** the public Vercel URL, talking to the public VPS API, talking to Supabase, supports the full Phase 6 journey for a real (non-localhost) user.

---

## Phase 8 — Premium AI Review Layer (post-MVP)
**Goal:** the differentiator feature, built once the core product actually works.

- [ ] Backend endpoint: feed a solved+scored timetable version to an LLM API
- [ ] Prompt designed to explain soft-constraint trade-offs in plain language (why teacher X has a gap, why room Y is underused)
- [ ] Gating: premium tier check before allowing the call (org-level flag or subscription status)
- [ ] Frontend: "AI Review" panel on the timetable view, triggered on-demand (not automatic — it costs money per call)

**Done when:** a published timetable can be sent for AI review and the response renders as readable, specific (not generic) commentary on that exact schedule.

---

## Explicitly deferred (don't build until something above is solid)
- Flutter mobile app (separate effort entirely, starts only once the API is stable and Phase 6 is live)
- Supabase Realtime sync
- Multi-worker horizontal scaling / queue priority tiers
- Push notifications
- Analytics dashboard
- Desktop packaging (Tauri) — trivial to add later, not worth the time now
