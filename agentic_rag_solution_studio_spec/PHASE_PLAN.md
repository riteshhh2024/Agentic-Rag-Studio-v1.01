# Phase-Wise Spec Driven Development Plan

## SDD Method
Each phase follows this loop:

1. Define spec for the phase.
2. Create acceptance criteria.
3. Implement the smallest useful feature.
4. Add tests or validation checks.
5. Update documentation and screenshots.
6. Move to the next phase only when acceptance criteria are met.

---

## Phase 0: Project Foundation

### Objective
Set up repository, environment, base architecture, and project documentation.

### Deliverables
- GitHub repository
- README
- mission file
- base FastAPI app
- base Streamlit app
- folder structure
- environment config
- Docker skeleton

### Acceptance Criteria
- Backend starts locally.
- Frontend starts locally.
- Health check endpoint works.
- README explains project purpose.

### Suggested Commit Messages
- `chore: initialize project structure`
- `docs: add mission and initial specification`
- `feat: add FastAPI health endpoint`

---

## Phase 1: Use Case Intake

### Objective
Allow users to create a customer/demo use case.

### Features
- Create use case form
- Store use case in database
- List use cases
- View use case detail

### Data Fields
- name
- industry
- business_problem
- target_users
- document_types
- success_criteria
- answer_style
- created_at

### Acceptance Criteria
- User can create a use case from frontend.
- Use case is saved in database.
- Use case can be retrieved through API.

### Suggested Commit Messages
- `feat: add use case creation API`
- `feat: add use case intake UI`
- `test: add use case service tests`

---

## Phase 2: Document Upload and Ingestion

### Objective
Allow users to upload documents and prepare them for retrieval.

### Features
- Upload PDF/TXT/Markdown
- Parse document text
- Clean extracted text
- Chunk text
- Store document and chunk metadata

### Acceptance Criteria
- User can upload at least TXT and Markdown files.
- PDF support works if parser is available.
- Chunks are stored with document references.
- UI shows document indexing status.

### Suggested Commit Messages
- `feat: add document upload service`
- `feat: add text chunking pipeline`
- `feat: show document status in UI`

---

## Phase 3: Vector Index and RAG Retrieval

### Objective
Build the RAG retrieval layer.

### Features
- Generate embeddings
- Store vectors in FAISS or Chroma
- Retrieve top-k chunks
- Return source references
- Allow basic RAG configuration

### Acceptance Criteria
- User can index uploaded documents.
- User can retrieve relevant chunks for a query.
- Retrieval response includes document name and chunk IDs.

### Suggested Commit Messages
- `feat: add vector index service`
- `feat: implement top-k retrieval`
- `feat: add RAG configuration options`

---

## Phase 4: Agentic Workflow

### Objective
Implement controlled LangGraph-style agent workflow.

### Agent Nodes
1. Intent Analyzer
2. Retriever
3. Answer Generator
4. Grounding Verifier
5. Risk Classifier
6. Final Responder

### Acceptance Criteria
- User can ask a question through the agent endpoint.
- Agent trace is returned.
- Final answer includes citations.
- Risk level is returned.

### Suggested Commit Messages
- `feat: add LangGraph agent workflow`
- `feat: add grounding verifier node`
- `feat: expose agent trace in API`

---

## Phase 5: Evaluation and Metrics

### Objective
Evaluate RAG quality and inference behavior.

### Features
- Golden Q&A upload or manual entry
- Run evaluation
- Score answer relevance
- Score context relevance
- Estimate hallucination risk
- Log latency and token usage

### Acceptance Criteria
- User can run evaluation on at least five questions.
- Dashboard shows metric table.
- Failed cases are highlighted.

### Suggested Commit Messages
- `feat: add golden question evaluation`
- `feat: log latency and token usage`
- `feat: add evaluation dashboard`

---

## Phase 6: Inference Provider Comparison

### Objective
Compare model providers by latency, cost, and quality.

### Features
- Provider interface
- OpenAI-compatible provider
- Optional Ollama/local provider
- NIM-compatible adapter design placeholder
- Benchmark table

### Acceptance Criteria
- Each run records provider name.
- Metrics show latency and estimated cost.
- README explains how NIM-compatible adapter can be connected.

### Suggested Commit Messages
- `feat: add inference provider abstraction`
- `feat: track provider-level metrics`
- `docs: add NIM-compatible adapter notes`

---

## Phase 7: Report Generation

### Objective
Generate a customer-ready POC report.

### Report Sections
- Customer problem
- Proposed solution
- Architecture
- Knowledge sources
- RAG configuration
- Agent workflow
- Sample answers
- Evaluation metrics
- Risks and limitations
- Deployment recommendation

### Acceptance Criteria
- User can generate report from UI.
- Report exports as Markdown.
- Report includes at least one architecture diagram text block.

### Suggested Commit Messages
- `feat: generate POC report`
- `feat: add report export endpoint`
- `docs: add sample generated report`

---

## Phase 8: Deployment, Testing, and Portfolio Polish

### Objective
Prepare the project for public portfolio review.

### Deliverables
- Docker Compose
- `.env.example`
- test suite
- screenshots
- demo GIF or video
- portfolio write-up
- architecture diagram

### Acceptance Criteria
- Project can be run using documented setup steps.
- README has screenshots.
- At least core services have tests.
- Portfolio page explains problem, architecture, stack, and impact.

### Suggested Commit Messages
- `chore: add Docker Compose setup`
- `test: add core workflow tests`
- `docs: add portfolio case study`
