from pydantic import BaseModel
from typing import Optional


class RagConfigCreate(BaseModel):
    usecase_id: str
    chunk_size: int = 800
    chunk_overlap: int = 120
    top_k: int = 5
    retrieval_mode: str = "vector"
    reranking: bool = False
    citation_required: bool = True
    embedding_provider: str = "openai"   # openai | ollama


class RagConfigResponse(BaseModel):
    id: str
    usecase_id: str
    chunk_size: int
    chunk_overlap: int
    top_k: int
    retrieval_mode: str
    reranking: bool
    citation_required: bool
    embedding_provider: str = "openai"

    model_config = {"from_attributes": True}


class RagIndexRequest(BaseModel):
    usecase_id: str
    embedding_provider: str = "openai"
    vector_store: str = "chroma"


class RagIndexResponse(BaseModel):
    usecase_id: str
    indexed_chunks: int
    status: str


class ChunkResult(BaseModel):
    chunk_id: str
    document_id: str
    filename: str
    score: float
    text_preview: str
    metadata: dict = {}


class RagRetrieveRequest(BaseModel):
    usecase_id: str
    query: str
    top_k: int = 5
    metadata_filter: Optional[dict] = None
    embedding_provider: str = "openai"   # must match what was used during indexing


class RagRetrieveResponse(BaseModel):
    query: str
    chunks: list[ChunkResult]
