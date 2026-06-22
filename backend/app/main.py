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
from app.api.routes import auth, organizations, teachers, rooms, subjects, sections, constraints, timetables

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(organizations.router, prefix="/organizations", tags=["organizations"])
app.include_router(teachers.router, prefix="/teachers", tags=["teachers"])
app.include_router(rooms.router, prefix="/rooms", tags=["rooms"])
app.include_router(subjects.router, prefix="/subjects", tags=["subjects"])
app.include_router(sections.router, prefix="/sections", tags=["sections"])
app.include_router(constraints.router, prefix="/constraints", tags=["constraints"])
app.include_router(timetables.router, prefix="/timetables", tags=["timetables"])

