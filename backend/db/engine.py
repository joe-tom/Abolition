from contextlib import contextmanager
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from backend.config import settings
from backend.db.models import Base

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},
)
_SessionFactory = sessionmaker(engine, expire_on_commit=False)

def init_db() -> None:
    Base.metadata.create_all(engine)
    with engine.connect() as conn:
        conn.execute(__import__("sqlalchemy").text(
            "CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts "
            "USING fts5(id UNINDEXED, title, content, tokenize='unicode61')"
        ))
        # migrate: add title column if missing
        cols = [r[1] for r in conn.execute(
            __import__("sqlalchemy").text("PRAGMA table_info(paper_references)")
        ).fetchall()]
        if "title" not in cols:
            conn.execute(__import__("sqlalchemy").text(
                "ALTER TABLE paper_references ADD COLUMN title TEXT"
            ))
        conn.commit()

@contextmanager
def get_db() -> Session:
    db = _SessionFactory()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
