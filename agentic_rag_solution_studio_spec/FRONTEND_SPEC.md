# Frontend Specification

## 1. Frontend Goal

The frontend should feel like a Solution Architect Studio, not a simple chatbot.

It should help users move through the full GenAI POC lifecycle:

```text
Create Use Case -> Upload Documents -> Configure RAG -> Chat with Agent -> Evaluate -> Compare Providers -> Generate Report
```

## 2. MVP Frontend Recommendation

Use Streamlit for MVP because it is fast to build and good for AI demos.

Future upgrade:
- React + FastAPI for portfolio-grade UI

## 3. Screen 1: Home / Use Case List

Purpose:
- Show existing use cases.
- Create new use case.

Components:
- Project title
- Create Use Case button
- Use case cards/table
- Status badges

## 4. Screen 2: Use Case Intake

Fields:
- customer/demo name
- industry
- business problem
- target users
- document types
- success criteria
- answer style

Example answer styles:
- concise
- detailed
- support-agent
- legal-review
- technical-runbook

## 5. Screen 3: Document Upload

Components:
- file uploader
- document table
- status indicator
- process/index button

Document table:

| Document | Type | Chunks | Status |
|---|---|---:|---|
| refund_policy.pdf | PDF | 42 | Indexed |

## 6. Screen 4: RAG Configuration

Controls:
- chunk size
- chunk overlap
- top-k
- vector store
- reranking toggle
- citation required toggle
- answer style

Show current configuration as JSON preview.

## 7. Screen 5: Agentic Chat Workspace

Layout:

Left panel:
- user question input
- final answer
- citations
- risk level

Right panel:
- agent trace
- retrieved chunks
- metrics

Example trace:
```text
Intent Analyzer: completed
Retriever: retrieved 5 chunks
Answer Generator: completed
Grounding Verifier: passed
Risk Classifier: medium
```

## 8. Screen 6: Evaluation Dashboard

Components:
- add golden question form
- run evaluation button
- metric cards
- failed cases table

Metric cards:
- faithfulness
- answer relevance
- retrieval relevance
- latency
- estimated cost

## 9. Screen 7: Inference Comparison

Components:
- provider selector
- benchmark table
- latency/cost chart

Providers:
- OpenAI-compatible
- Ollama/local optional
- NIM-compatible adapter placeholder

## 10. Screen 8: Report Generator

Components:
- report options
- generate report button
- preview report
- download markdown

Report sections:
- business problem
- architecture
- documents
- RAG config
- agent workflow
- evaluation metrics
- provider comparison
- risks and next steps

## 11. UI Acceptance Criteria

MVP frontend is complete when:

- User can create a use case.
- User can upload documents.
- User can configure RAG.
- User can ask an agentic question.
- User can view answer, citations, trace, and metrics.
- User can run evaluation.
- User can generate report.
