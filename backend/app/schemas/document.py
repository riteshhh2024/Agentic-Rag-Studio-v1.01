from pydantic import BaseModel
from datetime import datetime


class DocumentResponse(BaseModel):
    id: str
    usecase_id: str
    filename: str
    file_type: str
    status: str
    text_length: int
    chunk_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ProcessResponse(BaseModel):
    document_id: str
    filename: str
    chunks_created: int
    status: str


class ProcessAllResponse(BaseModel):
    processed: int
    failed: int
    total_chunks: int
    results: list[ProcessResponse]
