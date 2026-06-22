#!/usr/bin/env bash
#
# SlotForge — project scaffold setup script
# Backend-first structure: solver core -> API -> worker -> (frontend added later in Phase 6)
#
# Usage:
#   chmod +x setup.sh
#   ./setup.sh
#
set -euo pipefail

PROJECT_ROOT="$(pwd)"
PYTHON_BIN="${PYTHON_BIN:-python3}"

echo "=================================================="
echo " SlotForge — scaffolding project structure"
echo " Root: ${PROJECT_ROOT}"
echo "=================================================="

# ---------------------------------------------------------------------------
# 1. Directory structure
# ---------------------------------------------------------------------------
echo ""
echo "[1/7] Creating directory structure..."

mkdir -p backend/app/{api,core,models,schemas,services,solver,workers}
mkdir -p backend/app/api/routes
mkdir -p backend/solver/fixtures
mkdir -p backend/tests/{unit,integration}
mkdir -p backend/migrations
mkdir -p backend/scripts
mkdir -p deploy/systemd
mkdir -p deploy/nginx
mkdir -p docs

# Frontend dir created now but left empty until Phase 6 — placeholder + README only
mkdir -p frontend

echo "  -> backend/app/{api,core,models,schemas,services,solver,workers}"
echo "  -> backend/solver/fixtures"
echo "  -> backend/tests/{unit,integration}"
echo "  -> backend/migrations"
echo "  -> deploy/{systemd,nginx}"
echo "  -> frontend (placeholder — Phase 6)"



# ---------------------------------------------------------------------------
# 3. Environment file template
# ---------------------------------------------------------------------------
echo ""
echo "[2/7] Writing .env.example..."

cat > "${PROJECT_ROOT}/backend/.env.example" << 'EOF'
# --- App ---
APP_ENV=development
API_PORT=8000

# --- Supabase ---
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_JWT_SECRET=your_jwt_secret_here

# --- Database (Supabase Postgres connection string) ---
DATABASE_URL=postgresql://postgres:[email protected]:5432/postgres

# --- Redis (local docker-compose by default) ---
REDIS_URL=redis://localhost:6379/0

# --- Premium AI review (Phase 8) ---
LLM_API_KEY=
LLM_MODEL=claude-sonnet-4-6
EOF

# real .env for local dev, gitignored
cp "${PROJECT_ROOT}/backend/.env.example" "${PROJECT_ROOT}/backend/.env"
echo "  -> .env.example committed, .env created locally (gitignored)"

# ---------------------------------------------------------------------------
# 4. .gitignore
# ---------------------------------------------------------------------------
echo ""
echo "[3/7] Writing .gitignore..."

cat > "${PROJECT_ROOT}/.gitignore" << 'EOF'
# Python
__pycache__/
*.py[cod]
*.egg-info/
.venv/
.pytest_cache/

# Env
.env
*.env.local

# Node / frontend (Phase 6 onward)
node_modules/
dist/
.vite/

# OS
.DS_Store

# Editors
.vscode/
.idea/

# Logs
*.log

# DB
*.sqlite3
EOF

echo "  -> .gitignore written"

# ---------------------------------------------------------------------------
# 5. docker-compose for local Redis
# ---------------------------------------------------------------------------
echo ""
echo "[4/7] Writing docker-compose.yml (local Redis)..."

cat > "${PROJECT_ROOT}/docker-compose.yml" << 'EOF'
services:
  redis:
    image: redis:7-alpine
    container_name: slotforge-redis
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    restart: unless-stopped

volumes:
  redis-data:
EOF

echo "  -> docker-compose.yml written (run: docker compose up -d)"

# ---------------------------------------------------------------------------
# 6. FastAPI app skeleton
# ---------------------------------------------------------------------------
echo ""
echo "[5/7] Writing FastAPI app skeleton..."

cat > "${PROJECT_ROOT}/backend/app/main.py" << 'EOF'
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="SlotForge API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten before deploying to prod
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


