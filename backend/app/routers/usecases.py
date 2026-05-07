from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database.db import get_db
from app.schemas.usecase import UseCaseCreate, UseCaseResponse, UseCaseListResponse
from app.services.usecase_service import UseCaseService

router = APIRouter(prefix="/usecases", tags=["usecases"])


class StageStatus(BaseModel):
    stage: int
    name: str
    done: bool
    detail: str = ""


class ProgressResponse(BaseModel):
    usecase_id: str
    current_stage: int
    stages: list[StageStatus]


@router.post("", response_model=UseCaseResponse, status_code=201)
async def create_usecase(payload: UseCaseCreate, db: Session = Depends(get_db)):
    service = UseCaseService(db)
    return service.create(payload)


@router.get("", response_model=list[UseCaseListResponse])
async def list_usecases(db: Session = Depends(get_db)):
    service = UseCaseService(db)
    return service.list_all()


@router.get("/{usecase_id}", response_model=UseCaseResponse)
async def get_usecase(usecase_id: str, db: Session = Depends(get_db)):
    service = UseCaseService(db)
    uc = service.get(usecase_id)
    if not uc:
        raise HTTPException(status_code=404, detail="Use case not found")
    return uc


@router.put("/{usecase_id}", response_model=UseCaseResponse)
async def update_usecase(usecase_id: str, payload: UseCaseCreate, db: Session = Depends(get_db)):
    service = UseCaseService(db)
    uc = service.update(usecase_id, payload)
    if not uc:
        raise HTTPException(status_code=404, detail="Use case not found")
    return uc


@router.delete("/{usecase_id}", status_code=204)
async def delete_usecase(usecase_id: str, db: Session = Depends(get_db)):
    service = UseCaseService(db)
    ok = service.delete(usecase_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Use case not found")


@router.get("/{usecase_id}/progress", response_model=ProgressResponse)
async def get_usecase_progress(usecase_id: str, db: Session = Depends(get_db)):
    from app.database.models import UseCase, Document, RagConfig, AgentRun, EvaluationRun, Report
    uc = db.query(UseCase).filter(UseCase.id == usecase_id).first()
    if not uc:
        raise HTTPException(status_code=404, detail="Use case not found")

    doc_count     = db.query(Document).filter(Document.usecase_id == usecase_id).count()
    indexed_count = db.query(Document).filter(Document.usecase_id == usecase_id, Document.status == "indexed").count()
    rag_count     = db.query(RagConfig).filter(RagConfig.usecase_id == usecase_id).count()
    run_count     = db.query(AgentRun).filter(AgentRun.usecase_id == usecase_id).count()
    eval_count    = db.query(EvaluationRun).filter(EvaluationRun.usecase_id == usecase_id, EvaluationRun.status == "completed").count()
    report_count  = db.query(Report).filter(Report.usecase_id == usecase_id).count()

    stages = [
        StageStatus(stage=1, name="Use Case Intake",    done=True,              detail=uc.name),
        StageStatus(stage=2, name="Knowledge Upload",   done=indexed_count > 0, detail=f"{indexed_count}/{doc_count} docs indexed"),
        StageStatus(stage=3, name="RAG Configuration",  done=rag_count > 0,     detail=f"{rag_count} config(s) saved"),
        StageStatus(stage=4, name="Agentic Q&A",        done=run_count > 0,     detail=f"{run_count} run(s)"),
        StageStatus(stage=5, name="Evaluation",         done=eval_count > 0,    detail=f"{eval_count} completed eval(s)"),
        StageStatus(stage=6, name="Report",             done=report_count > 0,  detail=f"{report_count} report(s)"),
    ]
    current_stage = max((s.stage for s in stages if s.done), default=0)
    return ProgressResponse(usecase_id=usecase_id, current_stage=current_stage, stages=stages)
