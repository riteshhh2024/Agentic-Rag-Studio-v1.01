from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class UseCaseCreate(BaseModel):
    name: str = Field(..., min_length=1)
    industry: Optional[str] = None
    business_problem: str = Field(..., min_length=1)
    target_users: list[str] = Field(default_factory=list)
    document_types: list[str] = Field(default_factory=list)
    success_criteria: list[str] = Field(default_factory=list)
    answer_style: str = "concise"


class UseCaseResponse(BaseModel):
    id: str
    name: str
    industry: Optional[str]
    business_problem: str
    target_users: list[str]
    document_types: list[str]
    success_criteria: list[str]
    answer_style: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UseCaseListResponse(BaseModel):
    id: str
    name: str
    industry: Optional[str]
    answer_style: str
    created_at: datetime
    updated_at: datetime
    document_count: int = 0
    run_count: int = 0

    model_config = {"from_attributes": True}
