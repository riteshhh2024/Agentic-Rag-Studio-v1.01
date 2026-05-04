import uuid
import os
from datetime import datetime
from sqlalchemy.orm import Session
from app.database.models import Report, UseCase, Document, EvaluationRun
from app.schemas.report import ReportGenerateRequest, ReportResponse
from app.config import get_settings

settings = get_settings()


class ReportService:
    def __init__(self, db: Session):
        self.db = db

    async def generate(self, payload: ReportGenerateRequest) -> ReportResponse:
        usecase = self.db.query(UseCase).filter(UseCase.id == payload.usecase_id).first()
        if not usecase:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Use case not found")

        report_id = str(uuid.uuid4())
        title = f"POC Report — {usecase.name}"
        content = self._build_markdown(usecase, payload)

        os.makedirs(settings.upload_dir, exist_ok=True)
        file_path = os.path.join(settings.upload_dir, f"report_{report_id}.md")
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)

        report = Report(
            id=report_id,
            usecase_id=payload.usecase_id,
            title=title,
            format=payload.format,
            file_path=file_path,
        )
        self.db.add(report)
        self.db.commit()
        self.db.refresh(report)

        return ReportResponse(
            id=report.id,
            usecase_id=report.usecase_id,
            title=report.title,
            format=report.format,
            created_at=report.created_at,
            download_url=f"/reports/{report.id}/download",
        )

    def get(self, report_id: str) -> Report | None:
        return self.db.query(Report).filter(Report.id == report_id).first()

    def list_reports(self, usecase_id: str) -> list[Report]:
        return (
            self.db.query(Report)
            .filter(Report.usecase_id == usecase_id)
            .order_by(Report.created_at.desc())
            .all()
        )

    def get_content(self, report: Report) -> str:
        if report.file_path and os.path.exists(report.file_path):
            with open(report.file_path, "r", encoding="utf-8") as f:
                return f.read()
        return "# Report content not found"

    def _build_markdown(self, usecase: UseCase, payload: ReportGenerateRequest) -> str:
        docs = self.db.query(Document).filter(Document.usecase_id == usecase.id).all()
        eval_run = (
            self.db.query(EvaluationRun)
            .filter(EvaluationRun.usecase_id == usecase.id, EvaluationRun.status == "completed")
            .order_by(EvaluationRun.created_at.desc())
            .first()
        )
        now = datetime.utcnow().strftime("%Y-%m-%d")

        lines = [
            f"# {usecase.name} — GenAI POC Report",
            f"> Generated: {now} | Industry: {usecase.industry or 'N/A'} | Answer Style: {usecase.answer_style}",
            "",
            "---",
            "",
            "## 1. Business Problem",
            "",
            usecase.business_problem,
            "",
            "## 2. Target Users",
            "",
        ]
        for u in (usecase.target_users or []):
            lines.append(f"- {u}")
        lines += [
            "",
            "## 3. Success Criteria",
            "",
        ]
        for s in (usecase.success_criteria or []):
            lines.append(f"- {s}")

        if payload.include_architecture:
            lines += [
                "",
                "## 4. Proposed Architecture",
                "",
                "```",
                "Frontend (React Studio)",
                "      |",
                "      v",
                "FastAPI Backend",
                "      |",
                "      +-- Use Case Service",
                "      +-- Document Ingestion Service",
                "      +-- RAG Service (ChromaDB + OpenAI Embeddings)",
                "      +-- Agent Orchestrator (LangGraph-style)",
                "      +-- Evaluation Service",
                "      +-- Report Generator",
                "      |",
                "      v",
                "SQLite + ChromaDB Vector Store",
                "```",
                "",
                "### Agent Workflow",
                "",
                "```",
                "User Question",
                "  -> Intent Analyzer",
                "  -> Retriever (top-k chunks)",
                "  -> Answer Generator",
                "  -> Grounding Verifier",
                "  -> Risk Classifier",
                "  -> Final Responder",
                "```",
            ]

        lines += [
            "",
            "## 5. Knowledge Base",
            "",
            f"**Documents indexed:** {len(docs)}",
            "",
            "| Document | Type | Chunks | Status |",
            "|---|---|---|---|",
        ]
        for d in docs:
            lines.append(f"| {d.filename} | {d.file_type.upper()} | {d.chunk_count} | {d.status.title()} |")

        if payload.include_evaluation and eval_run:
            lines += [
                "",
                "## 6. Evaluation Results",
                "",
                f"| Metric | Score |",
                f"|---|---|",
                f"| Faithfulness | {eval_run.avg_faithfulness:.2f} |" if eval_run.avg_faithfulness else "| Faithfulness | N/A |",
                f"| Answer Relevance | {eval_run.avg_answer_relevance:.2f} |" if eval_run.avg_answer_relevance else "| Answer Relevance | N/A |",
                f"| Context Relevance | {eval_run.avg_context_relevance:.2f} |" if eval_run.avg_context_relevance else "| Context Relevance | N/A |",
                f"| Avg Latency | {eval_run.avg_latency_ms} ms |" if eval_run.avg_latency_ms else "| Avg Latency | N/A |",
                f"| Questions Evaluated | {eval_run.total_questions} |",
            ]

        lines += [
            "",
            "## 7. Risks & Limitations",
            "",
            "- Answers are grounded in uploaded documents only.",
            "- Medium/High risk answers require human review before action.",
            "- PDF parsing quality depends on document structure.",
            "- Embeddings and LLM calls require valid API keys.",
            "",
            "## 8. Deployment Recommendation",
            "",
            "- Run locally with Docker Compose for demo.",
            "- For production: PostgreSQL, Redis queue, object storage.",
            "- Inference provider can be swapped via `DEFAULT_PROVIDER` env var.",
            "",
            "---",
            f"*Report generated by Agentic RAG Solution Studio · {now}*",
        ]

        return "\n".join(lines)
