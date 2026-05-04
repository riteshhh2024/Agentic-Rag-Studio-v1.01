"""Tests for GET /health"""


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["service"] == "agentic-rag-solution-studio"
    assert "version" in body
    assert "timestamp" in body
