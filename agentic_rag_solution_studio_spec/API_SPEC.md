# API Specification

Base URL for MVP: `http://localhost:8000`

## 1. Health

### GET `/health`
Returns backend health.

Response:
```json
{
  "status": "ok",
  "service": "agentic-rag-solution-studio"
}
```

## 2. Use Cases

### POST `/usecases`
Create a new customer/demo use case.

Request:
```json
{
  "name": "Acme Support Knowledge Assistant",
  "industry": "SaaS",
  "business_problem": "Support agents spend too much time searching policy documents.",
  "target_users": ["Support Agents", "Team Leads"],
  "document_types": ["FAQ", "Policy", "Troubleshooting Guide"],
  "success_criteria": ["Citations required", "Latency under 3 seconds", "Low hallucination risk"],
  "answer_style": "support-agent"
}
```

Response:
```json
{
  "usecase_id": "uc_001",
  "status": "created"
}
```

### GET `/usecases`
List use cases.

### GET `/usecases/{usecase_id}`
Get use case details.

## 3. Documents

### POST `/documents/upload`
Upload a document for a use case.

Form Data:
- `usecase_id`
- `file`

Response:
```json
{
  "document_id": "doc_001",
  "filename": "refund_policy.pdf",
  "status": "uploaded"
}
```

### POST `/documents/{document_id}/process`
Parse and chunk a document.

Response:
```json
{
  "document_id": "doc_001",
  "chunks_created": 42,
  "status": "processed"
}
```

### GET `/documents?usecase_id=uc_001`
List documents for a use case.

## 4. RAG

### POST `/rag/index`
Create or refresh vector index for a use case.

Request:
```json
{
  "usecase_id": "uc_001",
  "embedding_provider": "openai",
  "vector_store": "faiss"
}
```

Response:
```json
{
  "usecase_id": "uc_001",
  "indexed_chunks": 147,
  "status": "indexed"
}
```

### POST `/rag/retrieve`
Retrieve chunks for a query.

Request:
```json
{
  "usecase_id": "uc_001",
  "query": "What is the refund policy for damaged delivery?",
  "top_k": 5,
  "metadata_filter": null
}
```

Response:
```json
{
  "query": "What is the refund policy for damaged delivery?",
  "chunks": [
    {
      "chunk_id": "chk_001",
      "document_id": "doc_001",
      "filename": "refund_policy.pdf",
      "score": 0.84,
      "text_preview": "Damaged delivery claims after 30 days require escalation..."
    }
  ]
}
```

## 5. Agent

### POST `/agent/ask`
Run a question through the controlled agent workflow.

Request:
```json
{
  "usecase_id": "uc_001",
  "question": "A customer wants a refund after 45 days because the product arrived damaged. What should the support agent do?",
  "rag_config": {
    "top_k": 5,
    "reranking": false,
    "citation_required": true
  },
  "provider": "openai"
}
```

Response:
```json
{
  "run_id": "run_001",
  "answer": "The agent should follow the damaged-shipment exception workflow and escalate for approval...",
  "citations": [
    {
      "filename": "refund_policy.pdf",
      "section": "Damaged Shipment Exception",
      "chunk_id": "chk_001"
    }
  ],
  "risk_level": "medium",
  "agent_trace": [
    {"node": "intent_analyzer", "status": "completed"},
    {"node": "retriever", "status": "completed", "chunks": 5},
    {"node": "answer_generator", "status": "completed"},
    {"node": "grounding_verifier", "status": "passed"},
    {"node": "risk_classifier", "status": "medium"}
  ],
  "metrics": {
    "latency_ms": 2400,
    "input_tokens": 1520,
    "output_tokens": 280,
    "estimated_cost_usd": 0.006
  }
}
```

## 6. Evaluation

### POST `/evaluation/golden-questions`
Create golden questions for a use case.

Request:
```json
{
  "usecase_id": "uc_001",
  "questions": [
    {
      "question": "What is the refund window?",
      "expected_answer": "Standard refunds are allowed within 30 days.",
      "expected_sources": ["refund_policy.pdf"]
    }
  ]
}
```

### POST `/evaluation/run`
Run evaluation.

Request:
```json
{
  "usecase_id": "uc_001",
  "provider": "openai",
  "rag_config": {
    "top_k": 5,
    "chunk_size": 800
  }
}
```

Response:
```json
{
  "evaluation_id": "eval_001",
  "total_questions": 5,
  "average_faithfulness": 0.87,
  "average_answer_relevance": 0.84,
  "average_latency_ms": 2300,
  "status": "completed"
}
```

### GET `/evaluation/{evaluation_id}`
Get evaluation details.

## 7. Reports

### POST `/reports/generate`
Generate POC report.

Request:
```json
{
  "usecase_id": "uc_001",
  "include_evaluation": true,
  "include_architecture": true,
  "format": "markdown"
}
```

Response:
```json
{
  "report_id": "rep_001",
  "status": "generated",
  "download_url": "/reports/rep_001/download"
}
```

### GET `/reports/{report_id}`
Get report metadata.

### GET `/reports/{report_id}/download`
Download report.
