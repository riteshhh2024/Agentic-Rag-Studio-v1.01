from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from app.database.db import get_db
from app.database.models import User

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    studio_id: str
    password: str


class RegisterRequest(BaseModel):
    studio_id: str
    password: str
    display_name: str = ""
    role: str = "admin"


class UserResponse(BaseModel):
    id: str
    studio_id: str
    display_name: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("/login", response_model=UserResponse)
async def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.studio_id == payload.studio_id.upper()).first()
    if not user or user.password != payload.password:
        raise HTTPException(status_code=401, detail="Invalid Studio ID or password.")
    return user


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.studio_id == payload.studio_id.upper()).first()
    if existing:
        raise HTTPException(status_code=409, detail="Studio ID already taken.")
    user = User(
        studio_id=payload.studio_id.upper(),
        password=payload.password,
        display_name=payload.display_name or payload.studio_id.upper(),
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/profile/{studio_id}", response_model=UserResponse)
async def get_profile(studio_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.studio_id == studio_id.upper()).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return user
