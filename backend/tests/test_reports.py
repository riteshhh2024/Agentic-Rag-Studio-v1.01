"""Tests for /reports list and get endpoints"""
from datetime import datetime
from app.database.models import Report


UC_PAYLOAD = {
    "name": "Report Test POC",
    "business_problem": "Test",
    "target_users": [],
    "document_types": [],
    "success_criteria": [],
    "answer_style": "concise",
}


def _create_uc(client):
    return client.post("/usecases", json=UC_PAYLOAD).json()


def test_list_reports_empty(client):
    uc = _create_uc(client)
    r = client.get(f"/reports/list/{uc['id']}")
    assert r.status_code == 200
    assert r.json() == []


def test_list_reports_returns_summaries(client, db_session):
    uc = _create_uc(client)
    uid = uc["id"]

    # Seed report rows directly
    for title in ["POC Report v1", "POC Report v2"]:
        db_session.add(Report(
            usecase_id=uid,
            title=title,
            format="markdown",
            file_path=None,
            created_at=datetime.utcnow(),
        ))
    db_session.commit()

    r = client.get(f"/reports/list/{uid}")
    assert r.status_code == 200
    items = r.json()
    assert len(items) == 2
    titles = {i["title"] for i in items}
    assert "POC Report v1" in titles
    assert "POC Report v2" in titles
    # Each summary must have a download_url
    for item in items:
        assert "download_url" in item
        assert item["download_url"].startswith("/reports/")


def test_get_report_not_found(client):
    r = client.get("/reports/nonexistent-id")
    assert r.status_code == 404
