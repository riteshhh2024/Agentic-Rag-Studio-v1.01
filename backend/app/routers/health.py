from fastapi import APIRouter
from datetime import datetime

router = APIRouter(tags=["health"])


@router.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "agentic-rag-solution-studio",
        "version": "0.1.0",
        "timestamp": datetime.utcnow().isoformat(),
    }
