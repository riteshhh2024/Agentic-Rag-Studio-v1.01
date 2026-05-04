# Agentic RAG Solution Studio

A full-stack solution-architect workbench for designing, tuning, and evaluating enterprise GenAI Proof-of-Concept systems. Built for solution architects who need to demo Retrieval-Augmented Generation pipelines end-to-end — from document ingestion through to a client-ready PDF report — in a single local environment.

---

## What it does

| Step | Screen | What you do |
|------|--------|-------------|
| 1 | **Onboarding** | 4-step wizard to define the POC: use-case type, customer context, requirements (citation, escalation, latency, grounding) |
| 2 | **Knowledge Base** | Upload PDFs, Markdown, TXT, DOCX — process and chunk them, index into ChromaDB |
| 3 | **RAG Config** | Tune chunk size, overlap, top-k, retrieval mode, reranking — see impact bars update live |
| 4 | **Agent** | Chat with the 6-node LangGraph-style agent, watch the trace, inspect retrieved context |
| 5 | **Evaluation** | Add golden Q&A pairs, run scored evaluation (context relevance, faithfulness, hallucination risk) |
| 6 | **Benchmarks** | Live latency percentiles, token usage, cost breakdown, risk distribution — all from real run history |
| 7 | **Report** | Generate a client-ready executive summary with all metrics, export as Markdown |
| 8 | **Settings** | View active config, test the OpenAI connection |

---

## Architecture

```
┌─────────────────────────────────────────┐
│  Browser (React 18 UMD + Babel)         │
│  ─ No build step — open http://localhost:8000 ─│
└──────────────┬──────────────────────────┘
               │ REST (JSON + multipart upload)
               ▼
┌─────────────────────────────────────────┐
│  FastAPI 0.115  (Python 3.11)           │
│  ┌────────────────┐  ┌───────────────┐  │
│  │ 6-node Agent   │  │  RAG Service  │  │
│  │ Intent Analyze │  │  LangChain    │  │
│  │ Retrieve       │  │  text-splitter│  │
│  │ Answer Gen     │  │  embeddings   │  │
│  │ Grounding Ver  │  └───────┬───────┘  │
│  │ Risk Classify  │          │          │
│  │ Final Respond  │     ChromaDB        │
│  └────────────────┘   (persistent)      │
│           │                             │
│      SQLite (studio.db)                 │
└─────────────────────────────────────────┘
```

**Agent graph nodes (in order):**
1. **Intent Analyzer** — classifies the question type and needed depth
2. **Retriever** — vector + optional keyword search from ChromaDB
3. **Answer Generator** — GPT-4o-mini synthesis with source grounding
4. **Grounding Verifier** — checks answer against retrieved chunks
5. **Risk Classifier** — flags hallucination risk: low / medium / high
6. **Final Responder** — formats the output with citations

---

## Stack

| Layer | Technology |
|-------|-----------|
| LLM | OpenAI `gpt-4o-mini` (configurable) |
| Embeddings | OpenAI `text-embedding-3-small` |
| Vector store | ChromaDB (local persistent) |
| Text splitting | LangChain `RecursiveCharacterTextSplitter` |
| API | FastAPI + Uvicorn |
| ORM | SQLAlchemy 2 + SQLite |
| Frontend | React 18 UMD + Babel Standalone (no build tool) |
| Tests | pytest + FastAPI `TestClient` + in-memory SQLite |

---

## Prerequisites

- Python 3.11+
- An OpenAI API key (for LLM + embeddings)

---

## Setup

**1. Clone and enter the backend directory:**
```bash
cd backend
```

**2. Install dependencies:**
```bash
pip install -r requirements.txt
```

**3. Create the environment file:**
```bash
cp .env.example .env
```
Then edit `.env` and set your `OPENAI_API_KEY`.

**4. (Optional) Seed the database with demo data:**
```bash
python seed_db.py
```

**5. Start the server:**
```bash
# Windows
start.bat

# macOS / Linux
./start.sh

# Or directly:
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**6. Open the app:**

```
http://localhost:8000
```

> The frontend is served as static files by FastAPI. Do NOT open `index.html` directly via `file://` — Babel cannot fetch `.jsx` files over the file protocol.

---

## Docker

```bash
# Build and run (from the repository root)
docker-compose up --build
```

Then open `http://localhost:8000`.

Persistent data (SQLite DB, uploads, vector store) is volume-mounted so it survives container restarts.

---

## Running tests

```bash
cd backend
python -m pytest tests/ -v
```

The test suite uses an in-memory SQLite database and FastAPI's `TestClient` — no server needs to be running, no OpenAI key needed.

| Test file | Coverage |
|-----------|----------|
| `test_health.py` | Health check endpoint |
| `test_usecases.py` | Full use-case CRUD |
| `test_rag.py` | RAG config save and retrieval |
| `test_evaluation.py` | Golden questions add/list/delete, eval listing |
| `test_benchmarks.py` | Benchmark aggregation (empty and with seeded runs) |
| `test_reports.py` | Report list and download URL generation |
| `test_settings.py` | Settings read and default values |

---

## Environment variables

See `backend/.env.example` for the full list. Required:

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | Your OpenAI secret key |

Optional overrides:

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_ENV` | `development` | `development` or `production` |
| `DEFAULT_MODEL` | `gpt-4o-mini` | OpenAI chat model |
| `DEFAULT_EMBEDDING_MODEL` | `text-embedding-3-small` | OpenAI embedding model |
| `TOKEN_COST_INPUT_PER_1K` | `0.00015` | $/1k input tokens (for cost tracking) |
| `TOKEN_COST_OUTPUT_PER_1K` | `0.0006` | $/1k output tokens |

---

## Project structure

```
RAG Solution Studio/
├── backend/
│   ├── app/
│   │   ├── config.py            # Pydantic-settings, reads .env
│   │   ├── main.py              # FastAPI app, lifespan, router registration
│   │   ├── database/
│   │   │   ├── db.py            # Engine, session, Base, init_db
│   │   │   └── models.py        # All SQLAlchemy ORM models
│   │   ├── routers/             # One file per API domain
│   │   ├── schemas/             # Pydantic request/response models
│   │   └── services/            # Business logic, DB + ChromaDB calls
│   ├── tests/                   # pytest test suite (in-memory SQLite)
│   ├── .env.example             # Environment variable template
│   ├── requirements.txt
│   ├── Dockerfile
│   └── seed_db.py               # Demo data seeder
├── Agentic RAG Solution Studio - frontend/
│   ├── index.html               # App entry point (React UMD)
│   ├── styles.css               # Design system tokens + layout
│   ├── js/api.js                # Typed API client (all endpoints)
│   ├── components/
│   │   ├── ui.jsx               # Badge, Icon, Toggle, Seg, etc.
│   │   └── chrome.jsx           # Sidebar, Header
│   └── screens/                 # One .jsx per page
└── docker-compose.yml
```
