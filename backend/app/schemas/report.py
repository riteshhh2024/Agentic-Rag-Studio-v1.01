from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ReportGenerateRequest(BaseModel):
    usecase_id: str
    include_evaluation: bool = True
    include_architecture: bool = True
    format: str = "markdown"


class ReportResponse(BaseModel):
    id: str
    usecase_id: str
    title: str
    format: str
    created_at: datetime
    download_url: str

    model_config = {"from_attributes": True}


class ReportSummary(BaseModel):
    id: str
    usecase_id: str
    title: str
    format: str
    created_at: datetime
    download_url: str

    model_config = {"from_attributes": True}
