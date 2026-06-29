# SlotForge Testing Guide

This guide describes how to run automated unit and integration tests, as well as how to perform end-to-end manual or automated API verification.

---

## 1. Automated Tests via Pytest

All unit and integration tests can be run using `pytest` inside the virtual environment.

### Prerequisites
Ensure the dependencies are installed and the local database is running:
```bash
cd backend
# Make sure your virtual environment is active
source .venv/bin/activate
```

### Running Tests
Execute the entire test suite:
```bash
PYTHONPATH=. pytest
```

This runs:
- **Unit Tests** (`tests/unit/`): Solves feasible/infeasible instances directly in isolation and verifies scoring algorithms.
- **Integration Tests** (`tests/integration/`): Tests CRUD operations, JWT decoding, organization signup, version progression, publish/rollback, multi-tenancy isolation, and PDF/Excel/CSV exports.

---

## 2. End-to-End Integration Testing Script (`TESTING.sh`)

We provide an automated shell script that spins up the FastAPI application server, executes `curl` requests to verify auth, CRUD, generation, publish/rollback, and exports, then shuts down clean.

### Running the Script
Simply run the following command from the project root:
```bash
./TESTING.sh
```

### What it Verifies
1. **Health check**: Asserts that `GET /health` is healthy.
2. **Signup**: Creates a new organization `Shell Test University` and admin user `Principal Skinner` atomically.
3. **Authentication**: Signs a mock JWT token locally using the JWT Secret from `backend/.env`.
4. **CRUD endpoints**: Creates resources (Teacher, Room, Subject, Section) scoped to the new organization.
5. **Timetable Generation**: Synchronously solves and creates a draft version.
6. **Timetable Publish**: Promotes the draft version to `"published"`.
7. **Timetable Exports**: Requests export URLs for **PDF**, **Excel (XLSX)**, and **CSV**, downloads the generated files using the local static fallback, and validates that they are non-empty.

---

## 3. Manual Testing via interactive OpenAPI documentation

You can interactively call and explore all API routes using Swagger UI.

1. Start the API server:
   ```bash
   cd backend
   PYTHONPATH=. ./.venv/bin/uvicorn app.main:app --reload
   ```
2. Navigate to [http://localhost:8000/docs](http://localhost:8000/docs) in your browser.
3. The page documents all routes for:
   - `auth`: Signup organizations
   - `organizations`: Fetch organization profiles
   - `teachers` / `rooms` / `subjects` / `sections` / `constraints`: REST CRUD resources
   - `timetables`: Generate, list versions, publish, rollback, and export timetables.
