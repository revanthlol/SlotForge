# SlotForge

**Open-source institutional scheduling that makes constraints visible.**

[Live app](https://slotforge-main.vercel.app) · [Documentation](docs/README.md) · [Contributing](CONTRIBUTING.md) · [Report an issue](https://github.com/revanthlol/SlotForge/issues)

SlotForge helps academic teams model faculty, subjects, sections, rooms, time structure, and institutional rules; generate a timetable with Google OR-Tools CP-SAT; inspect conflicts and scheduling pressure; and move a schedule through draft, review, publication, sharing, and export.

The complete source, current application schema, and faculty-facing UML diagrams are public under the MIT License. You can audit the scheduling logic, self-host the stack, or contribute improvements.

## What works today

- Academic timetable onboarding and resource management
- Teacher–subject and section–subject–teacher assignments
- Constraint templates, impact preview, and explainable conflict analysis
- CP-SAT generation, preflight checks, heatmaps, and the relationship Canvas
- Draft, publish, archive, branch, compare, and rollback version workflows
- Faculty timetable views and revocable public share links
- PDF, Excel, HTML, iCalendar, DOCX, and Google Docs-oriented exports
- Supabase Auth, organization membership, and tenant-scoped FastAPI access

Staff roster, event, exam, and facility presets are visible as coming-soon roadmap domains. They are intentionally locked until each has complete persistence, solver, and product coverage.

## Stack

| Layer | Technology |
| --- | --- |
| Web application | React 19, TypeScript, Vite, Tailwind CSS, TanStack Query, Motion |
| API | FastAPI, Pydantic, SQLAlchemy, Alembic |
| Solver | Google OR-Tools CP-SAT |
| Data and identity | PostgreSQL and Supabase Auth |
| Hosting | Vercel frontend and Oracle-hosted API |

## Run locally

Requirements: Node.js 22+, Python 3.12+, and PostgreSQL 15+.

```bash
git clone https://github.com/revanthlol/SlotForge.git
cd SlotForge
```

Backend:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Fill the local values in .env, then:
alembic upgrade head
uvicorn app.main:app --reload
```

Frontend, in another terminal:

```bash
cd frontend
npm install
cp .env.example .env
# Fill the local values in .env, then:
npm run dev
```

Never commit `.env` files, database URLs, Supabase secret keys, or service credentials. The browser may receive only the public Supabase client key configured for the project.

## Verify

```bash
cd frontend && npm run build && npm run lint
cd ../backend && PYTHONPATH=. .venv/bin/pytest -q
```

See [docs/TESTING.md](docs/TESTING.md) for focused and deployment checks.

## Database and architecture

- [Database guide](docs/database/README.md) and [schema-only PostgreSQL export](docs/database/schema.sql)
- [Faculty-facing UML v2 diagrams](docs/uml/README.md)
- [Architecture and maintainer context](docs/context/README.md)
- [Supabase setup and security boundaries](docs/SUPABASE_SETUP.md)

The published SQL contains structure only—never production records, secrets, or connection details. Supabase-managed `auth.users` is deliberately outside the export. SlotForge currently enforces tenant access in FastAPI; do not assume the repository declares complete database RLS coverage.

## Contribute

Contributions are welcome across code, accessibility, testing, documentation, constraint modeling, and scheduling research. Read [CONTRIBUTING.md](CONTRIBUTING.md), choose or open an issue, and target pull requests at `dev`.

For security problems, follow [SECURITY.md](SECURITY.md) instead of filing a public issue. Institution users can contact [workofotb@gmail.com](mailto:workofotb@gmail.com).

## License

MIT © 2026 revanthlol. See [LICENSE](LICENSE).
