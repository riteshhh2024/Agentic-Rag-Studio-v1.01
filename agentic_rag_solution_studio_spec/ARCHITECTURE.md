# Architecture Overview

## 1. High-Level Architecture

```text
Frontend Studio
    |
    v
FastAPI Backend
    |
    +-- Use Case Service
    +-- Document Ingestion Service
    +-- RAG Service
    +-- Agent Orchestrator
    +-- Evaluation Service
    +-- Inference Provider Service
    +-- Report Generator
    +-- Metrics Logger
    |
    v
Database + Vector Store
```

## 2. Component Responsibilities

### Frontend Studio
Provides the user interface for:
- use case intake
- document upload
- RAG configuration
- agentic chat
- evaluation dashboard
- inference comparison
- report generation

MVP frontend can be Streamlit. Portfolio-grade frontend can be React.

### FastAPI Backend
Acts as the central API layer. It exposes REST endpoints and coordinates business services.

### Use Case Service
Stores business problem definition, customer scenario, target users, success criteria, and selected template.

### Document Ingestion Service
Handles file upload, parsing, cleaning, chunking, embedding, and indexing.

### RAG Service
Handles retrieval from the vector store, optional metadata filtering, source preparation, and context formatting.

### Agent Orchestrator
Runs controlled LangGraph-style workflows:
- intent analyzer
- retriever
- answer generator
- verifier
- risk classifier
- final responder

### Evaluation Service
Runs golden question evaluation and logs quality metrics.

### Inference Provider Service
Abstracts model calls. Supports OpenAI-compatible providers and optional local/Ollama providers. Future-ready for NVIDIA NIM-compatible endpoints.

### Report Generator
Generates customer-ready POC reports in Markdown first, PDF later.

### Metrics Logger
Stores latency, token usage, estimated cost, retrieval count, scores, and run status.

## 3. Data Flow: Document Ingestion

```text
Upload file
  -> parse text
  -> clean text
  -> split into chunks
  -> create embeddings
  -> store chunks in DB
  -> store vectors in FAISS/Chroma
  -> mark document indexed
```

## 4. Data Flow: Agentic Question Answering

```text
User question
  -> intent analysis
  -> retrieve relevant chunks
  -> generate grounded answer
  -> verify answer against retrieved context
  -> classify risk/escalation
  -> produce final answer with citations
  -> log metrics
```

## 5. Data Flow: Evaluation

```text
Golden question set
  -> run each question through agent workflow
  -> compare retrieved context and generated answer
  -> compute evaluation metrics
  -> store results
  -> display dashboard
```

## 6. Recommended MVP Stack

```text
Frontend: Streamlit
Backend: FastAPI
Agent Workflow: LangGraph
RAG: LangChain + FAISS or Chroma
Database: SQLite
Models: OpenAI-compatible API, optional Ollama
Validation: Pydantic
Testing: Pytest
Deployment: Docker Compose
```

## 7. Future Architecture Extensions

- React frontend
- PostgreSQL
- Redis caching
- Celery/RQ background jobs
- S3/Azure Blob file storage
- Kubernetes deployment
- NVIDIA NIM-compatible inference endpoint
- Prompt/version registry
- Multi-tenant organization support
