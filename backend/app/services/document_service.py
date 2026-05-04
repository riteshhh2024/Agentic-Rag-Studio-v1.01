import uuid
import os
import re
from pathlib import Path
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session
from app.database.models import Document, Chunk
from app.schemas.document import ProcessResponse, ProcessAllResponse
from app.config import get_settings

settings = get_settings()
ALLOWED_TYPES = {
    "text/plain": "txt",
    "text/markdown": "md",
    "application/pdf": "pdf",
    "application/octet-stream": "txt",  # fallback for .md files
}
ALLOWED_EXTENSIONS = {".txt", ".md", ".pdf"}


def _ext_to_type(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    mapping = {".txt": "txt", ".md": "md", ".pdf": "pdf"}
    return mapping.get(ext, "txt")


def _chunk_text(text: str, chunk_size: int = 800, chunk_overlap: int = 120) -> list[str]:
    """Simple recursive character text splitter."""
    if len(text) <= chunk_size:
        return [text]
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        # try to split at a sentence boundary
        last_period = chunk.rfind(". ")
        if last_period > chunk_size // 2:
            end = start + last_period + 1
            chunk = text[start:end]
        chunks.append(chunk.strip())
        start = end - chunk_overlap
    return [c for c in chunks if c]


class DocumentService:
    def __init__(self, db: Session):
        self.db = db

    async def upload(self, usecase_id: str, file: UploadFile) -> Document:
        ext = Path(file.filename).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"File type '{ext}' not supported. Use TXT, MD, or PDF.")

        os.makedirs(settings.upload_dir, exist_ok=True)
        doc_id = str(uuid.uuid4())
        safe_name = re.sub(r"[^\w\-.]", "_", file.filename)
        dest = os.path.join(settings.upload_dir, f"{doc_id}_{safe_name}")

        content = await file.read()
        with open(dest, "wb") as f:
            f.write(content)

        doc = Document(
            id=doc_id,
            usecase_id=usecase_id,
            filename=file.filename,
            file_type=_ext_to_type(file.filename),
            file_path=dest,
            status="uploaded",
            text_length=0,
            chunk_count=0,
        )
        self.db.add(doc)
        self.db.commit()
        self.db.refresh(doc)
        return doc

    def process(self, document_id: str) -> ProcessResponse | None:
        doc = self.db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            return None

        try:
            text = self._extract_text(doc.file_path, doc.file_type)
            text = self._clean_text(text)
            raw_chunks = _chunk_text(text)

            # Delete old chunks
            self.db.query(Chunk).filter(Chunk.document_id == doc.id).delete()

            for idx, chunk_text in enumerate(raw_chunks):
                chunk = Chunk(
                    id=str(uuid.uuid4()),
                    document_id=doc.id,
                    usecase_id=doc.usecase_id,
                    chunk_index=idx,
                    text=chunk_text,
                    metadata_={"filename": doc.filename, "chunk_index": idx},
                )
                self.db.add(chunk)

            doc.status = "processed"
            doc.text_length = len(text)
            doc.chunk_count = len(raw_chunks)
            self.db.commit()

            return ProcessResponse(
                document_id=doc.id,
                filename=doc.filename,
                chunks_created=len(raw_chunks),
                status="processed",
            )
        except Exception as e:
            doc.status = "failed"
            self.db.commit()
            raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

    def get(self, document_id: str) -> Document | None:
        return self.db.query(Document).filter(Document.id == document_id).first()

    def process_all(self, usecase_id: str) -> ProcessAllResponse:
        """Process every uploaded/failed document for a use case."""
        docs = (
            self.db.query(Document)
            .filter(
                Document.usecase_id == usecase_id,
                Document.status.in_(["uploaded", "failed"]),
            )
            .all()
        )
        results, processed, failed, total_chunks = [], 0, 0, 0
        for doc in docs:
            try:
                r = self.process(doc.id)
                results.append(r)
                processed += 1
                total_chunks += r.chunks_created
            except Exception:
                failed += 1
                results.append(ProcessResponse(
                    document_id=doc.id,
                    filename=doc.filename,
                    chunks_created=0,
                    status="failed",
                ))
        return ProcessAllResponse(
            processed=processed,
            failed=failed,
            total_chunks=total_chunks,
            results=results,
        )

    def list_for_usecase(self, usecase_id: str) -> list[Document]:
        return (
            self.db.query(Document)
            .filter(Document.usecase_id == usecase_id)
            .order_by(Document.created_at.desc())
            .all()
        )

    def delete(self, document_id: str) -> bool:
        doc = self.db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            return False
        if doc.file_path and os.path.exists(doc.file_path):
            os.remove(doc.file_path)
        self.db.delete(doc)
        self.db.commit()
        return True

    def _extract_text(self, file_path: str, file_type: str) -> str:
        if file_type in ("txt", "md"):
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                return f.read()
        if file_type == "pdf":
            return self._extract_pdf(file_path)
        return ""

    def _extract_pdf(self, file_path: str) -> str:
        try:
            import pypdf
            reader = pypdf.PdfReader(file_path)
            pages = []
            for page in reader.pages:
                pages.append(page.extract_text() or "")
            return "\n\n".join(pages)
        except ImportError:
            # Fallback: try pdfminer
            try:
                from pdfminer.high_level import extract_text
                return extract_text(file_path)
            except ImportError:
                raise HTTPException(status_code=400, detail="PDF support requires 'pypdf' package. Upload TXT or MD instead.")

    def _clean_text(self, text: str) -> str:
        # Remove excessive whitespace
        text = re.sub(r"\n{3,}", "\n\n", text)
        text = re.sub(r" {2,}", " ", text)
        return text.strip()
