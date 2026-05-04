"""LangGraph-style controlled agent workflow.

Nodes:
  1. Intent Analyzer
  2. Retriever
  3. Answer Generator
  4. Grounding Verifier
  5. Risk Classifier
  6. Final Responder
"""
import uuid
import time
from dataclasses import dataclass, field
from typing import Optional
from sqlalchemy.orm import Session
from app.database.models import AgentRun, AgentTraceStep, RetrievedChunk, Chunk
from app.schemas.agent import (
    AgentAskRequest, AgentAskResponse, Citation, TraceStep, AgentMetrics, AgentRunResponse
)
from app.services.rag_service import RagService
from app.services.provider_service import LLMProvider
from app.database.models import UseCase
from app.config import get_settings

settings = get_settings()


@dataclass
class AgentState:
    usecase_id: str
    question: str
    usecase_name: str = ""
    answer_style: str = "concise"
    intent: Optional[str] = None
    question_type: str = "informational"
    requires_citation: bool = True
    risk_sensitive: bool = False
    retrieved_chunks: list = field(default_factory=list)
    draft_answer: str = ""
    citations: list = field(default_factory=list)
    faithfulness_score: float = 0.0
    verification_status: str = "pending"
    risk_level: str = "low"
    approval_required: bool = False
    risk_reason: str = ""
    final_answer: str = ""
    errors: list = field(default_factory=list)
    trace: list = field(default_factory=list)
    total_latency_ms: int = 0
    input_tokens: int = 0
    output_tokens: int = 0
    estimated_cost_usd: float = 0.0


