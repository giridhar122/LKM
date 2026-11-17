import logging
from typing import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings

logger = logging.getLogger(__name__)


def create_db_engine():
    """
    Creates and returns a SQLAlchemy Engine for MySQL 8.0.
    If MySQL connection fails and USE_SQLITE_FALLBACK is set (or auto-fallback is triggered),
    gracefully connects to local SQLite for uninterrupted development and automated testing.
    """
    db_uri = settings.SQLALCHEMY_DATABASE_URI

    if "mysql" in db_uri:
        try:
            # Check if MySQL server is reachable
            test_engine = create_engine(
                db_uri,
                pool_pre_ping=True,
                pool_recycle=3600,
                pool_size=10,
                max_overflow=20,
            )
            with test_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info(f"Connected to MySQL successfully: {settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}")
            return test_engine
        except Exception as e:
            logger.warning(
                f"Could not connect to MySQL at {settings.DB_HOST}:{settings.DB_PORT} ({e})."
            )
            if settings.USE_SQLITE_FALLBACK or "Access denied" in str(e) or "Can't connect" in str(e):
                logger.warning("Failing over to local SQLite database (lkm_smartdesk.db) for development/testing.")
                sqlite_uri = f"sqlite:///{settings.SQLITE_DB_PATH}"
                return create_engine(
                    sqlite_uri,
                    connect_args={"check_same_thread": False},
                )
            raise e
    else:
        # SQLite
        return create_engine(
            db_uri,
            connect_args={"check_same_thread": False},
        )


engine = create_db_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency for yielding a thread-safe database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
