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
