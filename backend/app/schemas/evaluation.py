from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class GoldenQuestionItem(BaseModel):
    question: str
    expected_answer: Optional[str] = None
    expected_sources: list[str] = []
    tags: list[str] = []


class GoldenQuestionCreate(BaseModel):
    usecase_id: str
    questions: list[GoldenQuestionItem]


class GoldenQuestionResponse(BaseModel):
    id: str
    usecase_id: str
    question: str
    expected_answer: Optional[str]
    expected_sources: list[str]
    tags: list[str]

    model_config = {"from_attributes": True}


class EvaluationRunRequest(BaseModel):
    usecase_id: str
    provider: str = "openai"
    rag_config: Optional[dict] = None


class EvaluationRunResponse(BaseModel):
    evaluation_id: str
    total_questions: int
    average_faithfulness: Optional[float]
    average_answer_relevance: Optional[float]
    average_context_relevance: Optional[float]
    average_latency_ms: Optional[int]
    status: str


class EvaluationResultDetail(BaseModel):
    question: str
    answer: Optional[str]
    context_relevance: Optional[float]
    answer_relevance: Optional[float]
    faithfulness: Optional[float]
    hallucination_risk: Optional[str]
    notes: Optional[str]
    status: str


class EvaluationRunDetailResponse(BaseModel):
    id: str
    usecase_id: str
    provider: str
    total_questions: int
    avg_context_relevance: Optional[float]
    avg_answer_relevance: Optional[float]
    avg_faithfulness: Optional[float]
    avg_latency_ms: Optional[int]
    status: str
    created_at: datetime
    results: list[EvaluationResultDetail] = []

    model_config = {"from_attributes": True}


class EvaluationRunSummary(BaseModel):
    id: str
    usecase_id: str
    total_questions: int
    avg_faithfulness: Optional[float]
    avg_answer_relevance: Optional[float]
    avg_latency_ms: Optional[int]
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
