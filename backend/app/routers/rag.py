from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.schemas.rag import (
    RagIndexRequest, RagIndexResponse,
    RagRetrieveRequest, RagRetrieveResponse,
    RagConfigCreate, RagConfigResponse,
)
from app.services.rag_service import RagService

router = APIRouter(prefix="/rag", tags=["rag"])


@router.post("/index", response_model=RagIndexResponse)
async def index_documents(payload: RagIndexRequest, db: Session = Depends(get_db)):
    service = RagService(db)
    return await service.index(payload)


@router.post("/retrieve", response_model=RagRetrieveResponse)
async def retrieve(payload: RagRetrieveRequest, db: Session = Depends(get_db)):
    service = RagService(db)
    return await service.retrieve(payload)


@router.post("/config", response_model=RagConfigResponse, status_code=201)
async def save_config(payload: RagConfigCreate, db: Session = Depends(get_db)):
    service = RagService(db)
    return service.save_config(payload)


@router.get("/config/{usecase_id}", response_model=RagConfigResponse)
async def get_config(usecase_id: str, db: Session = Depends(get_db)):
    service = RagService(db)
    config = service.get_config(usecase_id)
    if not config:
        raise HTTPException(status_code=404, detail="RAG config not found")
    return config
