import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from app.database.models import UseCase, Document, AgentRun
from app.schemas.usecase import UseCaseCreate, UseCaseListResponse


class UseCaseService:
    def __init__(self, db: Session):
        self.db = db

    def create(self, payload: UseCaseCreate) -> UseCase:
        uc = UseCase(
            id=str(uuid.uuid4()),
            name=payload.name,
            industry=payload.industry,
            business_problem=payload.business_problem,
            target_users=payload.target_users,
            document_types=payload.document_types,
            success_criteria=payload.success_criteria,
            answer_style=payload.answer_style,
        )
        self.db.add(uc)
        self.db.commit()
        self.db.refresh(uc)
        return uc

    def list_all(self) -> list:
        usecases = self.db.query(UseCase).order_by(UseCase.updated_at.desc()).all()
        results = []
        for uc in usecases:
            doc_count = self.db.query(Document).filter(Document.usecase_id == uc.id).count()
            run_count = self.db.query(AgentRun).filter(AgentRun.usecase_id == uc.id).count()
            results.append(UseCaseListResponse(
                id=uc.id,
                name=uc.name,
                industry=uc.industry,
                answer_style=uc.answer_style,
                created_at=uc.created_at,
                updated_at=uc.updated_at,
                document_count=doc_count,
                run_count=run_count,
            ))
        return results

    def get(self, usecase_id: str) -> UseCase | None:
        return self.db.query(UseCase).filter(UseCase.id == usecase_id).first()

    def update(self, usecase_id: str, payload: UseCaseCreate) -> UseCase | None:
        uc = self.get(usecase_id)
        if not uc:
            return None
        uc.name = payload.name
        uc.industry = payload.industry
        uc.business_problem = payload.business_problem
        uc.target_users = payload.target_users
        uc.document_types = payload.document_types
        uc.success_criteria = payload.success_criteria
        uc.answer_style = payload.answer_style
        uc.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(uc)
        return uc

    def delete(self, usecase_id: str) -> bool:
        uc = self.get(usecase_id)
        if not uc:
            return False
        self.db.delete(uc)
        self.db.commit()
        return True
