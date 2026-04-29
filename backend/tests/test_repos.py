from unittest.mock import MagicMock, patch
import importlib
import sys

def test_get_client_returns_singleton():
    # Remove cached module to reset singleton
    for mod in list(sys.modules.keys()):
        if 'backend.db.client' in mod:
            del sys.modules[mod]

    with patch("backend.db.client.create_client") as mock_create:
        mock_create.return_value = MagicMock()
        from backend.db.client import get_client
        import backend.db.client as client_mod
        client_mod._client = None  # reset singleton
        c1 = get_client()
        c2 = get_client()
        assert c1 is c2
        assert mock_create.call_count == 1


def _mock_supabase(return_data: list):
    mock_client = MagicMock()
    mock_execute = MagicMock()
    mock_execute.data = return_data
    mock_client.table.return_value.insert.return_value.execute.return_value = mock_execute
    mock_client.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = mock_execute
    mock_client.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value = mock_execute
    mock_client.table.return_value.update.return_value.eq.return_value.execute.return_value = mock_execute
    return mock_client

def test_create_session():
    expected = {"id": "abc", "topic": "AI safety", "status": "clarifying"}
    with patch("backend.db.repos.sessions.get_client", return_value=_mock_supabase([expected])):
        from backend.db.repos.sessions import create_session
        result = create_session("AI safety")
        assert result["topic"] == "AI safety"

def test_upsert_reference_inserts_new():
    with patch("backend.db.repos.references.get_client") as mock_get:
        mock_client = _mock_supabase([{"id": "ref1"}])
        # Make select().eq().eq().execute().data return empty list (no existing)
        mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = []
        mock_get.return_value = mock_client
        from backend.db.repos.references import upsert_reference
        result = upsert_reference("s1", "smith2024", "## Smith 2024", "@article{}", "arxiv")
        assert result["id"] == "ref1"
