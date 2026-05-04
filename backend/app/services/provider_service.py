"""Inference provider abstraction.

Supported providers:
  - openai       — OpenAI API (requires OPENAI_API_KEY)
  - ollama       — Local Ollama server (http://localhost:11434, OpenAI-compatible API)
"""
import time
from app.config import get_settings

settings = get_settings()

OLLAMA_BASE_URL = "http://localhost:11434/v1"
OLLAMA_EMBED_URL = "http://localhost:11434/api/embeddings"

# Default model to use when provider=ollama and no model override given
OLLAMA_DEFAULT_CHAT_MODEL  = "llama3.2:latest"
OLLAMA_DEFAULT_EMBED_MODEL = "nomic-embed-text"


class EmbeddingProvider:
    def __init__(self, provider: str = "openai"):
        self.provider = provider

    async def embed(self, text: str) -> list[float]:
        return await self._embed_texts([text])

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        return await self._embed_texts(texts, batch=True)

    async def _embed_texts(self, texts: list[str], batch: bool = False) -> list | list[list]:
        if self.provider == "openai":
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=settings.openai_api_key)
            response = await client.embeddings.create(
                input=texts,
                model=settings.default_embedding_model,
            )
            embeddings = [e.embedding for e in response.data]
            return embeddings if batch else embeddings[0]

        if self.provider == "ollama":
            return await self._ollama_embed(texts, batch)

        raise ValueError(f"Unsupported embedding provider: {self.provider}")

    async def _ollama_embed(self, texts: list[str], batch: bool) -> list | list[list]:
        """Ollama /api/embeddings — one request per text (no batch endpoint)."""
        import httpx
        results = []
        async with httpx.AsyncClient(timeout=30.0) as client:
            for text in texts:
                resp = await client.post(
                    OLLAMA_EMBED_URL,
                    json={"model": OLLAMA_DEFAULT_EMBED_MODEL, "prompt": text},
                )
                resp.raise_for_status()
                results.append(resp.json()["embedding"])
        return results if batch else results[0]


class LLMProvider:
    def __init__(self, provider: str = "openai"):
        self.provider = provider

    async def generate(self, system_prompt: str, user_prompt: str, model: str | None = None) -> dict:
        """Returns dict with: content, input_tokens, output_tokens, latency_ms, estimated_cost_usd"""
        start = time.time()

        if self.provider == "openai":
            effective_model = model or settings.default_model
            content, in_tok, out_tok = await self._openai_generate(system_prompt, user_prompt, effective_model)
            cost = (
                (in_tok / 1000) * settings.token_cost_input_per_1k +
                (out_tok / 1000) * settings.token_cost_output_per_1k
            )

        elif self.provider == "ollama":
            effective_model = model or OLLAMA_DEFAULT_CHAT_MODEL
            content, in_tok, out_tok = await self._ollama_generate(system_prompt, user_prompt, effective_model)
            cost = 0.0  # local model — no token cost

        else:
            raise ValueError(f"Unsupported provider: {self.provider}")

        latency_ms = int((time.time() - start) * 1000)
        return {
            "content": content,
            "input_tokens": in_tok,
            "output_tokens": out_tok,
            "latency_ms": latency_ms,
            "estimated_cost_usd": round(cost, 6),
            "provider": self.provider,
            "model": effective_model,
        }

    async def _openai_generate(self, system_prompt: str, user_prompt: str, model: str) -> tuple[str, int, int]:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.openai_api_key)
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt},
            ],
            temperature=0.1,
        )
        msg = response.choices[0].message.content
        usage = response.usage
        in_tok  = usage.prompt_tokens     if usage else 0
        out_tok = usage.completion_tokens if usage else 0
        return msg, in_tok, out_tok

    async def _ollama_generate(self, system_prompt: str, user_prompt: str, model: str) -> tuple[str, int, int]:
        """Uses Ollama's OpenAI-compatible /v1/chat/completions endpoint."""
        from openai import AsyncOpenAI
        client = AsyncOpenAI(
            api_key="ollama",           # Ollama ignores the key but SDK requires a non-empty value
            base_url=OLLAMA_BASE_URL,
        )
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt},
            ],
            temperature=0.1,
        )
        msg = response.choices[0].message.content
        usage = response.usage
        in_tok  = usage.prompt_tokens     if usage else 0
        out_tok = usage.completion_tokens if usage else 0
        return msg, in_tok, out_tok
