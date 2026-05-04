"""Tests for /usecases CRUD"""
import pytest


UC_PAYLOAD = {
    "name": "Test POC",
    "industry": "Finance",
    "business_problem": "Analysts spend hours manually reviewing regulatory filings.",
    "target_users": ["analysts", "compliance officers"],
    "document_types": ["PDFs", "DOCX"],
    "success_criteria": ["95% citation coverage", "p95 latency < 3s"],
    "answer_style": "concise",
}


def test_create_usecase(client):
    r = client.post("/usecases", json=UC_PAYLOAD)
    assert r.status_code == 201
    body = r.json()
    assert body["name"] == UC_PAYLOAD["name"]
    assert body["industry"] == UC_PAYLOAD["industry"]
    assert "id" in body


def test_list_usecases_empty(client):
    r = client.get("/usecases")
    assert r.status_code == 200
    assert r.json() == []


def test_list_usecases_after_create(client):
    client.post("/usecases", json=UC_PAYLOAD)
    r = client.get("/usecases")
    assert r.status_code == 200
    assert len(r.json()) == 1


def test_get_usecase(client):
    created = client.post("/usecases", json=UC_PAYLOAD).json()
    r = client.get(f"/usecases/{created['id']}")
    assert r.status_code == 200
    assert r.json()["id"] == created["id"]


def test_get_usecase_not_found(client):
    r = client.get("/usecases/does-not-exist")
    assert r.status_code == 404


def test_update_usecase(client):
    created = client.post("/usecases", json=UC_PAYLOAD).json()
    updated_payload = {**UC_PAYLOAD, "name": "Renamed POC"}
    r = client.put(f"/usecases/{created['id']}", json=updated_payload)
    assert r.status_code == 200
    assert r.json()["name"] == "Renamed POC"


def test_delete_usecase(client):
    created = client.post("/usecases", json=UC_PAYLOAD).json()
    r = client.delete(f"/usecases/{created['id']}")
    assert r.status_code == 204
    r2 = client.get(f"/usecases/{created['id']}")
    assert r2.status_code == 404
