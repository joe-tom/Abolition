import pytest
from unittest.mock import patch, MagicMock

@pytest.fixture(autouse=True)
def mock_supabase():
    with patch("backend.db.client.create_client", return_value=MagicMock()):
        yield

@pytest.fixture(autouse=True)
def mock_orchestrator():
    with patch("backend.agents.orchestrator.create_deep_agent", return_value=MagicMock()):
        with patch("backend.agents.orchestrator.get_model", return_value=MagicMock()):
            yield
