"""
Shared pytest fixtures — in-memory SQLite test database, test client.

SQLite :memory: creates a new database per connection. We pin all
sessions to one shared connection so create_all and queries see the
same tables.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database.db import Base, get_db
from app.database import models  # noqa: registers all ORM models with Base.metadata
from app.main import app


@pytest.fixture()
def db_engine():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture()
def db_session(db_engine):
    """
    Pin a single connection + nested transaction for the whole test.
    Rolls back after the test so no state leaks between tests.
    """
    connection = db_engine.connect()
    transaction = connection.begin()

    Session = sessionmaker(bind=connection, autocommit=False, autoflush=False)
    session = Session()

    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture()
def client(db_session):
    """FastAPI test client backed by in-memory SQLite session."""

    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
    app.dependency_overrides.clear()
