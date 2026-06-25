# SlotForge — Project Abstract

> **Domain:** Operations Research · Constraint Satisfaction · Applied Software Engineering  
> **Category:** Mini Project  
> **Team Size:** 2

---

## Abstract

Manual timetable construction in schools, colleges, and any organisation that allocates people or resources to time slots is a combinatorial problem routinely solved by hand through trial and error, despite being a well-studied instance of **Constraint Satisfaction (CSP)** and **Integer Linear Programming (ILP)**. As the number of agents, resources, and time slots grows, the search space expands combinatorially, making manual scheduling slow, error-prone, and brittle whenever a single constraint changes.

**SlotForge** formulates resource-and-time scheduling as a constraint optimisation problem and builds a production-grade, multi-tenant SaaS platform around it. While the primary use case is academic timetabling — teachers, rooms, subjects, and sections — the underlying model is domain-agnostic: any setup where finite resources must be assigned to agents across discrete time slots without conflict (shift rosters, facility booking, exam scheduling) fits the same constraint structure. The platform is therefore a general-purpose scheduler rather than a single-purpose academic tool.

The scheduling problem is encoded and solved using **Google OR-Tools CP-SAT**, an industry-standard Constraint Programming and SAT-based solver capable of proving feasibility or infeasibility and returning provably optimal (or best-found within a time budget) solutions. Hard constraints — no agent or resource double-booked in the same time slot, every section's weekly subject-hour quota satisfied, room capacity and type compatibility respected — are encoded as boolean and linear constraints directly in the CP-SAT model. Soft constraints — minimising teacher gaps, balancing daily load across sections, satisfying stated slot preferences — are stored as database rows rather than hardcoded values, so solver behaviour is configured by an administrator through the interface without touching source code. Each solved generation produces a transparent quality score across three soft-constraint dimensions (preference satisfaction, room-and-teacher utilisation, gap minimisation), giving every run a measurable quality signal rather than a black-box output.

The backend API is built on **FastAPI** (Python 3.12) with strict **Pydantic** request/response validation and auto-generated **OpenAPI** documentation. Persistence is handled by **PostgreSQL** (via Supabase), with **SQLAlchemy 2.0** ORM and **Alembic** schema migrations. Every table carries an `organization_id` foreign key from the first migration — multiple independent institutions share one deployment with zero data leakage between tenants. Authentication uses **Supabase JWT** verification; role-based access control separates `org_admin` (full CRUD) from `viewer` (read-only) at the API layer. All mutating operations are recorded in an append-only `audit_logs` table capturing the actor, target table, target ID, and a structured before/after diff.

Timetable generations are **versioned and immutable**: each run produces a new `timetable_versions` row with an incrementing version number and a `draft` status. Administrators review and compare versions using their attached quality scores before explicitly **publishing** one — at which point the previously published version is atomically demoted to `archived`. A **rollback** operation re-publishes any archived version by appending a new version row (copy-on-write), leaving all history intact. End users — whether on the React web app or the Flutter mobile client — only ever see the deliberately published schedule. Completed timetables can be exported on demand in **PDF**, **Excel (XLSX)**, and **CSV** formats, generated server-side and delivered via signed storage URLs.

The planned system separates concerns across three managed layers: **Vercel** hosts the React TypeScript admin web application; an **Oracle Cloud VPS** runs the FastAPI service (and, in the production scaling phase, a separate solver worker process and Redis job queue); and **Supabase** provides PostgreSQL, JWT authentication, and object storage. A premium tier is specified to layer an **LLM-based review pass** over the solved schedule and its constraint scores, translating the optimiser's numerical trade-offs into plain-language explanations that a non-technical administrator can act on.

---

## Keywords

Constraint Satisfaction Problem (CSP) · Integer Linear Programming (ILP) · CP-SAT · Google OR-Tools · Multi-Tenant Architecture · Combinatorial Optimisation · Resource Allocation · Timetable Scheduling · FastAPI · PostgreSQL · Supabase · React · TypeScript · Flutter

