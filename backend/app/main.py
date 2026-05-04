from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from app.config import get_settings
from app.database.db import init_db
from app.routers import health, usecases, documents, rag, agent, evaluation, reports, benchmarks
from app.routers import settings as settings_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    os.makedirs(settings.upload_dir, exist_ok=True)
    os.makedirs(settings.vector_store_dir, exist_ok=True)
    yield


app = FastAPI(
    title="Agentic RAG Solution Studio",
    description="A solution-architect workbench for designing, tuning, and evaluating enterprise GenAI POCs.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routers
app.include_router(health.router)
app.include_router(usecases.router)
app.include_router(documents.router)
app.include_router(rag.router)
app.include_router(agent.router)
app.include_router(evaluation.router)
app.include_router(reports.router)
app.include_router(benchmarks.router)
app.include_router(settings_router.router)

# Serve frontend static files (optional — frontend can be opened directly)
frontend_dir = os.path.join(os.path.dirname(__file__), "..", "..", "Agentic RAG Solution Studio - frontend")
if os.path.isdir(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
