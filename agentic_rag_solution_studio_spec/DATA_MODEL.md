# Data Model Specification

## 1. Entity Overview

```text
UseCase
  -> Document
      -> Chunk
  -> AgentRun
      -> RetrievedChunk
      -> EvaluationMetric
  -> GoldenQuestion
  -> EvaluationRun
  -> Report
```

## 2. Tables

## use_cases

| Field | Type | Notes |
|---|---|---|
| id | string | primary key |
| name | string | customer/demo name |
| industry | string | optional |
| business_problem | text | problem statement |
| target_users | json | list of target users |
| document_types | json | list |
| success_criteria | json | list |
| answer_style | string | concise/detailed/support/legal/technical |
| created_at | datetime | timestamp |
| updated_at | datetime | timestamp |

## documents

| Field | Type | Notes |
|---|---|---|
| id | string | primary key |
| usecase_id | string | foreign key |
| filename | string | original filename |
| file_type | string | pdf/txt/md/docx future |
| file_path | string | local path or storage path |
| status | string | uploaded/processed/indexed/failed |
| text_length | integer | parsed text length |
| chunk_count | integer | number of chunks |
| created_at | datetime | timestamp |

## chunks

| Field | Type | Notes |
|---|---|---|
| id | string | primary key |
| document_id | string | foreign key |
| usecase_id | string | foreign key |
| chunk_index | integer | sequence number |
| text | text | chunk content |
| metadata | json | section/page/source info |
| vector_id | string | vector store ID |
| created_at | datetime | timestamp |

## rag_configs

| Field | Type | Notes |
|---|---|---|
| id | string | primary key |
| usecase_id | string | foreign key |
| chunk_size | integer | default 800 |
| chunk_overlap | integer | default 120 |
| top_k | integer | default 5 |
| retrieval_mode | string | vector/hybrid future |
| reranking | boolean | default false |
| citation_required | boolean | default true |
| created_at | datetime | timestamp |

## agent_runs

| Field | Type | Notes |
|---|---|---|
| id | string | primary key |
| usecase_id | string | foreign key |
| question | text | user question |
| answer | text | final answer |
| provider | string | openai/ollama/nim-compatible |
| risk_level | string | low/medium/high |
| status | string | completed/failed |
| latency_ms | integer | total latency |
| input_tokens | integer | optional |
| output_tokens | integer | optional |
| estimated_cost_usd | float | optional |
| created_at | datetime | timestamp |

## agent_trace_steps

| Field | Type | Notes |
|---|---|---|
| id | string | primary key |
| run_id | string | foreign key |
| node_name | string | workflow node |
| status | string | completed/failed/skipped |
| input_summary | text | optional |
| output_summary | text | optional |
| latency_ms | integer | optional |
| created_at | datetime | timestamp |

## retrieved_chunks

| Field | Type | Notes |
|---|---|---|
| id | string | primary key |
| run_id | string | foreign key |
| chunk_id | string | foreign key |
| score | float | retrieval score |
| rank | integer | retrieval rank |

## golden_questions

| Field | Type | Notes |
|---|---|---|
| id | string | primary key |
| usecase_id | string | foreign key |
| question | text | question |
| expected_answer | text | optional |
| expected_sources | json | optional |
| tags | json | optional |

## evaluation_runs

| Field | Type | Notes |
|---|---|---|
| id | string | primary key |
| usecase_id | string | foreign key |
| provider | string | model provider |
| rag_config_id | string | config used |
| total_questions | integer | count |
| avg_context_relevance | float | metric |
| avg_answer_relevance | float | metric |
| avg_faithfulness | float | metric |
| avg_latency_ms | integer | metric |
| status | string | completed/failed |
| created_at | datetime | timestamp |

## evaluation_results

| Field | Type | Notes |
|---|---|---|
| id | string | primary key |
| evaluation_run_id | string | foreign key |
| golden_question_id | string | foreign key |
| agent_run_id | string | foreign key |
| context_relevance | float | metric |
| answer_relevance | float | metric |
| faithfulness | float | metric |
| hallucination_risk | string | low/medium/high |
| notes | text | explanation |

## reports

| Field | Type | Notes |
|---|---|---|
| id | string | primary key |
| usecase_id | string | foreign key |
| title | string | report title |
| format | string | markdown/pdf future |
| file_path | string | generated file path |
| created_at | datetime | timestamp |
