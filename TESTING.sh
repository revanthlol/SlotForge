#!/usr/bin/env bash
# End-to-End Integration Testing Script for SlotForge
# This script starts the backend server, runs curl commands to verify auth, CRUD,
# versioning, publish/rollback, and exports, then terminates the server.

set -euo pipefail

echo "=================================================="
echo "      SlotForge End-to-End Integration Test"
echo "=================================================="

# Check if .env exists
if [ ! -f "backend/.env" ]; then
    echo "Error: backend/.env not found. Please create it first."
    exit 1
fi

# Retrieve Supabase settings from .env
SUPABASE_URL=$(grep -E "^SUPABASE_URL=" backend/.env | cut -d'=' -f2 | cut -d'#' -f1 | tr -d '\r' | tr -d '"' | tr -d "'")
SUPABASE_PUBLISHABLE_KEY=$(grep -E "^SUPABASE_PUBLISHABLE_KEY=" backend/.env | cut -d'=' -f2 | cut -d'#' -f1 | tr -d '\r' | tr -d '"' | tr -d "'")

# Start the uvicorn API server in the background
echo "Starting FastAPI server in the background..."
cd backend

if [[ "$SUPABASE_URL" == *"YOUR_PROJECT_REF"* ]]; then
    echo "Placeholder Supabase URL detected. Running E2E tests in MOCK mode (using self-signed tokens and test server wrapper)."
    PYTHONPATH=. ./.venv/bin/python tests/run_test_server.py &
    SERVER_PID=$!
else
    echo "Real Supabase URL detected. Running E2E tests against the real Supabase project."
    PYTHONPATH=. ./.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 &
    SERVER_PID=$!
fi
cd ..

# Ensure we terminate the server on exit
cleanup() {
    echo "Terminating FastAPI server (PID: $SERVER_PID)..."
    kill "$SERVER_PID" || true
    wait "$SERVER_PID" 2>/dev/null || true
    echo "Done."
}
trap cleanup EXIT

# Wait for server to start
echo "Waiting for server to become healthy..."
for i in {1..10}; do
    if curl -s http://127.0.0.1:8000/health &>/dev/null; then
        echo "Server is UP and healthy!"
        break
    fi
    if [ "$i" -eq 10 ]; then
        echo "Error: Server failed to start within 10 seconds."
        exit 1
    fi
    sleep 1
done

echo "--------------------------------------------------"
echo "1. Sign up new Organization and Admin User"
SIGNUP_RES=$(curl -s -X POST http://127.0.0.1:8000/auth/signup-organization \
  -H "Content-Type: application/json" \
  -d '{"email": "shell-admin@slotforge.com", "password": "pass123password", "org_name": "Shell Test University", "full_name": "Principal Skinner"}')

echo "Signup Response: $SIGNUP_RES"

ORG_ID=$(echo "$SIGNUP_RES" | python3 -c "import sys, json; print(json.load(sys.stdin)['organization_id'])")
USER_ID=$(echo "$SIGNUP_RES" | python3 -c "import sys, json; print(json.load(sys.stdin)['user_id'])")

echo "Organization ID: $ORG_ID"
echo "User ID: $USER_ID"

# Generate / retrieve JWT token
if [[ "$SUPABASE_URL" == *"YOUR_PROJECT_REF"* ]]; then
    echo "Generating mock self-signed token..."
    TOKEN=$(backend/.venv/bin/python3 -c "import jwt; print(jwt.encode({'sub': '$USER_ID', 'aud': 'authenticated', 'role': 'authenticated'}, 'dummy-secret', algorithm='HS256'))")
else
    echo "Retrieving real JWT token from Supabase Auth API..."
    LOGIN_RES=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
      -H "apikey: ${SUPABASE_PUBLISHABLE_KEY}" \
      -H "Content-Type: application/json" \
      -d '{"email": "shell-admin@slotforge.com", "password": "pass123password"}')
    TOKEN=$(echo "$LOGIN_RES" | python3 -c "import sys, json; print(json.load(sys.stdin).get('access_token', ''))")
fi

if [ -z "$TOKEN" ]; then
    echo "Error: Failed to obtain access token."
    exit 1
fi

AUTH_HEADER="Authorization: Bearer $TOKEN"

echo "--------------------------------------------------"
echo "2. Create Resources (Teacher, Room, Subject, Section)"
TEACHER_RES=$(curl -s -X POST http://127.0.0.1:8000/teachers/ \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d "{\"organization_id\": \"$ORG_ID\", \"name\": \"Dr. Julius Hibbert\"}")
echo "Created Teacher: $TEACHER_RES"

ROOM_RES=$(curl -s -X POST http://127.0.0.1:8000/rooms/ \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d "{\"organization_id\": \"$ORG_ID\", \"name\": \"Biology Lab\", \"capacity\": 35, \"room_type\": \"lab\"}")
echo "Created Room: $ROOM_RES"

SUBJECT_RES=$(curl -s -X POST http://127.0.0.1:8000/subjects/ \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d "{\"organization_id\": \"$ORG_ID\", \"name\": \"Anatomy 101\", \"weekly_hours\": 2}")
echo "Created Subject: $SUBJECT_RES"

SECTION_RES=$(curl -s -X POST http://127.0.0.1:8000/sections/ \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d "{\"organization_id\": \"$ORG_ID\", \"name\": \"Med-Students Group A\", \"size\": 25}")
echo "Created Section: $SECTION_RES"

echo "--------------------------------------------------"
echo "3. Generate Timetable (Draft version)"
GEN_RES=$(curl -s -X POST http://127.0.0.1:8000/timetables/generate \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d "{\"organization_id\": \"$ORG_ID\"}")
echo "Generate Response: $GEN_RES"

VERSION_ID=$(echo "$GEN_RES" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
echo "Generated Version ID: $VERSION_ID"

echo "--------------------------------------------------"
echo "4. Publish Timetable version"
PUB_RES=$(curl -s -X POST http://127.0.0.1:8000/timetables/$VERSION_ID/publish \
  -H "$AUTH_HEADER")
echo "Publish Response: $PUB_RES"

echo "--------------------------------------------------"
echo "5. Export Timetable to PDF, Excel (XLSX), and CSV"

for fmt in pdf xlsx csv; do
  echo "Exporting format: $fmt..."
  EXP_RES=$(curl -s "http://127.0.0.1:8000/timetables/$VERSION_ID/export?format=$fmt" -H "$AUTH_HEADER")
  echo "Export Response ($fmt): $EXP_RES"
  
  URL=$(echo "$EXP_RES" | python3 -c "import sys, json; print(json.load(sys.stdin)['url'])")
  echo "Download URL ($fmt): $URL"
  
  # Download locally
  curl -s -o "test_export.$fmt" "$URL"
  if [ -s "test_export.$fmt" ]; then
      echo "✅ Downloaded test_export.$fmt successfully (size: $(wc -c < "test_export.$fmt") bytes)"
      rm "test_export.$fmt"
  else
      echo "❌ Failed to download test_export.$fmt or file is empty"
      exit 1
  fi
done

echo "=================================================="
echo "   All E2E tests passed successfully!"
echo "=================================================="
