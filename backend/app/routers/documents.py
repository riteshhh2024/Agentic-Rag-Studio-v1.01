from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.schemas.document import DocumentResponse, ProcessResponse, ProcessAllResponse
from app.services.document_service import DocumentService

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload", response_model=DocumentResponse, status_code=201)
async def upload_document(
    usecase_id: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    service = DocumentService(db)
    return await service.upload(usecase_id, file)


@router.post("/process-all", response_model=ProcessAllResponse)
async def process_all_documents(usecase_id: str, db: Session = Depends(get_db)):
    """Process (parse + chunk) every unprocessed document for a use case."""
    service = DocumentService(db)
    return service.process_all(usecase_id)


@router.post("/{document_id}/process", response_model=ProcessResponse)
async def process_document(document_id: str, db: Session = Depends(get_db)):
    service = DocumentService(db)
    result = service.process(document_id)
    if not result:
        raise HTTPException(status_code=404, detail="Document not found")
    return result


@router.get("", response_model=list[DocumentResponse])
async def list_documents(usecase_id: str, db: Session = Depends(get_db)):
    service = DocumentService(db)
    return service.list_for_usecase(usecase_id)


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(document_id: str, db: Session = Depends(get_db)):
    service = DocumentService(db)
    doc = service.get(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.delete("/{document_id}", status_code=204)
async def delete_document(document_id: str, db: Session = Depends(get_db)):
    service = DocumentService(db)
    ok = service.delete(document_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Document not found")
