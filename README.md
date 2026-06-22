# SlotForge — Scheduling Platform

SlotForge is an institutional scheduling and timetable optimization platform. It utilizes Google OR-Tools CP-SAT scheduler engine to generate collision-free, optimal schedules matching academic requirements and constraints.

---

## 🚀 Current Project Status

SlotForge is currently **100% complete through Phase 5** of the engineering roadmap. The backend API is fully integrated with PostgreSQL, handles multi-tenancy, verifies Supabase JWTs, logs admin actions, tracks timetable version states (draft, published, archived), and generates downloadable PDF, Excel, and CSV export formats.

### Completed Phases & Features

#### Standalone Solver (Phase 1)
- Implemented Google OR-Tools CP-SAT scheduling solver under `backend/app/solver/`.
- Enforces hard constraints: teacher/room double-booking prevention, weekly subject hour fulfillment, and section capacity.
- Evaluates soft constraint preferences: teacher gap minimization, daily load balancing, and preferred slot satisfaction.
- Exposes diagnostic core checks to isolate and detail clashing constraints when a schedule is infeasible.

#### Synchronous API Layer (Phase 2)
- Exposes scheduling configurations over HTTP using a modular FastAPI REST API structure.
- Employs strict Pydantic schemas for data validation and requests serialization.
- Fully documented interactive endpoints accessible via Swagger UI `/docs`.

#### Supabase Integration & Multi-Tenancy (Phase 3)
- Replaced the temporary in-memory store with PostgreSQL database persistence.
- Configured SQLAlchemy 2.0 ORM and Alembic migrations.
- Implemented Supabase JWT verification. Every request is isolated at the database query level by the user's `organization_id`.
- Handled atomic user profile and organization signups.

#### Versioning, Draft/Publish, and Audit Log (Phase 4)
- Timetable generations are stored as immutable `draft` versions.
- **Publish**: Promotes a target draft to `"published"` and demotes any previously active version for that tenant to `"archived"` in a single database transaction.
- **Rollback (Append-Only Copy)**: Re-publishes an archived version by creating a new timetable version row with an incremented version number, copying over assignments, and setting it to `"published"`. The original archived version is left unmutated.
- **RBAC**: Restricts all mutating operations (`POST`, `PUT`, `PATCH`, `DELETE`) to the `"org_admin"` role. Users with the `"viewer"` role receive `403 Forbidden` errors.
- **Audit Logs**: Mutating actions on resources (create, update, delete) are recorded in the `audit_logs` table containing user IDs, table targets, and structured state diffs.

#### Export Service (Phase 5)
- Supports exporting timetable versions into **PDF**, **Excel (XLSX)**, and **CSV** formats.
- Generates layout-styled tables in PDF via `reportlab`, auto-width columns in Excel via `openpyxl`, and clean comma-separated values.
- Implements a dynamic client import of `supabase` that falls back to writing files in local static storage (`backend/app/static/exports`) if no live project is connected.

---

## 🛠️ Getting Started

### Local Setup
1. **Initialize Backend Environment**:
   Ensure you have Python 3.12+ (or 3.14 with compatibility flags) installed.
   ```bash
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```
2. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and fill in the values:
   ```bash
   cp .env.example .env
   ```
   By default, local development uses a local PostgreSQL connection (e.g. `postgresql+psycopg://postgres:password@127.0.0.1:5432/slotforge`).
3. **Run Database Migrations**:
   ```bash
   alembic upgrade head
   ```
4. **Start the API Server**:
   ```bash
   PYTHONPATH=. uvicorn app.main:app --reload
   ```
   Access Swagger UI at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

---

## 🧪 Testing

We maintain a comprehensive suite of unit, integration, and end-to-end tests. For details, refer to the [TESTING.md](file:///home/rev/Documents/projects/slotforge/TESTING.md) guide.

### Running Automated Pytest Suite
Run the 13 automated tests covering the solver, REST API, RBAC permissions, tenant isolation, versioning lifecycle, and formats export:
```bash
cd backend
PYTHONPATH=. pytest
```

### Running the End-to-End Script
Execute the curl-based integration test script:
```bash
./TESTING.sh
```

---

## ⚙️ Remaining External Setup

To transition from local development to production, the following external resources and setups must be configured:

1. **Supabase Storage Buckets**:
   - Create a **private** bucket named `exports` in the Supabase console. This will store the generated PDF, Excel, and CSV files, enabling signed URLs with a 1-hour expiration time.
   - Create a **public** bucket named `assets` to store organization logos or profile pictures if needed.

2. **Supabase Auth Providers**:
   - In **Authentication -> Providers**, enable Email (or social auth like Google).
   - In **Authentication -> URL Configuration**, set the Site URL to your local frontend port (e.g., `http://localhost:5173`) and configure production redirect URLs (e.g. Vercel deployment link).

3. **Production Database & Environment Configuration**:
   - Update `DATABASE_URL` in your production environment (e.g. Oracle Cloud VPS) to point to the Supabase Postgres pooler connection string (Port 6543) rather than the direct connection.
   - Set up the environment variables (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`) in the VPS hosting configuration.
