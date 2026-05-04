# Deployment Specification

## 1. Deployment Goal

Provide a clean local and Docker-based setup so reviewers can run the project easily.

## 2. Local Development

Recommended commands:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
streamlit run ui/streamlit_app.py
```

## 3. Environment Variables

Create `.env.example`:

```env
APP_ENV=development
DATABASE_URL=sqlite:///./studio.db
VECTOR_STORE=chroma
OPENAI_API_KEY=your_key_here
DEFAULT_PROVIDER=openai
TOKEN_COST_INPUT_PER_1K=0.0005
TOKEN_COST_OUTPUT_PER_1K=0.0015
```

## 4. Docker Compose

Services for MVP:

```yaml
services:
  backend:
    build: .
    ports:
      - "8000:8000"
    env_file:
      - .env

  frontend:
    build: ./ui
    ports:
      - "8501:8501"
    depends_on:
      - backend
```

## 5. Logging

Log key events:
- use case creation
- document upload
- document processing
- indexing
- agent run start/end
- provider errors
- evaluation run
- report generation

## 6. Observability Metrics

Track:
- latency per agent run
- token usage
- estimated cost
- number of retrieved chunks
- evaluation score
- provider name
- failure reason

## 7. Error Handling

Common errors:
- missing API key
- unsupported file type
- document parsing failure
- embedding failure
- vector index missing
- LLM provider failure
- report generation failure

Each error should return:
```json
{
  "error_code": "DOCUMENT_PARSE_FAILED",
  "message": "Could not parse the uploaded document.",
  "suggestion": "Try uploading a TXT or Markdown version."
}
```

## 8. Security Notes for MVP

- Do not commit API keys.
- Use `.env` and `.env.example`.
- Store uploaded files locally only for MVP.
- Do not include sensitive real customer documents.
- Use sample synthetic documents.

## 9. Future Production Deployment

Future deployment can include:
- PostgreSQL
- Redis queue
- object storage
- Kubernetes
- NVIDIA NIM endpoint
- API authentication
- multi-user support
- role-based access control
