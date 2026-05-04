# Evaluation Specification

## 1. Objective

Evaluate the quality, reliability, latency, and cost of RAG + agentic answers.

## 2. Why Evaluation Matters

A RAG system is not production-ready only because it answers questions. It must be measured for:

- retrieval quality
- answer grounding
- hallucination risk
- relevance
- latency
- token usage
- cost
- failure cases

## 3. Golden Question Dataset

Each use case should support a small golden dataset.

Example:
```json
{
  "question": "What is the standard refund window?",
  "expected_answer": "Standard refunds are allowed within 30 days.",
  "expected_sources": ["refund_policy.pdf"],
  "tags": ["refund", "policy"]
}
```

## 4. Metrics

### Retrieval Relevance
Measures whether retrieved chunks are relevant to the question.

MVP implementation:
- LLM judge score from 0 to 1
- or keyword/source matching for simple version

### Context Precision
How many retrieved chunks are actually useful.

### Answer Relevance
Measures whether the generated answer addresses the question.

### Faithfulness
Measures whether the answer is supported by retrieved context.

### Hallucination Risk
Classify as:
- low
- medium
- high

### Latency
Total response time in milliseconds.

### Token Usage
Track input tokens and output tokens if provider supports it.

### Estimated Cost
Estimate cost based on provider pricing config.

## 5. Evaluation Output

```json
{
  "question": "What is the refund window?",
  "answer": "Standard refunds are allowed within 30 days.",
  "context_relevance": 0.84,
  "answer_relevance": 0.88,
  "faithfulness": 0.91,
  "hallucination_risk": "low",
  "latency_ms": 2100,
  "estimated_cost_usd": 0.004,
  "status": "pass"
}
```

## 6. Evaluation Dashboard

Show:
- average faithfulness
- average answer relevance
- average context relevance
- average latency
- total estimated cost
- pass/fail count
- failed cases table

## 7. Failed Case Analysis

Failed case table:

| Question | Failure Type | Suggested Fix |
|---|---|---|
| Refund after international delivery? | Missing context | Upload international refund policy |
| Can agent approve refund? | Ambiguous answer | Add escalation SOP |

## 8. Acceptance Criteria

Evaluation module is complete when:

- User can add at least five golden questions.
- System runs agent workflow for each question.
- Metrics are stored.
- Dashboard displays averages and failed cases.
- Report includes evaluation summary.

## 9. Future Enhancements

- RAGAS integration
- DeepEval integration
- Prompt version comparison
- A/B test runs
- Regression testing for RAG changes
- Synthetic question generation
