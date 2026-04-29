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
