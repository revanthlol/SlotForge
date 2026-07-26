# Testing SlotForge

Run commands from the repository root unless a section says otherwise.

## Frontend

```bash
cd frontend
npm install
npm run build
npm run lint
```

For browser verification, start `npm run dev` and check:

- the public landing hero, launch chooser, real footer links, and reduced-motion behavior;
- mobile landing content plus the `/login`, `/signup`, `/onboarding`, and console gate;
- Academic-only preset selection in Settings and onboarding;
- Canvas light/dark themes, full-bleed sizing, view tabs, search, labels, inspector, zoom, and pan;
- `/open-source`, `/privacy`, `/terms`, `/contact`, and a faculty share route;
- keyboard focus, console errors, 125% zoom, and horizontal overflow.

## Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
PYTHONPATH=. pytest -q
```

Run a focused test first while developing, for example:

```bash
PYTHONPATH=. pytest -q tests/test_canvas_api.py
```

The health endpoints are:

```bash
curl -fsS http://127.0.0.1:8000/health
curl -fsS http://127.0.0.1:8000/health/db
```

Both must return HTTP 200 before a deployment is considered healthy. `/health/db` also reports the Alembic revision and missing required columns.

## Public database schema

The committed [`database/schema.sql`](database/schema.sql) must be generated from a disposable database at the Alembic head, never from a production data dump.

```bash
cd backend
DATABASE_URL='postgresql+psycopg://postgres:local_password@127.0.0.1:55433/slotforge_schema' .venv/bin/alembic upgrade head
cd ..
PGPASSWORD=local_password pg_dump \
  --host=127.0.0.1 --port=55433 --username=postgres --dbname=slotforge_schema \
  --schema-only --schema=public --no-owner --no-privileges \
  --restrict-key=SlotForgeSchemaExport --file=docs/database/schema.sql
```

Confirm it contains no records or environment values:

```bash
rg -n 'COPY |INSERT INTO|postgresql://|supabase\.co|BEGIN PRIVATE KEY' docs/database/schema.sql
```

No matches are expected. Restore the dump into another disposable PostgreSQL database to validate it.

## UML and documentation

```bash
plantuml -checkonly docs/uml/v2/*.puml
plantuml -tsvg docs/uml/v2/*.puml
```

Check documentation links and reject local `file://` links, secrets, template filler, and stale phase-status claims before release.

## Production verification

The Oracle API checkout tracks `dev`. A release requires a clean fast-forward to the pushed commit, Alembic head confirmation, an active `slotforge-api.service`, HTTP 200 from both health endpoints, and no new error-level service logs. Frontend deployment must be verified independently on Vercel; a Git push alone does not prove deployment success.
