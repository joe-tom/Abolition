import pytest
from contextlib import contextmanager
from unittest.mock import patch, MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.db.models import Base

@pytest.fixture(autouse=True)
def test_db():
    test_engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(test_engine)
    TestSession = sessionmaker(test_engine, expire_on_commit=False)

    @contextmanager
    def _get_db():
        db = TestSession()
        try:
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    import backend.db.engine as engine_mod
    import backend.db.repos.sessions as sessions_mod
    import backend.db.repos.chapters as chapters_mod
    import backend.db.repos.references as references_mod
    import backend.db.repos.messages as messages_mod
    import backend.db.repos.memory as memory_mod

    patches = [
        patch.object(engine_mod, "get_db", _get_db),
        patch.object(sessions_mod, "get_db", _get_db),
        patch.object(chapters_mod, "get_db", _get_db),
        patch.object(references_mod, "get_db", _get_db),
        patch.object(messages_mod, "get_db", _get_db),
        patch.object(memory_mod, "get_db", _get_db),
    ]
    for p in patches:
        p.start()
    yield
    for p in patches:
        p.stop()

    Base.metadata.drop_all(test_engine)

@pytest.fixture(autouse=True)
def mock_orchestrator():
    with patch("backend.agents.orchestrator.create_deep_agent", return_value=MagicMock()):
        with patch("backend.agents.orchestrator.get_model", return_value=MagicMock()):
            yield