---

## Core Objectives

| ID | Objective | Description |
|---|---|---|
| OBJ.01 | **Conflict-free generation** | Zero double-bookings of teachers, rooms, or resources across the generated timetable — verified by the solver, not assumed |
| OBJ.02 | **Multi-tenant from day one** | Every table scoped by `organization_id`; multiple institutions run on one system with zero cross-tenant data leakage |
| OBJ.03 | **Data-driven constraints** | Hard and soft constraints live in the database as rows, not as hardcoded constants — admins configure solver behaviour without a redeploy |
| OBJ.04 | **Versioned, immutable history** | Every generation is stored as an immutable version with an attached quality score; history is never overwritten |
| OBJ.05 | **Draft → Published state machine** | End users only ever see a deliberately published version; drafts are never exposed to consumers |
| OBJ.06 | **Multi-format export** | Administrators can download any version as PDF, Excel, or CSV for offline distribution |
| OBJ.07 | **Role-based access control** | `org_admin` has full CRUD; `viewer` is read-only — enforced at the API layer, not just the UI |
| OBJ.08 | **AI-assisted review (premium)** | An LLM pass over the solved schedule and its constraint scores, explained in plain language for non-technical admins |

---

## Technology Stack

### Optimisation Core

| Component | Technology | Rationale |
|---|---|---|
| Solver | Python · Google OR-Tools CP-SAT | Industry-standard CSP/ILP solver; returns optimal solutions or proves infeasibility — essential for diagnosing unsolvable constraint sets |
| Constraint storage | Database-driven rows | Constraints (max classes/day, unavailable slots, preferred rooms) live as data, so the solver builds itself from configuration, not source code |

### Backend

| Component | Technology | Rationale |
|---|---|---|
| API server | FastAPI (Python 3.12) | Async Python framework; strict Pydantic validation; auto-generates OpenAPI docs at `/docs` |
| ORM & Migrations | SQLAlchemy 2.0 · Alembic | Explicit, versioned schema migrations; typed ORM models |
| Authentication | Supabase Auth (JWT) | Role-based JWT verification wired as FastAPI dependency injection |
| Job queue | Redis · RQ / Celery | Decouples request handling from solve time; allows concurrent solve jobs across multiple organisations |

### Data & Storage

| Component | Technology | Rationale |
|---|---|---|
| Database | Supabase PostgreSQL | Every table carries `organization_id` from migration 001 — full tenant isolation |
| Object storage | Supabase Storage | Stores generated PDF/Excel/CSV exports and institution assets via signed URLs |
| Versioning | `draft` / `published` / `archived` state machine | Immutable generation history; admins compare, publish, and roll back |
| Audit log | `audit_logs` table | Tracks who changed what, with structured before/after diffs |

### Frontend — Web (Admin)

| Component | Technology | Rationale |
|---|---|---|
| Framework | React 18 · TypeScript · Vite | Type-safe component tree; fast HMR development cycle |
| UI library | Ant Design v5 | Mature component catalog covering data tables, forms, and calendars — all needed for scheduling admin |
| Data fetching | TanStack React Query | Caching, background refetching, and optimistic updates over the FastAPI endpoints |
| Hosting | Vercel | Zero-config CI/CD from git push; edge-deployed static assets |

### Frontend — Mobile (View-only)

| Component | Technology | Rationale |
|---|---|---|
| Framework | Flutter · Dart | Native Material 3 rendering; cross-platform (iOS + Android) from a single codebase |
| Scope | Read-only schedule viewer | Consumes the same REST API; no write access — separated by role in the JWT |

### Export & Premium

