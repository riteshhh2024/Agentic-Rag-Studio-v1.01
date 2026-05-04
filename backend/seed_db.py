"""Seed studio.db with realistic test data for all phases."""
import sqlite3
import json
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "studio.db")
NOW = datetime.utcnow().isoformat()

UC_ID   = "uc-demo-acme-001"
DOC1_ID = "doc-refund-policy-001"
DOC2_ID = "doc-escalation-sop-001"
CFG_ID  = "cfg-acme-001"
RUN_ID  = "run-demo-001"
EVAL_ID = "eval-acme-001"
REP_ID  = "rep-acme-001"


def seed(conn):
    cur = conn.cursor()

    # ── 1. Use Case ────────────────────────────────────────────────────────────
    cur.execute("DELETE FROM use_cases WHERE id = ?", (UC_ID,))
    cur.execute(
        """INSERT INTO use_cases
             (id, name, industry, business_problem, target_users,
              document_types, success_criteria, answer_style, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?)""",
        (
            UC_ID,
            "Acme Support Knowledge Assistant",
            "Consumer SaaS",
            "Support agents spend too much time searching policy documents and "
            "troubleshooting guides, leading to inconsistent answers and slow "
            "first-response times.",
            json.dumps(["Support Agents (Tier 1 & Tier 2)", "Team Leads"]),
            json.dumps(["Refund Policy", "Troubleshooting Guide", "Escalation SOP"]),
            json.dumps(["Citations required", "Latency under 3s", "Low hallucination risk"]),
            "support-agent",
            NOW, NOW,
        ),
    )
    print(f"[OK] use_cases        -> {UC_ID}")

    # ── 2. Documents ───────────────────────────────────────────────────────────
    docs = [
        (DOC1_ID, "refund_policy.txt",  "txt", 4200, 3),
        (DOC2_ID, "escalation_sop.md",  "md",  3800, 3),
    ]
    for doc_id, fname, ftype, tlen, ccount in docs:
        cur.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
        cur.execute(
            """INSERT INTO documents
                 (id, usecase_id, filename, file_type, file_path,
                  status, text_length, chunk_count, created_at)
               VALUES (?,?,?,?,?,?,?,?,?)""",
            (doc_id, UC_ID, fname, ftype, f"./uploads/{fname}",
             "indexed", tlen, ccount, NOW),
        )
    print(f"[OK] documents        -> 2 docs (refund_policy.txt, escalation_sop.md)")

    # ── 3. Chunks ──────────────────────────────────────────────────────────────
    chunk_data = [
        (DOC1_ID, 0, "refund_policy.txt",
         "Standard refunds are allowed within 30 days of purchase. "
         "Items must be in original condition with proof of purchase."),
        (DOC1_ID, 1, "refund_policy.txt",
         "Damaged-shipment claims are eligible for full refund or replacement "
         "regardless of the 30-day standard return window, provided proof of "
         "damage is submitted within 60 days of delivery."),
        (DOC1_ID, 2, "refund_policy.txt",
         "International orders follow the same refund policy but shipping costs "
         "are non-refundable. Contact support@acme.com for international claims."),
        (DOC2_ID, 0, "escalation_sop.md",
         "For damaged-shipment refunds requested more than 30 days post-delivery, "
         "Tier-1 agents must escalate to Tier-2 using reason code EXC_AGED. "
         "Pre-approval is not permitted."),
        (DOC2_ID, 1, "escalation_sop.md",
         "Aged exceptions require photo evidence, original order ID, and a "
         "customer-communication SLA of 48 hours. Resolution authority sits "
         "with Tier-2 leads only."),
        (DOC2_ID, 2, "escalation_sop.md",
         "High-value refunds (over $500) always require manager approval "
         "regardless of reason code. Use escalation queue: queue.refunds.highvalue."),
    ]
    for doc_id, idx, fname, text in chunk_data:
        chk_id = f"chk-{doc_id}-{idx}"
        cur.execute("DELETE FROM chunks WHERE id = ?", (chk_id,))
        cur.execute(
            """INSERT INTO chunks
                 (id, document_id, usecase_id, chunk_index, text, metadata, vector_id, created_at)
               VALUES (?,?,?,?,?,?,?,?)""",
            (chk_id, doc_id, UC_ID, idx, text,
             json.dumps({"filename": fname, "chunk_index": idx}), chk_id, NOW),
        )
    print(f"[OK] chunks           -> 6 chunks (3 per document)")

    # ── 4. RAG Config ──────────────────────────────────────────────────────────
    cur.execute("DELETE FROM rag_configs WHERE id = ?", (CFG_ID,))
    cur.execute(
        """INSERT INTO rag_configs
             (id, usecase_id, chunk_size, chunk_overlap, top_k,
              retrieval_mode, reranking, citation_required, created_at)
           VALUES (?,?,?,?,?,?,?,?,?)""",
        (CFG_ID, UC_ID, 800, 120, 5, "vector", 0, 1, NOW),
    )
    print(f"[OK] rag_configs      -> chunk_size=800, top_k=5, citation_required=1")

    # ── 5. Agent Run + Trace ───────────────────────────────────────────────────
    cur.execute("DELETE FROM agent_runs WHERE id = ?", (RUN_ID,))
    cur.execute(
        """INSERT INTO agent_runs
             (id, usecase_id, question, answer, provider, risk_level,
              status, latency_ms, input_tokens, output_tokens,
              estimated_cost_usd, created_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
        (
            RUN_ID, UC_ID,
            "A customer wants a refund after 45 days because the product arrived damaged. "
            "What should the support agent do?",
            "Damaged-shipment refunds are eligible regardless of the 30-day window, "
            "but exceptions over 30 days require Tier-2 escalation with reason code EXC_AGED.",
            "openai", "medium", "completed",
            2400, 1520, 280, 0.006, NOW,
        ),
    )
    trace_steps = [
        ("intent_analyzer",    "completed", "Intent: refund-exception · type: procedural", 180),
        ("retriever",          "completed", "Retrieved 5 chunks · top score 0.91",         320),
        ("answer_generator",   "completed", "280 tokens generated · gpt-4o-mini",         1180),
        ("grounding_verifier", "completed", "Faithfulness: 0.92 · 3 citations matched",    280),
        ("risk_classifier",    "medium",    "Risk: Medium · Escalation triggered",          140),
        ("final_responder",    "completed", "Approved with escalation note",                 60),
    ]
    for step_name, status, summary, ms in trace_steps:
        sid = f"step-{RUN_ID}-{step_name}"
        cur.execute("DELETE FROM agent_trace_steps WHERE id = ?", (sid,))
        cur.execute(
            """INSERT INTO agent_trace_steps
                 (id, run_id, node_name, status, output_summary, latency_ms, created_at)
               VALUES (?,?,?,?,?,?,?)""",
            (sid, RUN_ID, step_name, status, summary, ms, NOW),
        )
    for i, (chk_id, score) in enumerate([
        (f"chk-{DOC1_ID}-1", 0.91),
        (f"chk-{DOC2_ID}-0", 0.88),
        (f"chk-{DOC2_ID}-1", 0.84),
    ]):
        rc_id = f"rc-{RUN_ID}-{i}"
        cur.execute("DELETE FROM retrieved_chunks WHERE id = ?", (rc_id,))
        cur.execute(
            "INSERT INTO retrieved_chunks (id, run_id, chunk_id, score, rank) VALUES (?,?,?,?,?)",
            (rc_id, RUN_ID, chk_id, score, i + 1),
        )
    print(f"[OK] agent_runs       -> 1 completed run (medium risk, 2400ms)")
    print(f"[OK] agent_trace_steps-> 6 steps")
    print(f"[OK] retrieved_chunks -> 3 chunks linked")

    # ── 6. Golden Questions ────────────────────────────────────────────────────
    golden = [
        ("gq-acme-000",
         "What is the standard refund window?",
         "Standard refunds are allowed within 30 days of purchase.",
         ["refund_policy.txt"]),
        ("gq-acme-001",
         "Can a customer get a refund after 45 days for damaged goods?",
         "Yes, but it requires Tier-2 escalation with reason code EXC_AGED.",
         ["refund_policy.txt", "escalation_sop.md"]),
        ("gq-acme-002",
         "Who approves high-value refunds over $500?",
         "Manager approval is always required for refunds over $500.",
         ["escalation_sop.md"]),
    ]
    for gq_id, question, answer, sources in golden:
        cur.execute("DELETE FROM golden_questions WHERE id = ?", (gq_id,))
        cur.execute(
            """INSERT INTO golden_questions
                 (id, usecase_id, question, expected_answer, expected_sources, tags)
               VALUES (?,?,?,?,?,?)""",
            (gq_id, UC_ID, question, answer,
             json.dumps(sources), json.dumps(["refund", "policy"])),
        )
    print(f"[OK] golden_questions -> 3 questions")

    # ── 7. Evaluation Run + Results ────────────────────────────────────────────
    cur.execute("DELETE FROM evaluation_runs WHERE id = ?", (EVAL_ID,))
    cur.execute(
        """INSERT INTO evaluation_runs
             (id, usecase_id, provider, rag_config_id, total_questions,
              avg_context_relevance, avg_answer_relevance, avg_faithfulness,
              avg_latency_ms, status, created_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
        (EVAL_ID, UC_ID, "openai", CFG_ID, 3,
         0.82, 0.87, 0.91, 2300, "completed", NOW),
    )
    eval_results = [
        ("er-acme-000", "gq-acme-000", 0.88, 0.91, 0.95, "low"),
        ("er-acme-001", "gq-acme-001", 0.80, 0.85, 0.88, "low"),
        ("er-acme-002", "gq-acme-002", 0.78, 0.84, 0.91, "low"),
    ]
    for er_id, gq_id, ctx, ans, faith, hall in eval_results:
        cur.execute("DELETE FROM evaluation_results WHERE id = ?", (er_id,))
        cur.execute(
            """INSERT INTO evaluation_results
                 (id, evaluation_run_id, golden_question_id,
                  context_relevance, answer_relevance, faithfulness, hallucination_risk)
               VALUES (?,?,?,?,?,?,?)""",
            (er_id, EVAL_ID, gq_id, ctx, ans, faith, hall),
        )
    print(f"[OK] evaluation_runs  -> 1 completed eval (avg faithfulness=0.91)")
    print(f"[OK] evaluation_results -> 3 results (all low risk)")

    # ── 8. Report ──────────────────────────────────────────────────────────────
    cur.execute("DELETE FROM reports WHERE id = ?", (REP_ID,))
    cur.execute(
        """INSERT INTO reports
             (id, usecase_id, title, format, file_path, created_at)
           VALUES (?,?,?,?,?,?)""",
        (REP_ID, UC_ID,
         "POC Report — Acme Support Knowledge Assistant",
         "markdown",
         f"./uploads/report_{REP_ID}.md",
         NOW),
    )
    print(f"[OK] reports          -> 1 draft report")

    conn.commit()


def verify(conn):
    cur = conn.cursor()
    print()
    print("=== Verification ===")
    tables = [
        "use_cases", "documents", "chunks", "rag_configs",
        "agent_runs", "agent_trace_steps", "retrieved_chunks",
        "golden_questions", "evaluation_runs", "evaluation_results", "reports",
    ]
    all_ok = True
    for t in tables:
        cur.execute(f'SELECT COUNT(*) FROM "{t}"')
        count = cur.fetchone()[0]
        status = "[OK]" if count > 0 else "[EMPTY]"
        if count == 0:
            all_ok = False
        print(f"  {status} {t:<30} {count} row(s)")
    print()
    if all_ok:
        print("All 11 tables populated. DB ready for Phase 2+ testing.")
    else:
        print("WARNING: Some tables are empty.")
    return all_ok


if __name__ == "__main__":
    print(f"DB: {os.path.abspath(DB_PATH)}")
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    print()
    print("=== Seeding ===")
    seed(conn)
    verify(conn)
    conn.close()
