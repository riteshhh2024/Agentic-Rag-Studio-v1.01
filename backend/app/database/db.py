from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import get_settings

settings = get_settings()

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},  # SQLite only
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from app.database import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    _run_migrations()


def _run_migrations():
    """Apply incremental schema changes that create_all cannot handle."""
    with engine.connect() as conn:
        # Add embedding_provider to rag_configs if it doesn't exist yet
        cols = [row[1] for row in conn.execute(
            __import__("sqlalchemy").text("PRAGMA table_info(rag_configs)")
        )]
        if "embedding_provider" not in cols:
            conn.execute(__import__("sqlalchemy").text(
                "ALTER TABLE rag_configs ADD COLUMN embedding_provider VARCHAR DEFAULT 'openai'"
            ))
            conn.commit()
