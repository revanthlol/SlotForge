---
name: slotforge-oracle-deploy
description: Deploy, verify, and diagnose the SlotForge backend on the Oracle VPS over SSH. Use this skill whenever the user asks to push/deploy SlotForge, update the Oracle VPS, restart or inspect the FastAPI backend, diagnose production backend failures, verify assignment Save behavior remotely, or mentions the `server` SSH alias, even if they do not explicitly name this skill. It also covers pushing the connected frontend branch so Vercel can build it.
---

# SlotForge Oracle VPS Deploy and Diagnosis

Use this for the complete local-to-production loop. The known production SSH alias is `server`, the remote checkout is `/home/ubuntu/slotforge`, the tracked branch is `dev`, and the backend service is `slotforge-api.service`.

## Safety boundaries

- Preserve unrelated local changes. Inspect `git status` before staging.
- Preserve unrelated remote changes. Inspect remote `git status`; never use `git reset --hard`, `git clean`, or overwrite untracked files.
- Do not print or copy `.env` values, private keys, JWTs, database URLs, or tokens.
- Use `git pull --ff-only origin dev`; stop if the remote has diverged.
- Run migrations only when `alembic current` and `alembic heads` show a pending migration and the migration is part of the requested deploy. Never invent or skip a migration.
- Restart only `slotforge-api.service` unless the user explicitly asks for other services.
- Treat a failed health check or recent service error as a failed deploy, even if systemd says the process is active.

## Standard deploy flow

### 1. Inspect locally

Run:

```bash
git status --short
git branch --show-current
git diff --check
git log -3 --oneline
git remote -v
```

Confirm the intended branch is `dev`, review the diff, run the narrowest relevant tests, then the project verification commands. For normal SlotForge changes:

```bash
cd frontend && npm run build && npm run lint
cd backend && PYTHONPATH=. .venv/bin/pytest -q
```

Do not commit unrelated files. Use a clear commit message, then push:

```bash
git add <reviewed paths>
git commit -m "<intent-focused message>"
git push origin dev
```

Record the pushed commit SHA before touching the VPS.

### 2. Inspect the VPS before changing it

```bash
ssh -o BatchMode=yes -o ConnectTimeout=10 server '
  cd /home/ubuntu/slotforge
  git status --short
  git branch --show-current
  git log -3 --oneline
  ps -ef | grep -E "uvicorn|gunicorn|slotforge" | grep -v grep || true
  sudo systemctl status slotforge-api.service --no-pager
'
```

If the checkout has modified tracked files, untracked files, or a branch other than `dev`, report the exact state and stop for user direction unless the files are clearly known deployment helpers and can be preserved. The known untracked helpers on this server are `deploy.sh` and `diagnose.sh`; preserve them.

### 3. Fast-forward the VPS

```bash
ssh -o BatchMode=yes server '
  cd /home/ubuntu/slotforge
  git pull --ff-only origin dev
  git rev-parse --short HEAD
  git status --short
'
```

Confirm the printed SHA matches the pushed local SHA. If it does not, stop.

### 4. Check migrations

```bash
ssh -o BatchMode=yes server '
  cd /home/ubuntu/slotforge/backend
  .venv/bin/alembic current
  .venv/bin/alembic heads
'
```

If migrations are pending and are explicitly in scope, run `.venv/bin/alembic upgrade head`, capture the result, and re-check the current revision. If there are no pending migrations, do not run upgrade just to make noise.

### 5. Restart and verify readiness

```bash
ssh -o BatchMode=yes server '
  sudo systemctl restart slotforge-api.service
  for i in $(seq 1 30); do
    if curl -fsS http://127.0.0.1:8000/health >/tmp/slotforge-health.json 2>/dev/null; then break; fi
    sleep 1
  done
  sudo systemctl is-active slotforge-api.service
  cat /tmp/slotforge-health.json
  curl -sS -w "\nHTTP %{http_code}\n" http://127.0.0.1:8000/health/db
  sudo journalctl -u slotforge-api.service --since "2 minutes ago" -p err..alert --no-pager
'
```

Success requires systemd `active`, `/health` HTTP 200 with `status: ok`, `/health/db` HTTP 200 with `status: ok`, and no new error-level service logs. A database health 503 is a failed verification, not a harmless warning.

### 6. Verify the production path relevant to the change

Use a read-only or rollback-only smoke check. For assignment/constraint changes, test that a `Constraint` can be flushed with `workspace_id`, `name`, and `rule_type` populated, then roll the transaction back. Never leave smoke-test rows in production.

For an authenticated API path, use an existing safe test account only when its credentials are already available through the configured environment; never request or print secrets in shell output. Prefer a real API request with a rollback-safe test entity if the endpoint supports it.

## Diagnosis mode

When the user asks to diagnose rather than deploy:

1. Inspect local status and the current pushed SHA, but do not commit or push unless asked.
2. SSH to `server` read-only and capture checkout SHA/status, service status, process command, `/health`, `/health/db`, migration state, and recent logs.
3. Trace the failure across UI → API route → service/model → database. Read the full error, especially PostgreSQL constraint names and missing columns.
4. Reproduce with the smallest rollback-only smoke check available.
5. Fix the root cause locally, run verification, then resume the deploy flow only if the user requested a fix/deploy.

## Common failure patterns

- `NotNullViolation` on `workspace_id`: check that the model’s `before_insert` workspace listener propagates to compatibility subclasses and that constructors provide all generic-schema required fields.
- `NotNullViolation` on `name` or `rule_type`: legacy constraint constructors are not filling generic `constraint_rules` columns.
- `/health/db` reports deleted legacy columns: compare `REQUIRED_SCHEMA_COLUMNS` in `backend/app/main.py` with the current Alembic schema; do not “fix” this by ignoring missing tables.
- `git pull` refuses to fast-forward: preserve remote work and ask the user whether to reconcile it.
- Service active but curl fails: inspect startup logs and poll readiness; systemd activation is not application readiness.
- Vercel frontend not updated: confirm the Vercel project is configured to deploy the pushed `dev` branch. A successful Git push alone cannot prove Vercel deployment completion.

## Context maintenance

After any code/config/deployment change, update `docs/context/CURRENT_STATE.md` and add a dated entry to `docs/context/CHANGELOG.md`. Record the local commit SHA, VPS commit SHA, migration revision, health results, and any remaining risk. Do not record secrets.

## Final report format

Report:

- Local commit/push: SHA and branch.
- VPS sync: SHA and whether fast-forward succeeded.
- Service: active/inactive and restart result.
- Health: `/health`, `/health/db`, migration revision.
- Diagnosis/fix: root cause and changed paths.
- Verification: exact tests/smoke checks and results.
- Remaining risks: untracked files, warnings, Vercel status uncertainty, or anything not verified.
