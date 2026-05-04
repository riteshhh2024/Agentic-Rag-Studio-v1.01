from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, PlainTextResponse
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.schemas.report import ReportGenerateRequest, ReportResponse, ReportSummary
from app.services.report_service import ReportService

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("/generate", response_model=ReportResponse, status_code=201)
async def generate_report(payload: ReportGenerateRequest, db: Session = Depends(get_db)):
    service = ReportService(db)
    return await service.generate(payload)


@router.get("/list/{usecase_id}", response_model=list[ReportSummary])
async def list_reports(usecase_id: str, db: Session = Depends(get_db)):
    service = ReportService(db)
    reports = service.list_reports(usecase_id)
    return [
        ReportSummary(
            id=r.id,
            usecase_id=r.usecase_id,
            title=r.title,
            format=r.format,
            created_at=r.created_at,
            download_url=f"/reports/{r.id}/download",
        )
        for r in reports
    ]


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(report_id: str, db: Session = Depends(get_db)):
    service = ReportService(db)
    report = service.get(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return ReportResponse(
        id=report.id,
        usecase_id=report.usecase_id,
        title=report.title,
        format=report.format,
        created_at=report.created_at,
        download_url=f"/reports/{report.id}/download",
    )


@router.get("/{report_id}/download")
async def download_report(report_id: str, db: Session = Depends(get_db)):
    service = ReportService(db)
    report = service.get(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    content = service.get_content(report)
    return PlainTextResponse(content, media_type="text/markdown", headers={
        "Content-Disposition": f'attachment; filename="{report_id}.md"'
    })
