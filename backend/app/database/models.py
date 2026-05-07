import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Integer, Float, Boolean,
    DateTime, ForeignKey, JSON
)
from sqlalchemy.orm import relationship
from app.database.db import Base


def gen_id():
    return str(uuid.uuid4())


class AppSetting(Base):
    __tablename__ = "app_settings"
    key   = Column(String, primary_key=True)
    value = Column(Text, nullable=False)


class User(Base):
    __tablename__ = "users"

    id           = Column(String, primary_key=True, default=gen_id)
    studio_id    = Column(String, unique=True, nullable=False)
    password     = Column(String, nullable=False)
    display_name = Column(String, nullable=False, default="")
    role         = Column(String, default="admin")
    created_at   = Column(DateTime, default=datetime.utcnow)


class UseCase(Base):
    __tablename__ = "use_cases"

    id = Column(String, primary_key=True, default=gen_id)
    name = Column(String, nullable=False)
    industry = Column(String, nullable=True)
    business_problem = Column(Text, nullable=False)
    target_users = Column(JSON, default=list)
    document_types = Column(JSON, default=list)
    success_criteria = Column(JSON, default=list)
    answer_style = Column(String, default="concise")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    documents = relationship("Document", back_populates="usecase", cascade="all, delete-orphan")
    rag_configs = relationship("RagConfig", back_populates="usecase", cascade="all, delete-orphan")
    agent_runs = relationship("AgentRun", back_populates="usecase", cascade="all, delete-orphan")
    golden_questions = relationship("GoldenQuestion", back_populates="usecase", cascade="all, delete-orphan")
    evaluation_runs = relationship("EvaluationRun", back_populates="usecase", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="usecase", cascade="all, delete-orphan")


class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, default=gen_id)
    usecase_id = Column(String, ForeignKey("use_cases.id"), nullable=False)
    filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    status = Column(String, default="uploaded")
    text_length = Column(Integer, default=0)
    chunk_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    usecase = relationship("UseCase", back_populates="documents")
    chunks = relationship("Chunk", back_populates="document", cascade="all, delete-orphan")


class Chunk(Base):
    __tablename__ = "chunks"

    id = Column(String, primary_key=True, default=gen_id)
    document_id = Column(String, ForeignKey("documents.id"), nullable=False)
    usecase_id = Column(String, nullable=False)
    chunk_index = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    metadata_ = Column("metadata", JSON, default=dict)
    vector_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="chunks")


class RagConfig(Base):
    __tablename__ = "rag_configs"

    id = Column(String, primary_key=True, default=gen_id)
    usecase_id = Column(String, ForeignKey("use_cases.id"), nullable=False)
    chunk_size = Column(Integer, default=800)
    chunk_overlap = Column(Integer, default=120)
    top_k = Column(Integer, default=5)
    retrieval_mode = Column(String, default="vector")
    reranking = Column(Boolean, default=False)
    citation_required = Column(Boolean, default=True)
    embedding_provider = Column(String, default="openai")
    created_at = Column(DateTime, default=datetime.utcnow)

    usecase = relationship("UseCase", back_populates="rag_configs")


class AgentRun(Base):
    __tablename__ = "agent_runs"

    id = Column(String, primary_key=True, default=gen_id)
    usecase_id = Column(String, ForeignKey("use_cases.id"), nullable=False)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=True)
    provider = Column(String, default="openai")
    risk_level = Column(String, nullable=True)
    status = Column(String, default="pending")
    latency_ms = Column(Integer, nullable=True)
    input_tokens = Column(Integer, nullable=True)
    output_tokens = Column(Integer, nullable=True)
    estimated_cost_usd = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    usecase = relationship("UseCase", back_populates="agent_runs")
    trace_steps = relationship("AgentTraceStep", back_populates="run", cascade="all, delete-orphan")
    retrieved_chunks = relationship("RetrievedChunk", back_populates="run", cascade="all, delete-orphan")


class AgentTraceStep(Base):
    __tablename__ = "agent_trace_steps"

    id = Column(String, primary_key=True, default=gen_id)
    run_id = Column(String, ForeignKey("agent_runs.id"), nullable=False)
    node_name = Column(String, nullable=False)
    status = Column(String, default="completed")
    input_summary = Column(Text, nullable=True)
    output_summary = Column(Text, nullable=True)
    latency_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    run = relationship("AgentRun", back_populates="trace_steps")


class RetrievedChunk(Base):
    __tablename__ = "retrieved_chunks"

    id = Column(String, primary_key=True, default=gen_id)
    run_id = Column(String, ForeignKey("agent_runs.id"), nullable=False)
    chunk_id = Column(String, ForeignKey("chunks.id"), nullable=True)
    score = Column(Float, nullable=True)
    rank = Column(Integer, nullable=True)

    run = relationship("AgentRun", back_populates="retrieved_chunks")


class GoldenQuestion(Base):
    __tablename__ = "golden_questions"

    id = Column(String, primary_key=True, default=gen_id)
    usecase_id = Column(String, ForeignKey("use_cases.id"), nullable=False)
    question = Column(Text, nullable=False)
    expected_answer = Column(Text, nullable=True)
    expected_sources = Column(JSON, default=list)
    tags = Column(JSON, default=list)

    usecase = relationship("UseCase", back_populates="golden_questions")
    evaluation_results = relationship("EvaluationResult", back_populates="golden_question")


class EvaluationRun(Base):
    __tablename__ = "evaluation_runs"

    id = Column(String, primary_key=True, default=gen_id)
    usecase_id = Column(String, ForeignKey("use_cases.id"), nullable=False)
    provider = Column(String, nullable=False)
    rag_config_id = Column(String, nullable=True)
    total_questions = Column(Integer, default=0)
    avg_context_relevance = Column(Float, nullable=True)
    avg_answer_relevance = Column(Float, nullable=True)
    avg_faithfulness = Column(Float, nullable=True)
    avg_latency_ms = Column(Integer, nullable=True)
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)

    usecase = relationship("UseCase", back_populates="evaluation_runs")
    results = relationship("EvaluationResult", back_populates="evaluation_run", cascade="all, delete-orphan")


class EvaluationResult(Base):
    __tablename__ = "evaluation_results"

    id = Column(String, primary_key=True, default=gen_id)
    evaluation_run_id = Column(String, ForeignKey("evaluation_runs.id"), nullable=False)
    golden_question_id = Column(String, ForeignKey("golden_questions.id"), nullable=False)
    agent_run_id = Column(String, ForeignKey("agent_runs.id"), nullable=True)
    context_relevance = Column(Float, nullable=True)
    answer_relevance = Column(Float, nullable=True)
    faithfulness = Column(Float, nullable=True)
    hallucination_risk = Column(String, nullable=True)
    notes = Column(Text, nullable=True)

    evaluation_run = relationship("EvaluationRun", back_populates="results")
    golden_question = relationship("GoldenQuestion", back_populates="evaluation_results")


class Report(Base):
    __tablename__ = "reports"

    id = Column(String, primary_key=True, default=gen_id)
    usecase_id = Column(String, ForeignKey("use_cases.id"), nullable=False)
    title = Column(String, nullable=False)
    format = Column(String, default="markdown")
    file_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    usecase = relationship("UseCase", back_populates="reports")
