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
