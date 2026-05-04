@echo off
echo Starting Agentic RAG Solution Studio Backend...
echo.

REM Check if .env exists
if not exist .env (
  echo [WARN] .env not found. Copying from .env.example...
  copy .env.example .env
  echo [WARN] Please edit .env and add your OPENAI_API_KEY before running agent/eval features.
  echo.
)

REM Install dependencies if needed
py -m pip install -r requirements.txt --quiet

REM Start server
echo [INFO] Starting FastAPI on http://localhost:8000
echo [INFO] API docs at http://localhost:8000/docs
echo [INFO] Frontend at: open index.html in your browser (from the frontend folder)
echo.
py -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
