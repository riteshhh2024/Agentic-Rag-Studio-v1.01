# Agent Workflow Specification

## 1. Design Principle

The agent should be controlled and observable. Avoid a free-running autonomous agent for MVP. Use a graph-based workflow where each node has a clear responsibility.

## 2. Workflow Overview

```text
User Question
  -> Intent Analyzer
  -> Retriever
  -> Answer Generator
  -> Grounding Verifier
  -> Risk Classifier
  -> Final Responder
  -> Metrics Logger
```

## 3. State Object

Each agent run should maintain a shared state object.

```json
{
  "usecase_id": "uc_001",
  "question": "What is the refund policy?",
  "intent": null,
  "retrieved_chunks": [],
  "draft_answer": null,
  "verification_result": null,
  "risk_level": null,
  "final_answer": null,
  "citations": [],
  "metrics": {},
  "errors": []
}
```

## 4. Node Specifications

### Node 1: Intent Analyzer

Purpose:
- Understand user intent.
- Classify question type.
- Detect if query is informational, procedural, risk-sensitive, or report-generation.

Input:
- user question
- use case metadata

Output:
```json
{
  "intent": "refund_exception_question",
  "question_type": "procedural",
  "requires_citation": true,
  "risk_sensitive": true
}
```

### Node 2: Retriever

Purpose:
- Retrieve relevant document chunks using RAG service.

Input:
- question
- intent
- RAG config

Output:
```json
{
  "retrieved_chunks": [
    {
      "chunk_id": "chk_001",
      "filename": "refund_policy.pdf",
      "score": 0.84,
      "text": "..."
    }
  ]
}
```

### Node 3: Answer Generator

Purpose:
- Generate answer using retrieved context.
- Follow answer style from use case.
- Include citation references.

Rules:
- Do not answer beyond retrieved context unless clearly marked as general guidance.
- If context is insufficient, say what is missing.

Output:
```json
{
  "draft_answer": "Based on the refund policy...",
  "citations": ["refund_policy.pdf#chk_001"]
}
```

### Node 4: Grounding Verifier

Purpose:
- Check whether answer is supported by retrieved chunks.
- Detect possible hallucination.

Output:
```json
{
  "faithfulness_score": 0.88,
  "unsupported_claims": [],
  "status": "passed"
}
```

### Node 5: Risk Classifier

Purpose:
- Classify response risk.
- Add escalation or human approval note if needed.

Risk levels:
- low: informational answer
- medium: business decision or operational action
- high: legal, financial, production, privacy, or destructive action

Output:
```json
{
  "risk_level": "medium",
  "approval_required": true,
  "risk_reason": "Refund exception requires escalation approval."
}
```

### Node 6: Final Responder

Purpose:
- Combine draft answer, citations, verification, and risk note.
- Return final answer to user.

Output:
```json
{
  "final_answer": "...",
  "citations": [],
  "risk_level": "medium",
  "agent_trace": []
}
```

## 5. Failure Handling

### Retrieval Failure
If no chunks are retrieved:
- return: "I could not find enough supporting context."
- suggest documents to upload
- log as retrieval failure

### LLM Failure
If model call fails:
- retry once
- fallback to another provider if configured
- log error

### Verification Failure
If unsupported claims are detected:
- regenerate answer with stricter prompt
- if still failing, return insufficient-context answer

## 6. Use-Case Specific Behavior

### Customer Support
Risk classifier should flag refunds, cancellations, legal promises, and escalations.

### Contract Intelligence
Risk classifier should flag liability, termination, renewal, payment, and compliance-related clauses.

### Technical Documentation Copilot
Risk classifier should flag production restarts, credential changes, destructive commands, and security changes.

## 7. Agent Trace UI

The frontend should show:

```text
Intent Analyzer: completed
Retriever: retrieved 5 chunks
Answer Generator: completed
Grounding Verifier: faithfulness 0.88
Risk Classifier: medium risk
Final Responder: completed
```
