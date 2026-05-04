from pydantic_settings import BaseSettings
from functools import lru_cache
import os

# Resolve the backend root directory (the folder containing app/)
_BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class Settings(BaseSettings):
    app_env: str = "development"
    database_url: str = f"sqlite:///{os.path.join(_BACKEND_ROOT, 'studio.db')}"
    vector_store: str = "chroma"
    openai_api_key: str = ""
    default_provider: str = "openai"
    default_model: str = "gpt-4o-mini"
    default_embedding_model: str = "text-embedding-3-small"
    ollama_base_url: str = "http://localhost:11434"
    ollama_default_model: str = "llama3.2:latest"
    ollama_default_embed_model: str = "nomic-embed-text"
    token_cost_input_per_1k: float = 0.00015
    token_cost_output_per_1k: float = 0.0006
    upload_dir: str = os.path.join(_BACKEND_ROOT, "uploads")
    vector_store_dir: str = os.path.join(_BACKEND_ROOT, "vector_store")
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5500",
        "http://localhost:8000",
        "null",
    ]

    class Config:
        env_file = os.path.join(_BACKEND_ROOT, ".env")
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
