from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class RagConfigInline(BaseModel):
    top_k: int = 5
    reranking: bool = False
    citation_required: bool = True


class AgentAskRequest(BaseModel):
    usecase_id: str
    question: str
    rag_config: Optional[RagConfigInline] = None
    provider: str = "openai"


class Citation(BaseModel):
    filename: str
    section: Optional[str] = None
    chunk_id: Optional[str] = None


class TraceStep(BaseModel):
    node: str
    status: str
    detail: Optional[str] = None
    latency_ms: Optional[int] = None


class AgentMetrics(BaseModel):
    latency_ms: int
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
    estimated_cost_usd: Optional[float] = None


class AgentAskResponse(BaseModel):
    run_id: str
    answer: str
    citations: list[Citation]
    risk_level: str
    agent_trace: list[TraceStep]
    metrics: AgentMetrics


class AgentRunResponse(BaseModel):
    id: str
    question: str
    risk_level: Optional[str]
    status: str
    latency_ms: Optional[int]
    created_at: datetime

    model_config = {"from_attributes": True}
