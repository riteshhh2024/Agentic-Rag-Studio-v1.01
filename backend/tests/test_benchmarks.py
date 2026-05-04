"""Tests for /benchmarks/{usecase_id}"""
from datetime import datetime
from app.database.models import AgentRun


UC_PAYLOAD = {
    "name": "Bench Test POC",
    "business_problem": "Test",
    "target_users": [],
    "document_types": [],
    "success_criteria": [],
    "answer_style": "concise",
}


def _create_uc(client):
    return client.post("/usecases", json=UC_PAYLOAD).json()


def test_benchmarks_empty(client):
    uc = _create_uc(client)
    r = client.get(f"/benchmarks/{uc['id']}")
    assert r.status_code == 200
    body = r.json()
    assert body["total_runs"] == 0
    assert body["completed_runs"] == 0
    assert body["avg_latency_ms"] is None
    assert body["total_cost_usd"] == 0.0
    assert body["providers"] == []
    assert body["recent_latencies"] == []


def test_benchmarks_not_found(client):
    r = client.get("/benchmarks/nonexistent-uc")
    assert r.status_code == 404


def test_benchmarks_with_runs(client, db_session):
    uc = _create_uc(client)
    uid = uc["id"]

    # Seed completed agent runs directly into the DB
    for i, (latency, cost, risk) in enumerate([
        (1200, 0.002, "low"),
        (800,  0.001, "low"),
        (3000, 0.005, "medium"),
        (600,  0.001, "low"),
    ]):
        run = AgentRun(
            usecase_id=uid,
            question=f"Question {i}",
            answer=f"Answer {i}",
            provider="openai",
            risk_level=risk,
            status="completed",
            latency_ms=latency,
            input_tokens=50,
            output_tokens=30,
            estimated_cost_usd=cost,
            created_at=datetime.utcnow(),
        )
        db_session.add(run)
    db_session.commit()

    r = client.get(f"/benchmarks/{uid}")
    assert r.status_code == 200
    body = r.json()

    assert body["total_runs"] == 4
    assert body["completed_runs"] == 4
    assert body["avg_latency_ms"] is not None
    assert body["p50_latency_ms"] is not None
    assert body["p95_latency_ms"] is not None
    assert body["total_input_tokens"] == 200
    assert body["total_output_tokens"] == 120
    assert body["total_cost_usd"] > 0
    assert len(body["providers"]) == 1
    assert body["providers"][0]["provider"] == "openai"
    assert body["providers"][0]["run_count"] == 4
    assert body["risk_distribution"]["low"] == 3
    assert body["risk_distribution"]["medium"] == 1
    assert body["risk_distribution"]["high"] == 0
    assert len(body["recent_latencies"]) == 4
