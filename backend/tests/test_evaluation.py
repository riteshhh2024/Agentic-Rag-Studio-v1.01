"""Tests for /evaluation golden questions and run listing"""


UC_PAYLOAD = {
    "name": "Eval Test POC",
    "business_problem": "Test",
    "target_users": [],
    "document_types": [],
    "success_criteria": [],
    "answer_style": "concise",
}


def _create_uc(client):
    return client.post("/usecases", json=UC_PAYLOAD).json()


def test_add_golden_questions(client):
    uc = _create_uc(client)
    r = client.post("/evaluation/golden-questions", json={
        "usecase_id": uc["id"],
        "questions": [
            {"question": "What is the refund policy?", "expected_answer": "30 days.", "tags": ["policy"]},
            {"question": "How do I escalate?", "expected_answer": "Contact Tier-2.", "tags": []},
        ],
    })
    assert r.status_code == 201
    body = r.json()
    # Returns list of created GoldenQuestion objects
    assert isinstance(body, list)
    assert len(body) == 2
    assert body[0]["question"] == "What is the refund policy?"


def test_list_golden_questions(client):
    uc = _create_uc(client)
    client.post("/evaluation/golden-questions", json={
        "usecase_id": uc["id"],
        "questions": [{"question": "Test Q?", "expected_answer": "Test A."}],
    })
    r = client.get(f"/evaluation/golden-questions/{uc['id']}")
    assert r.status_code == 200
    items = r.json()
    assert len(items) == 1
    assert items[0]["question"] == "Test Q?"


def test_delete_golden_question(client):
    uc = _create_uc(client)
    client.post("/evaluation/golden-questions", json={
        "usecase_id": uc["id"],
        "questions": [{"question": "To delete?", "expected_answer": "Yes."}],
    })
    questions = client.get(f"/evaluation/golden-questions/{uc['id']}").json()
    qid = questions[0]["id"]

    r = client.delete(f"/evaluation/golden-questions/{qid}")
    assert r.status_code == 204

    remaining = client.get(f"/evaluation/golden-questions/{uc['id']}").json()
    assert len(remaining) == 0


def test_list_evaluations_empty(client):
    uc = _create_uc(client)
    r = client.get(f"/evaluation/list/{uc['id']}")
    assert r.status_code == 200
    assert r.json() == []
