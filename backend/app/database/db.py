from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import get_settings

settings = get_settings()

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},
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
    import uuid
    from datetime import datetime
    sa = __import__("sqlalchemy")

    with engine.connect() as conn:
        # Add embedding_provider to rag_configs if missing
        cols = [row[1] for row in conn.execute(sa.text("PRAGMA table_info(rag_configs)"))]
        if "embedding_provider" not in cols:
            conn.execute(sa.text(
                "ALTER TABLE rag_configs ADD COLUMN embedding_provider VARCHAR DEFAULT 'openai'"
            ))
            conn.commit()

        # Seed default provider config if not present
        pc = conn.execute(sa.text("SELECT value FROM app_settings WHERE key = 'active_provider'")).fetchone()
        if not pc:
            defaults = [
                ("active_provider",   "openai"),
                ("active_chat_model", "gpt-4o-mini"),
                ("active_embed_model","text-embedding-3-small"),
            ]
            for k, v in defaults:
                conn.execute(sa.text("INSERT OR IGNORE INTO app_settings (key, value) VALUES (:k, :v)"), {"k": k, "v": v})
            conn.commit()

        # Seed default admin user if not present
        row = conn.execute(sa.text("SELECT id FROM users WHERE studio_id = 'ADMIN101'")).fetchone()
        if not row:
            conn.execute(sa.text(
                "INSERT INTO users (id, studio_id, password, display_name, role, created_at) "
                "VALUES (:id, :sid, :pw, :dn, :role, :ca)"
            ), {
                "id":   str(uuid.uuid4()),
                "sid":  "ADMIN101",
                "pw":   "12345",
                "dn":   "Admin",
                "role": "admin",
                "ca":   datetime.utcnow().isoformat(),
            })
            conn.commit()
