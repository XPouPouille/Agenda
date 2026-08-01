import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, SessionLocal, engine
from .routers import competitions, disciplines, google_calendar
from .seed import seed_disciplines

app = FastAPI(title="Agenda Compétitions", version="0.0.1")

cors_origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_disciplines(db)
    finally:
        db.close()


app.include_router(disciplines.router)
app.include_router(competitions.router)
app.include_router(google_calendar.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
