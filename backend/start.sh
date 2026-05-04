#!/bin/bash
set -e

echo "Starting Agentic RAG Solution Studio Backend..."

# Copy .env if not exists
if [ ! -f .env ]; then
  echo "[WARN] .env not found. Copying from .env.example..."
  cp .env.example .env
  echo "[WARN] Please edit .env and add your OPENAI_API_KEY before running agent/eval features."
fi

# Install deps
pip install -r requirements.txt --quiet

# Start
echo "[INFO] Starting FastAPI on http://localhost:8000"
echo "[INFO] API docs at http://localhost:8000/docs"
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
