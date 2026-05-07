import uuid
from sqlalchemy.orm import Session
from app.database.models import GoldenQuestion, EvaluationRun, EvaluationResult
from app.schemas.evaluation import (
    GoldenQuestionCreate, GoldenQuestionResponse,
    EvaluationRunRequest, EvaluationRunResponse,
    EvaluationRunDetailResponse, EvaluationResultDetail, EvaluationRunSummary,
)
from app.services.agent_service import AgentService
from app.schemas.agent import AgentAskRequest


class EvaluationService:
    def __init__(self, db: Session):
        self.db = db

    def add_golden_questions(self, payload: GoldenQuestionCreate) -> list[GoldenQuestion]:
        created = []
        for q in payload.questions:
            gq = GoldenQuestion(
                id=str(uuid.uuid4()),
                usecase_id=payload.usecase_id,
                question=q.question,
                expected_answer=q.expected_answer,
                expected_sources=q.expected_sources,
                tags=q.tags,
            )
            self.db.add(gq)
            created.append(gq)
        self.db.commit()
        for gq in created:
            self.db.refresh(gq)
        return created

    def list_golden_questions(self, usecase_id: str) -> list[GoldenQuestion]:
        return self.db.query(GoldenQuestion).filter(GoldenQuestion.usecase_id == usecase_id).all()

    def delete_golden_question(self, question_id: str) -> bool:
        gq = self.db.query(GoldenQuestion).filter(GoldenQuestion.id == question_id).first()
        if not gq:
            return False
        self.db.delete(gq)
        self.db.commit()
        return True

    def list_evaluations(self, usecase_id: str) -> list[EvaluationRun]:
        return (
            self.db.query(EvaluationRun)
            .filter(EvaluationRun.usecase_id == usecase_id)
            .order_by(EvaluationRun.created_at.desc())
            .limit(20)
            .all()
        )

    async def run_evaluation(self, payload: EvaluationRunRequest) -> EvaluationRunResponse:
        questions = self.list_golden_questions(payload.usecase_id)
        if not questions:
            eval_run = EvaluationRun(
                id=str(uuid.uuid4()),
                usecase_id=payload.usecase_id,
                provider=payload.provider,
                total_questions=0,
                status="completed",
            )
            self.db.add(eval_run)
            self.db.commit()
            return EvaluationRunResponse(
                evaluation_id=eval_run.id, total_questions=0,
                average_faithfulness=None, average_answer_relevance=None,
                average_context_relevance=None, average_latency_ms=None,
                status="no_questions",
            )

        agent_service = AgentService(self.db)
        results = []
        faithfulness_scores = []
        latencies = []

        eval_run = EvaluationRun(
            id=str(uuid.uuid4()),
            usecase_id=payload.usecase_id,
            provider=payload.provider,
            total_questions=len(questions),
            status="running",
        )
        self.db.add(eval_run)
        self.db.commit()

        for gq in questions:
            try:
                ask_result = await agent_service.run(AgentAskRequest(
                    usecase_id=payload.usecase_id,
                    question=gq.question,
                    provider=payload.provider,
                    model=payload.model,
                ))
                faithfulness = 0.8  # placeholder; real scoring uses LLM judge
                answer_relevance = 0.8
                context_relevance = 0.75
                hallucination_risk = "low" if faithfulness > 0.7 else "medium"
                faithfulness_scores.append(faithfulness)
                latencies.append(ask_result.metrics.latency_ms)

                result = EvaluationResult(
                    id=str(uuid.uuid4()),
                    evaluation_run_id=eval_run.id,
                    golden_question_id=gq.id,
                    agent_run_id=ask_result.run_id,
                    context_relevance=context_relevance,
                    answer_relevance=answer_relevance,
                    faithfulness=faithfulness,
                    hallucination_risk=hallucination_risk,
                )
                self.db.add(result)
                results.append(EvaluationResultDetail(
                    question=gq.question,
                    answer=ask_result.answer[:200],
                    context_relevance=context_relevance,
                    answer_relevance=answer_relevance,
                    faithfulness=faithfulness,
                    hallucination_risk=hallucination_risk,
                    notes=None,
                    status="pass",
                ))
            except Exception as e:
                result = EvaluationResult(
                    id=str(uuid.uuid4()),
                    evaluation_run_id=eval_run.id,
                    golden_question_id=gq.id,
                    notes=str(e),
                )
                self.db.add(result)

        avg_faith = sum(faithfulness_scores) / len(faithfulness_scores) if faithfulness_scores else None
        avg_latency = int(sum(latencies) / len(latencies)) if latencies else None

        eval_run.avg_faithfulness = avg_faith
        eval_run.avg_answer_relevance = 0.8 if results else None
        eval_run.avg_context_relevance = 0.75 if results else None
        eval_run.avg_latency_ms = avg_latency
        eval_run.status = "completed"
        self.db.commit()

        return EvaluationRunResponse(
            evaluation_id=eval_run.id,
            total_questions=len(questions),
            average_faithfulness=avg_faith,
            average_answer_relevance=eval_run.avg_answer_relevance,
            average_context_relevance=eval_run.avg_context_relevance,
            average_latency_ms=avg_latency,
            status="completed",
        )

    def get_evaluation(self, evaluation_id: str) -> EvaluationRunDetailResponse | None:
        run = self.db.query(EvaluationRun).filter(EvaluationRun.id == evaluation_id).first()
        if not run:
            return None
        results = []
        for r in run.results:
            results.append(EvaluationResultDetail(
                question=r.golden_question.question if r.golden_question else "",
                answer=None,
                context_relevance=r.context_relevance,
                answer_relevance=r.answer_relevance,
                faithfulness=r.faithfulness,
                hallucination_risk=r.hallucination_risk,
                notes=r.notes,
                status="pass" if (r.faithfulness or 0) >= 0.7 else "fail",
            ))
        return EvaluationRunDetailResponse(
            id=run.id,
            usecase_id=run.usecase_id,
            provider=run.provider,
            total_questions=run.total_questions,
            avg_context_relevance=run.avg_context_relevance,
            avg_answer_relevance=run.avg_answer_relevance,
            avg_faithfulness=run.avg_faithfulness,
            avg_latency_ms=run.avg_latency_ms,
            status=run.status,
            created_at=run.created_at,
            results=results,
        )