# Route modules get included here as they're built (Phase 2 onward):
# from app.api.routes import organizations, teachers, rooms, subjects, sections, timetables
# app.include_router(organizations.router, prefix="/organizations", tags=["organizations"])
EOF

mkdir -p "${PROJECT_ROOT}/backend/app/api/routes"
touch "${PROJECT_ROOT}/backend/app/api/__init__.py"
touch "${PROJECT_ROOT}/backend/app/api/routes/__init__.py"
touch "${PROJECT_ROOT}/backend/app/core/__init__.py"
touch "${PROJECT_ROOT}/backend/app/models/__init__.py"
touch "${PROJECT_ROOT}/backend/app/schemas/__init__.py"
touch "${PROJECT_ROOT}/backend/app/services/__init__.py"
touch "${PROJECT_ROOT}/backend/app/solver/__init__.py"
touch "${PROJECT_ROOT}/backend/app/workers/__init__.py"
touch "${PROJECT_ROOT}/backend/app/__init__.py"

echo "  -> app/main.py + package __init__ files"

# ---------------------------------------------------------------------------
# 7. Solver fixture + worker stub
# ---------------------------------------------------------------------------
echo ""
echo "[6/7] Writing solver fixture + worker stub..."

cat > "${PROJECT_ROOT}/backend/solver/fixtures/sample_small.json" << 'EOF'
{
  "teachers": [
    {"id": "t1", "name": "Teacher A"},
    {"id": "t2", "name": "Teacher B"}
  ],
  "rooms": [
    {"id": "r1", "name": "Room 101", "capacity": 40, "type": "lecture"}
  ],
  "subjects": [
    {"id": "s1", "name": "Mathematics", "weekly_hours": 4},
    {"id": "s2", "name": "Physics", "weekly_hours": 3}
  ],
  "sections": [
    {"id": "sec1", "name": "Grade 9-A", "size": 30}
  ],
  "slots": [
    {"id": "mon-1", "day": "Mon", "period": 1},
    {"id": "mon-2", "day": "Mon", "period": 2},
    {"id": "tue-1", "day": "Tue", "period": 1},
    {"id": "tue-2", "day": "Tue", "period": 2}
  ],
  "constraints": []
}
EOF

cat > "${PROJECT_ROOT}/backend/app/workers/worker.py" << 'EOF'
"""
SlotForge solver worker entrypoint.

Runs as an independent process from the API (Phase 3).
Listens on the Redis queue, picks up generate jobs, calls into
app.solver, writes results back.

Run locally with:
    rq worker --url redis://localhost:6379/0 slotforge-generate
"""

# Placeholder — actual job function gets registered here in Phase 3.
# from app.solver.engine import solve_timetable
#
# def generate_job(payload: dict) -> dict:
#     return solve_timetable(payload)
EOF

echo "  -> solver/fixtures/sample_small.json"
echo "  -> app/workers/worker.py (stub)"

# ---------------------------------------------------------------------------
# 8. README placeholders + frontend note
# ---------------------------------------------------------------------------
echo ""
echo "[7/7] Writing placeholder docs..."

cat > "${PROJECT_ROOT}/frontend/README.md" << 'EOF'
# frontend — placeholder

This directory is intentionally empty until Phase 6 of ROADMAP.md.

Backend-first build order: solver core -> API -> async jobs -> Supabase -> THEN frontend.

When Phase 6 starts, scaffold here with:
    npm create vite@latest . -- --template react-ts
    npm install @mui/joy @emotion/react @emotion/styled
EOF

cat > "${PROJECT_ROOT}/docs/.gitkeep" << 'EOF'
EOF



echo ""
echo "=================================================="
echo " Done. Structure created at: ${PROJECT_ROOT}"
echo "=================================================="
echo ""
echo "Next steps:"
echo "  1. cd backend && source .venv/bin/activate"
echo "  2. docker compose up -d          # starts local Redis"
echo "  3. uvicorn app.main:app --reload --port 8000"
echo "  4. curl http://localhost:8000/health"
echo ""
echo "Then start on Phase 1 (solver core) per ROADMAP.md —"
echo "build and test backend/app/solver/ standalone before touching the API."
echo "=================================================="