class AgentService:
    def __init__(self, db: Session):
        self.db = db
        self.rag_service = RagService(db)

    async def run(self, payload: AgentAskRequest) -> AgentAskResponse:
        usecase = self.db.query(UseCase).filter(UseCase.id == payload.usecase_id).first()
        if not usecase:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Use case not found")

        top_k = 5
        if payload.rag_config:
            top_k = payload.rag_config.top_k

        state = AgentState(
            usecase_id=payload.usecase_id,
            question=payload.question,
            usecase_name=usecase.name,
            answer_style=usecase.answer_style,
        )
        provider = LLMProvider(payload.provider)
        wall_start = time.time()

        # --- Node 1: Intent Analyzer ---
        await self._node_intent_analyzer(state, provider)

        # --- Node 2: Retriever ---
        await self._node_retriever(state, top_k)

        # --- Node 3: Answer Generator ---
        await self._node_answer_generator(state, provider)

        # --- Node 4: Grounding Verifier ---
        await self._node_grounding_verifier(state, provider)

        # --- Node 5: Risk Classifier ---
        await self._node_risk_classifier(state, provider)

        # --- Node 6: Final Responder ---
        self._node_final_responder(state)

        state.total_latency_ms = int((time.time() - wall_start) * 1000)

        # Persist run
        run_id = await self._persist_run(state, payload.provider)

        return AgentAskResponse(
            run_id=run_id,
            answer=state.final_answer,
            citations=[Citation(**c) for c in state.citations],
            risk_level=state.risk_level,
            agent_trace=[TraceStep(**t) for t in state.trace],
            metrics=AgentMetrics(
                latency_ms=state.total_latency_ms,
                input_tokens=state.input_tokens or None,
                output_tokens=state.output_tokens or None,
                estimated_cost_usd=state.estimated_cost_usd or None,
            ),
        )

    # ---------- Nodes ----------

    async def _node_intent_analyzer(self, state: AgentState, provider: LLMProvider):
        t0 = time.time()
        try:
            prompt = f"""Analyze this user question for a {state.usecase_name} use case.
Return a JSON object with:
- intent: short label (e.g. refund_policy_question)
- question_type: informational | procedural | risk_sensitive | report_generation
- requires_citation: true/false
- risk_sensitive: true/false

Question: {state.question}
Return ONLY valid JSON, no markdown."""

            result = await provider.generate(
                system_prompt="You are an intent analysis agent. Always return valid JSON.",
                user_prompt=prompt,
            )
            state.input_tokens += result.get("input_tokens", 0) or 0
            state.output_tokens += result.get("output_tokens", 0) or 0
            state.estimated_cost_usd += result.get("estimated_cost_usd", 0) or 0

            import json
            raw = result["content"].strip()
            # Strip markdown fences if present
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]
            data = json.loads(raw)
            state.intent = data.get("intent", "general_question")
            state.question_type = data.get("question_type", "informational")
            state.requires_citation = data.get("requires_citation", True)
            state.risk_sensitive = data.get("risk_sensitive", False)
            status = "completed"
            detail = f"Intent: {state.intent} · type: {state.question_type}"
        except Exception as e:
            state.intent = "general_question"
            state.errors.append(f"intent_analyzer: {e}")
            status = "fallback"
            detail = f"Fallback — {type(e).__name__}: {str(e)[:120]}"

        ms = int((time.time() - t0) * 1000)
        state.trace.append({"node": "intent_analyzer", "status": status, "detail": detail, "latency_ms": ms})

    async def _node_retriever(self, state: AgentState, top_k: int):
        t0 = time.time()
        try:
            chunks = await self.rag_service.retrieve_for_agent(state.usecase_id, state.question, top_k)
            state.retrieved_chunks = [c.model_dump() for c in chunks]
            detail = f"Retrieved {len(chunks)} chunks"
            status = "completed"
        except Exception as e:
            state.retrieved_chunks = []
            state.errors.append(f"retriever: {e}")
            detail = f"Retrieval failed: {e}"
            status = "failed"

        ms = int((time.time() - t0) * 1000)
        state.trace.append({"node": "retriever", "status": status, "detail": detail, "latency_ms": ms})

    async def _node_answer_generator(self, state: AgentState, provider: LLMProvider):
        t0 = time.time()
        try:
            if not state.retrieved_chunks:
                state.draft_answer = "I could not find enough supporting context in the uploaded documents."
                state.citations = []
                state.trace.append({"node": "answer_generator", "status": "no_context", "detail": "No chunks retrieved", "latency_ms": 0})
                return

            context_parts = []
            for i, c in enumerate(state.retrieved_chunks, 1):
                context_parts.append(f"[{i}] {c['filename']} (score: {c['score']:.2f})\n{c['text_preview']}")
            context = "\n\n".join(context_parts)

            answer_style_instruction = {
                "concise": "Be concise and direct.",
                "detailed": "Provide a detailed and thorough answer.",
                "support-agent": "Write as a support agent giving step-by-step guidance.",
                "legal-review": "Write in precise, legal review style.",
                "technical-runbook": "Write as a technical runbook with numbered steps.",
            }.get(state.answer_style, "Be clear and helpful.")

            system = f"""You are an AI assistant for {state.usecase_name}.
{answer_style_instruction}
Answer ONLY using the provided context. Include citation markers like [1], [2] that match the context sources.
If context is insufficient, say so clearly."""

            user = f"""Context:
{context}

Question: {state.question}

Provide a grounded answer with citations."""

            result = await provider.generate(system_prompt=system, user_prompt=user)
            state.input_tokens += result.get("input_tokens", 0) or 0
            state.output_tokens += result.get("output_tokens", 0) or 0
            state.estimated_cost_usd += result.get("estimated_cost_usd", 0) or 0

            state.draft_answer = result["content"]

            # Build citations from retrieved chunks
            state.citations = [
                {
                    "filename": c["filename"],
                    "section": c.get("metadata", {}).get("section"),
                    "chunk_id": c["chunk_id"],
                }
                for c in state.retrieved_chunks
            ]

            status = "completed"
            detail = f"{result.get('output_tokens', 0)} tokens generated"
        except Exception as e:
            state.draft_answer = f"Answer generation failed: {e}"
            state.errors.append(f"answer_generator: {e}")
            status = "failed"
            detail = str(e)

        ms = int((time.time() - t0) * 1000)
        state.trace.append({"node": "answer_generator", "status": status, "detail": detail, "latency_ms": ms})

    async def _node_grounding_verifier(self, state: AgentState, provider: LLMProvider):
        t0 = time.time()
        try:
            if not state.retrieved_chunks or not state.draft_answer:
                state.faithfulness_score = 0.0
                state.verification_status = "skipped"
                state.trace.append({"node": "grounding_verifier", "status": "skipped", "detail": "No answer or context", "latency_ms": 0})
                return

            context = " ".join(c["text_preview"] for c in state.retrieved_chunks[:3])
            system = """You are a faithfulness evaluator. Rate 0-1 whether the answer is supported by the context.
Return ONLY a JSON: {"faithfulness": 0.85, "unsupported_claims": [], "status": "passed"}"""
            user = f"Context: {context[:1500]}\n\nAnswer: {state.draft_answer[:500]}"

            result = await provider.generate(system_prompt=system, user_prompt=user)
            state.input_tokens += result.get("input_tokens", 0) or 0
            state.output_tokens += result.get("output_tokens", 0) or 0
            state.estimated_cost_usd += result.get("estimated_cost_usd", 0) or 0

            import json
            raw = result["content"].strip()
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]
            data = json.loads(raw)
            state.faithfulness_score = data.get("faithfulness", 0.8)
            state.verification_status = data.get("status", "passed")
            status = "completed"
            detail = f"Faithfulness: {state.faithfulness_score:.2f}"
        except Exception as e:
            state.faithfulness_score = 0.75
            state.verification_status = "estimated"
            state.errors.append(f"grounding_verifier: {e}")
            status = "estimated"
            detail = f"Estimated 0.75 — {type(e).__name__}: {str(e)[:120]}"

        ms = int((time.time() - t0) * 1000)
        state.trace.append({"node": "grounding_verifier", "status": status, "detail": detail, "latency_ms": ms})

    async def _node_risk_classifier(self, state: AgentState, provider: LLMProvider):
        t0 = time.time()
        try:
            system = """Classify the risk of acting on this answer. Return JSON only:
{"risk_level": "low|medium|high", "approval_required": false, "risk_reason": "..."}
- low: informational, read-only
- medium: operational action, business decision
- high: legal, financial, destructive, privacy"""
            user = f"Question: {state.question}\nAnswer summary: {state.draft_answer[:300]}"

            result = await provider.generate(system_prompt=system, user_prompt=user)
            state.input_tokens += result.get("input_tokens", 0) or 0
            state.output_tokens += result.get("output_tokens", 0) or 0
            state.estimated_cost_usd += result.get("estimated_cost_usd", 0) or 0

            import json
            raw = result["content"].strip()
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]
            data = json.loads(raw)
            state.risk_level = data.get("risk_level", "low")
            state.approval_required = data.get("approval_required", False)
            state.risk_reason = data.get("risk_reason", "")
            status = state.risk_level
            detail = state.risk_reason or f"Risk: {state.risk_level}"
        except Exception as e:
            state.risk_level = "low"
            state.errors.append(f"risk_classifier: {e}")
            status = "estimated"
            detail = f"Estimated low — {type(e).__name__}: {str(e)[:120]}"

        ms = int((time.time() - t0) * 1000)
        state.trace.append({"node": "risk_classifier", "status": status, "detail": detail, "latency_ms": ms})

    def _node_final_responder(self, state: AgentState):
        final = state.draft_answer
        if state.approval_required and state.risk_reason:
            final += f"\n\n⚠️ **Escalation Required**: {state.risk_reason}"
        state.final_answer = final
        state.trace.append({
            "node": "final_responder",
            "status": "completed",
            "detail": f"Risk: {state.risk_level} · Citations: {len(state.citations)}",
            "latency_ms": 0,
        })

    # ---------- Persistence ----------

    async def _persist_run(self, state: AgentState, provider: str) -> str:
        run_id = str(uuid.uuid4())
        run = AgentRun(
            id=run_id,
            usecase_id=state.usecase_id,
            question=state.question,
            answer=state.final_answer,
            provider=provider,
            risk_level=state.risk_level,
            status="completed",
            latency_ms=state.total_latency_ms,
            input_tokens=state.input_tokens   if state.input_tokens  > 0 else None,
            output_tokens=state.output_tokens if state.output_tokens > 0 else None,
            # Save 0.0 for free providers (Ollama), None only when no LLM calls succeeded
            estimated_cost_usd=state.estimated_cost_usd if state.input_tokens > 0 else None,
        )
        self.db.add(run)

        for step in state.trace:
            trace_step = AgentTraceStep(
                id=str(uuid.uuid4()),
                run_id=run_id,
                node_name=step["node"],
                status=step["status"],
                output_summary=step.get("detail"),
                latency_ms=step.get("latency_ms"),
            )
            self.db.add(trace_step)

        for i, chunk in enumerate(state.retrieved_chunks):
            rc = RetrievedChunk(
                id=str(uuid.uuid4()),
                run_id=run_id,
                chunk_id=chunk.get("chunk_id"),
                score=chunk.get("score"),
                rank=i + 1,
            )
            self.db.add(rc)

        self.db.commit()
        return run_id

    def list_runs(self, usecase_id: str) -> list[AgentRunResponse]:
        runs = (
            self.db.query(AgentRun)
            .filter(AgentRun.usecase_id == usecase_id)
            .order_by(AgentRun.created_at.desc())
            .limit(50)
            .all()
        )
        return [AgentRunResponse.model_validate(r) for r in runs]

    def get_run(self, run_id: str):
        run = self.db.query(AgentRun).filter(AgentRun.id == run_id).first()
        if not run:
            return None
        steps = [
            {"node": s.node_name, "status": s.status, "detail": s.output_summary, "latency_ms": s.latency_ms}
            for s in sorted(run.trace_steps, key=lambda x: x.created_at)
        ]
        citations = [
            {"filename": rc.chunk.document.filename if rc.chunk else "unknown", "chunk_id": rc.chunk_id}
            for rc in run.retrieved_chunks
            if rc.chunk
        ]
        return AgentAskResponse(
            run_id=run.id,
            answer=run.answer or "",
            citations=citations,
            risk_level=run.risk_level or "low",
            agent_trace=steps,
            metrics=AgentMetrics(
                latency_ms=run.latency_ms or 0,
                input_tokens=run.input_tokens,
                output_tokens=run.output_tokens,
                estimated_cost_usd=run.estimated_cost_usd,
            ),
        )
