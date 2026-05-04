import os
import uuid
from sqlalchemy.orm import Session
from app.database.models import Chunk, Document, RagConfig
from app.schemas.rag import (
    RagIndexRequest, RagIndexResponse,
    RagRetrieveRequest, RagRetrieveResponse,
    RagConfigCreate, RagConfigResponse, ChunkResult,
)
from app.config import get_settings

settings = get_settings()


class RagService:
    def __init__(self, db: Session):
        self.db = db

    async def index(self, payload: RagIndexRequest) -> RagIndexResponse:
        chunks = (
            self.db.query(Chunk)
            .filter(Chunk.usecase_id == payload.usecase_id)
            .all()
        )
        if not chunks:
            return RagIndexResponse(usecase_id=payload.usecase_id, indexed_chunks=0, status="no_chunks")

        collection = self._get_collection(payload.usecase_id)
        embedder = self._get_embedder(payload.embedding_provider)

        # Index in batches
        batch_size = 50
        indexed = 0
        for i in range(0, len(chunks), batch_size):
            batch = chunks[i:i + batch_size]
            texts = [c.text for c in batch]
            ids = [c.id for c in batch]
            metadatas = [{"filename": c.metadata_.get("filename", ""), "chunk_index": c.chunk_index, "document_id": c.document_id} for c in batch]

            embeddings = await embedder.embed_batch(texts)
            collection.add(
                embeddings=embeddings,
                documents=texts,
                metadatas=metadatas,
                ids=ids,
            )
            # Store vector_id back to chunk
            for chunk in batch:
                chunk.vector_id = chunk.id
            indexed += len(batch)

        # Mark docs as indexed
        doc_ids = list({c.document_id for c in chunks})
        self.db.query(Document).filter(Document.id.in_(doc_ids)).update(
            {"status": "indexed"}, synchronize_session=False
        )
        self.db.commit()

        return RagIndexResponse(
            usecase_id=payload.usecase_id,
            indexed_chunks=indexed,
            status="indexed",
        )

    async def retrieve(self, payload: RagRetrieveRequest) -> RagRetrieveResponse:
        collection = self._get_collection(payload.usecase_id)
        embedder = self._get_embedder(payload.embedding_provider)

        query_embedding = await embedder.embed(payload.query)
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=min(payload.top_k, max(1, collection.count())),
            include=["documents", "metadatas", "distances"],
        )

        chunk_results = []
        for i, (doc_text, meta, dist) in enumerate(zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        )):
            score = max(0.0, 1.0 - dist)  # cosine distance to similarity
            chunk_results.append(ChunkResult(
                chunk_id=results["ids"][0][i],
                document_id=meta.get("document_id", ""),
                filename=meta.get("filename", ""),
                score=round(score, 4),
                text_preview=doc_text[:200],
                metadata=meta,
            ))

        return RagRetrieveResponse(query=payload.query, chunks=chunk_results)

    def save_config(self, payload: RagConfigCreate) -> RagConfig:
        existing = self.get_config(payload.usecase_id)
        if existing:
            existing.chunk_size = payload.chunk_size
            existing.chunk_overlap = payload.chunk_overlap
            existing.top_k = payload.top_k
            existing.retrieval_mode = payload.retrieval_mode
            existing.reranking = payload.reranking
            existing.citation_required = payload.citation_required
            existing.embedding_provider = payload.embedding_provider
            self.db.commit()
            self.db.refresh(existing)
            return existing

        config = RagConfig(
            id=str(uuid.uuid4()),
            usecase_id=payload.usecase_id,
            chunk_size=payload.chunk_size,
            chunk_overlap=payload.chunk_overlap,
            top_k=payload.top_k,
            retrieval_mode=payload.retrieval_mode,
            reranking=payload.reranking,
            citation_required=payload.citation_required,
            embedding_provider=payload.embedding_provider,
        )
        self.db.add(config)
        self.db.commit()
        self.db.refresh(config)
        return config

    def get_config(self, usecase_id: str) -> RagConfig | None:
        return (
            self.db.query(RagConfig)
            .filter(RagConfig.usecase_id == usecase_id)
            .order_by(RagConfig.created_at.desc())
            .first()
        )

    def _get_collection(self, usecase_id: str):
        import chromadb
        os.makedirs(settings.vector_store_dir, exist_ok=True)
        client = chromadb.PersistentClient(path=settings.vector_store_dir)
        safe_id = usecase_id.replace("-", "_")
        return client.get_or_create_collection(
            name=f"uc_{safe_id}",
            metadata={"hnsw:space": "cosine"},
        )

    def _get_embedder(self, provider: str):
        from app.services.provider_service import EmbeddingProvider
        return EmbeddingProvider(provider)

    async def retrieve_for_agent(self, usecase_id: str, query: str, top_k: int = 5) -> list[ChunkResult]:
        try:
            collection = self._get_collection(usecase_id)
            if collection.count() == 0:
                return []   # documents not indexed yet — caller shows "no context" message
            # Use the embedding provider that was saved with the RAG config
            config = self.get_config(usecase_id)
            embedding_provider = config.embedding_provider if config else "openai"
            result = await self.retrieve(
                RagRetrieveRequest(
                    usecase_id=usecase_id,
                    query=query,
                    top_k=top_k,
                    embedding_provider=embedding_provider,
                )
            )
            return result.chunks
        except Exception:
            return []
