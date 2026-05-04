from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.schemas.usecase import UseCaseCreate, UseCaseResponse, UseCaseListResponse
from app.services.usecase_service import UseCaseService

router = APIRouter(prefix="/usecases", tags=["usecases"])


@router.post("", response_model=UseCaseResponse, status_code=201)
async def create_usecase(payload: UseCaseCreate, db: Session = Depends(get_db)):
    service = UseCaseService(db)
    return service.create(payload)


@router.get("", response_model=list[UseCaseListResponse])
async def list_usecases(db: Session = Depends(get_db)):
    service = UseCaseService(db)
    return service.list_all()


@router.get("/{usecase_id}", response_model=UseCaseResponse)
async def get_usecase(usecase_id: str, db: Session = Depends(get_db)):
    service = UseCaseService(db)
    uc = service.get(usecase_id)
    if not uc:
        raise HTTPException(status_code=404, detail="Use case not found")
    return uc


@router.put("/{usecase_id}", response_model=UseCaseResponse)
async def update_usecase(usecase_id: str, payload: UseCaseCreate, db: Session = Depends(get_db)):
    service = UseCaseService(db)
    uc = service.update(usecase_id, payload)
    if not uc:
        raise HTTPException(status_code=404, detail="Use case not found")
    return uc


@router.delete("/{usecase_id}", status_code=204)
async def delete_usecase(usecase_id: str, db: Session = Depends(get_db)):
    service = UseCaseService(db)
    ok = service.delete(usecase_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Use case not found")