| Component | Technology | Rationale |
|---|---|---|
| PDF export | `reportlab` | Layout-styled table output with section/teacher/room columns |
| Excel export | `openpyxl` | Auto-width columns; clean XLSX format institutions can open in Excel/Sheets |
| CSV export | Python stdlib | Comma-separated values for bulk data import into third-party systems |
| AI review | LLM API (configurable) | Backend endpoint feeds solved schedule + constraint scores to an LLM; returns plain-language trade-off commentary |

---

## System Architecture

```
┌─────────────────────────────────┐
│          CLIENT LAYER           │
│  React Admin Web (Vercel)       │
│  Flutter Mobile App             │
└────────────┬────────────────────┘
             │ HTTPS / REST + JWT
┌────────────▼────────────────────┐
│          API LAYER              │
│  FastAPI (Oracle Cloud VPS)     │
│  Pydantic validation            │
│  JWT verification (Supabase)    │
│  RBAC: org_admin / viewer       │
└────────────┬────────────────────┘
             │
     ┌───────┴────────┐
     │                │
┌────▼─────┐  ┌───────▼──────────┐
│  Redis   │  │  Supabase        │
│  (queue) │  │  PostgreSQL      │
└────┬─────┘  │  Auth · Storage  │
     │        └──────────────────┘
┌────▼─────────────────────┐
│  SOLVER WORKER (VPS)     │
│  Google OR-Tools CP-SAT  │
│  Hard + soft constraints │
│  Scoring module          │
└──────────────────────────┘
```

**Key architectural decisions:**
- The API process and solver worker run as **independent systemd services** (`slotforge-api`, `slotforge-worker`) — a solver crash or long-running job never takes the API down.
- Supabase handles **Auth, PostgreSQL, and Storage** in a single managed provider, avoiding the operational complexity of stitching together separate services.
- The frontend uses a **single `design-tokens.json`** as the source of truth for colour, spacing, radius, and typography — consumed by the React/Ant Design `ConfigProvider` and later by Flutter via a codegen step, ensuring consistent visual identity without duplicating design decisions.

---

## Engineering Phases

| Phase | Title |
|---|---|
| 0 | Repository & Environment Setup |
| 1 | Solver Core (standalone CP-SAT engine) |
| 2 | Synchronous REST API Layer (FastAPI + Pydantic) |
| 3 | Supabase Integration, PostgreSQL persistence, multi-tenancy, JWT auth |
| 4 | Versioning, Draft/Publish state machine, RBAC, Audit Log |
| 5 | Export Service (PDF, Excel, CSV via Supabase Storage) |
| 6 | Frontend Web App (React + TypeScript + Ant Design) |
| 7 | Production Deployment (Oracle VPS + Vercel + Nginx + TLS) |
| 8 | Premium AI Review Layer (LLM-based schedule commentary) |

---

## What Makes This Non-Trivial

1. **Solver infeasibility diagnosis** — When a constraint set is unsolvable, the engine performs targeted constraint relaxation to identify and report *which* constraint group caused the conflict, rather than returning an opaque failure.

2. **Data-driven constraint architecture** — Soft constraints are not hardcoded in the solver; they are loaded from database rows at solve time. This means an administrator can change scheduling policy (e.g., "limit any section to 4 classes per day") through the UI without a code change or redeploy.

3. **Append-only version history** — Rollback is implemented as copy-on-write (a new version row is created, the original is never mutated), ensuring the full audit trail of all generated schedules is preserved regardless of how many publish/rollback operations are performed.

4. **True multi-tenancy** — `organization_id` is a foreign key on every tenant-scoped table from migration 001. All queries are filtered by the authenticated user's `organization_id` at the ORM layer — it is architecturally impossible for one tenant's request to read another tenant's data.

5. **Transparent quality scoring** — Every generated timetable carries three scored dimensions (preference satisfaction 0–100, utilisation 0–100, gap minimisation 0–100) computed by a dedicated scoring module (`scoring.py`) independently of the solver, so administrators can compare versions on objective metrics rather than eyeballing the grid.

---

*SlotForge — Operations Research Mini Project*
