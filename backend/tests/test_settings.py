"""Tests for /settings endpoints"""


def test_get_settings(client):
    r = client.get("/settings")
    assert r.status_code == 200
    body = r.json()
    assert "default_model" in body
    assert "default_embedding_model" in body
    assert "default_provider" in body
    assert "vector_store" in body
    assert "app_env" in body
    assert isinstance(body["openai_key_set"], bool)
    assert "upload_dir" in body
    assert "vector_store_dir" in body
    assert isinstance(body["token_cost_input_per_1k"], float)
    assert isinstance(body["token_cost_output_per_1k"], float)
    assert isinstance(body["cors_origins"], list)
    # Ollama probe result is always present (running or not)
    assert "ollama" in body
    assert "running" in body["ollama"]
    assert isinstance(body["ollama"]["running"], bool)


def test_get_settings_has_reasonable_defaults(client):
    r = client.get("/settings")
    body = r.json()
    assert body["default_provider"] == "openai"
    assert body["vector_store"] == "chroma"
    assert body["app_env"] in ("development", "production", "test")
    assert body["token_cost_input_per_1k"] > 0
    assert body["token_cost_output_per_1k"] > 0
