from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.schemas.evaluation import (
    GoldenQuestionCreate, GoldenQuestionResponse,
    EvaluationRunRequest, EvaluationRunResponse,
    EvaluationRunDetailResponse, EvaluationRunSummary,
)
from app.services.evaluation_service import EvaluationService

router = APIRouter(prefix="/evaluation", tags=["evaluation"])


@router.post("/golden-questions", response_model=list[GoldenQuestionResponse], status_code=201)
async def add_golden_questions(payload: GoldenQuestionCreate, db: Session = Depends(get_db)):
    service = EvaluationService(db)
    return service.add_golden_questions(payload)


@router.get("/golden-questions/{usecase_id}", response_model=list[GoldenQuestionResponse])
async def list_golden_questions(usecase_id: str, db: Session = Depends(get_db)):
    service = EvaluationService(db)
    return service.list_golden_questions(usecase_id)


@router.delete("/golden-questions/{question_id}", status_code=204)
async def delete_golden_question(question_id: str, db: Session = Depends(get_db)):
    service = EvaluationService(db)
    ok = service.delete_golden_question(question_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Question not found")


@router.get("/list/{usecase_id}", response_model=list[EvaluationRunSummary])
async def list_evaluations(usecase_id: str, db: Session = Depends(get_db)):
    service = EvaluationService(db)
    return service.list_evaluations(usecase_id)


@router.post("/run", response_model=EvaluationRunResponse)
async def run_evaluation(payload: EvaluationRunRequest, db: Session = Depends(get_db)):
    service = EvaluationService(db)
    return await service.run_evaluation(payload)


@router.get("/{evaluation_id}", response_model=EvaluationRunDetailResponse)
async def get_evaluation(evaluation_id: str, db: Session = Depends(get_db)):
    service = EvaluationService(db)
    result = service.get_evaluation(evaluation_id)
    if not result:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    return result
