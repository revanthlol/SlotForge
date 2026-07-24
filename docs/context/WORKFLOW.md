# Continuation Workflow

## Before editing

1. Read this folder’s `README.md`, `CURRENT_STATE.md`, and `ARCHITECTURE.md`.
2. Run `git status --short` and preserve unrelated user changes.
3. Trace the reported behavior from UI event to API route to persistence/solver output.
4. Reproduce the issue or document why local reproduction is unavailable.
5. Form one root-cause hypothesis before changing code.

## While editing

- Keep the smallest change that addresses the root cause.
- Use `apply_patch` for local file edits.
- Keep user-facing errors actionable; do not leave important failures only in `console.error`.
- Preserve tenant scoping and admin checks on every mutating API path.
- When an endpoint replaces a complete list, avoid concurrent replacement requests unless the API is explicitly atomic.
- Do not add a constraint type to the UI until its backend/solver behavior and payload shape are understood.

## Verification

For frontend changes:

```bash
cd frontend
npm run build
npm run lint
```

For backend changes:

```bash
cd backend
PYTHONPATH=. .venv/bin/pytest -q
```

Run the narrowest relevant tests first, then the broader suite when practical. Report warnings separately from failures. Do not claim a bug is fixed without fresh verification output.

## Handoff requirements

Before stopping, update `CURRENT_STATE.md` and add a dated `CHANGELOG.md` entry. Include:

- what changed and why;
- exact files touched;
- verification commands and results;
- known limitations or follow-up work;
- any migration, environment, or deployment action still required.
