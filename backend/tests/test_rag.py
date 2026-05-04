"""Tests for /rag/config endpoints"""


UC_PAYLOAD = {
    "name": "RAG Test POC",
    "business_problem": "Test problem",
    "target_users": [],
    "document_types": [],
    "success_criteria": [],
    "answer_style": "concise",
}

RAG_CONFIG = {
    "chunk_size": 600,
    "chunk_overlap": 80,
    "top_k": 5,
    "retrieval_mode": "vector",
    "reranking": False,
    "citation_required": True,
}


def _create_uc(client):
    return client.post("/usecases", json=UC_PAYLOAD).json()


def test_get_rag_config_no_config(client):
    uc = _create_uc(client)
    r = client.get(f"/rag/config/{uc['id']}")
    # API returns 404 when no config has been saved yet
    assert r.status_code == 404


def test_save_rag_config(client):
    uc = _create_uc(client)
    payload = {"usecase_id": uc["id"], **RAG_CONFIG}
    r = client.post("/rag/config", json=payload)
    assert r.status_code == 201
    body = r.json()
    assert body["chunk_size"] == 600
    assert body["chunk_overlap"] == 80


def test_get_saved_rag_config(client):
    uc = _create_uc(client)
    payload = {"usecase_id": uc["id"], **RAG_CONFIG}
    client.post("/rag/config", json=payload)
    r = client.get(f"/rag/config/{uc['id']}")
    assert r.status_code == 200
    assert r.json()["chunk_size"] == 600
