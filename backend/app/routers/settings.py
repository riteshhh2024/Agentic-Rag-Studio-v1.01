from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from app.config import get_settings

router = APIRouter(prefix="/settings", tags=["settings"])
settings = get_settings()

OLLAMA_BASE = "http://localhost:11434"


class OllamaStatus(BaseModel):
    running: bool
    version: Optional[str] = None
    models: list[str] = []
    error: Optional[str] = None


class SettingsResponse(BaseModel):
    default_model: str
    default_embedding_model: str
    default_provider: str
    vector_store: str
    app_env: str
    openai_key_set: bool
    upload_dir: str
    vector_store_dir: str
    token_cost_input_per_1k: float
    token_cost_output_per_1k: float
    cors_origins: list[str]
    ollama: OllamaStatus
    ollama_default_model: str
    ollama_default_embed_model: str


class ConnectionTestResponse(BaseModel):
    provider: str
    status: str          # ok | error
    model: str
    message: str
    latency_ms: Optional[int] = None


async def _check_ollama() -> OllamaStatus:
    """Non-blocking Ollama health probe. Returns within ~1 second either way."""
    import httpx
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            ver_resp = await client.get(f"{OLLAMA_BASE}/api/version")
            version = ver_resp.json().get("version") if ver_resp.status_code == 200 else None

            tags_resp = await client.get(f"{OLLAMA_BASE}/api/tags")
            models: list[str] = []
            if tags_resp.status_code == 200:
                models = [m["name"] for m in tags_resp.json().get("models", [])]

            return OllamaStatus(running=True, version=version, models=models)
    except Exception as e:
        return OllamaStatus(running=False, error=str(e)[:120])


@router.get("", response_model=SettingsResponse)
async def get_settings_endpoint():
    ollama = await _check_ollama()
    return SettingsResponse(
        default_model=settings.default_model,
        default_embedding_model=settings.default_embedding_model,
        default_provider=settings.default_provider,
        vector_store=settings.vector_store,
        app_env=settings.app_env,
        openai_key_set=bool(settings.openai_api_key and len(settings.openai_api_key) > 10),
        upload_dir=settings.upload_dir,
        vector_store_dir=settings.vector_store_dir,
        token_cost_input_per_1k=settings.token_cost_input_per_1k,
        token_cost_output_per_1k=settings.token_cost_output_per_1k,
        cors_origins=settings.cors_origins,
        ollama=ollama,
        ollama_default_model=settings.ollama_default_model,
        ollama_default_embed_model=settings.ollama_default_embed_model,
    )


@router.post("/test-ollama", response_model=ConnectionTestResponse)
async def test_ollama():
    """Test Ollama connectivity by generating a short response."""
    import time
    ollama_status = await _check_ollama()
    if not ollama_status.running:
        return ConnectionTestResponse(
            provider="ollama", status="error",
            model=settings.ollama_default_model,
            message="Ollama is not running. Start it with: ollama serve",
        )
    if not ollama_status.models:
        return ConnectionTestResponse(
            provider="ollama", status="error",
            model=settings.ollama_default_model,
            message=f"No models installed. Pull one with: ollama pull {settings.ollama_default_model}",
        )
    model = settings.ollama_default_model
    # If the configured model isn't pulled, fall back to the first available one
    if model not in ollama_status.models:
        model = ollama_status.models[0]
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key="ollama", base_url=f"{OLLAMA_BASE}/v1")
        t0 = time.time()
        resp = await client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": "Say OK"}],
            max_tokens=5,
        )
        ms = int((time.time() - t0) * 1000)
        return ConnectionTestResponse(
            provider="ollama", status="ok", model=model,
            message=f"Connected · response: {resp.choices[0].message.content.strip()}",
            latency_ms=ms,
        )
    except Exception as e:
        return ConnectionTestResponse(
            provider="ollama", status="error", model=model,
            message=str(e)[:200],
        )


@router.post("/test-connection", response_model=ConnectionTestResponse)
async def test_connection():
    import time
    if not settings.openai_api_key:
        return ConnectionTestResponse(
            provider="openai",
            status="error",
            model=settings.default_model,
            message="OPENAI_API_KEY is not set. Add it to backend/.env and restart the server.",
        )
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.openai_api_key)
        t0 = time.time()
        resp = await client.chat.completions.create(
            model=settings.default_model,
            messages=[{"role": "user", "content": "Say OK"}],
            max_tokens=5,
        )
        ms = int((time.time() - t0) * 1000)
        return ConnectionTestResponse(
            provider="openai",
            status="ok",
            model=settings.default_model,
            message=f"Connected · response: {resp.choices[0].message.content.strip()}",
            latency_ms=ms,
        )
    except Exception as e:
        return ConnectionTestResponse(
            provider="openai",
            status="error",
            model=settings.default_model,
            message=str(e)[:200],
        )
