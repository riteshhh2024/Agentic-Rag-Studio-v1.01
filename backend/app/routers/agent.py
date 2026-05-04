from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.schemas.agent import AgentAskRequest, AgentAskResponse, AgentRunResponse
from app.services.agent_service import AgentService

router = APIRouter(prefix="/agent", tags=["agent"])


@router.post("/ask", response_model=AgentAskResponse)
async def ask(payload: AgentAskRequest, db: Session = Depends(get_db)):
    service = AgentService(db)
    return await service.run(payload)


@router.get("/runs/{usecase_id}", response_model=list[AgentRunResponse])
async def list_runs(usecase_id: str, db: Session = Depends(get_db)):
    service = AgentService(db)
    return service.list_runs(usecase_id)


@router.get("/runs/{usecase_id}/{run_id}", response_model=AgentAskResponse)
async def get_run(usecase_id: str, run_id: str, db: Session = Depends(get_db)):
    service = AgentService(db)
    run = service.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return run
