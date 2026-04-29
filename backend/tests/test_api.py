from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock


def _get_client():
    from backend.main import app
    return TestClient(app)


def test_health():
    client = _get_client()
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_create_session():
    with patch("backend.routers.sessions.sessions_repo.create_session") as mock_create:
        mock_create.return_value = {"id": "abc", "topic": "AI safety", "status": "clarifying", "created_at": "2026-04-29T00:00:00Z"}
        client = _get_client()
        resp = client.post("/api/sessions", json={"topic": "AI safety"})
        assert resp.status_code == 200
        assert resp.json()["topic"] == "AI safety"


def test_list_sessions():
    with patch("backend.routers.sessions.sessions_repo.list_sessions") as mock_list:
        mock_list.return_value = []
        client = _get_client()
        resp = client.get("/api/sessions")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)


def test_chat_endpoint_returns_streaming_response():
    async def mock_stream(*args, **kwargs):
        yield {"event": "on_chat_model_stream", "data": {"chunk": MagicMock(content="Hello")}}
        yield {"event": "on_chat_model_stream", "data": {"chunk": MagicMock(content=" world")}}

    mock_agent = MagicMock()
    mock_agent.astream_events = mock_stream

    with patch("backend.routers.chat.get_orchestrator", return_value=mock_agent):
        from backend.main import app
        client = TestClient(app)
        resp = client.post("/api/sessions/test-session/chat", json={"message": "Write a paper on AI"})
        assert resp.status_code == 200
        assert "text/event-stream" in resp.headers["content-type"]


def test_download_output_returns_zip():
    mock_chapters = [{"id": "c1", "order_index": 0, "title": "Introduction", "latex": "\\section{Introduction}\nContent.", "status": "approved"}]
    mock_refs = [{"id": "r1", "cite_key": "smith2024", "bibtex_raw": "@article{smith2024, title={Test}}", "source": "arxiv"}]

    with patch("backend.routers.output.get_chapters", return_value=mock_chapters):
        with patch("backend.routers.output.get_references", return_value=mock_refs):
            from backend.main import app
            client = TestClient(app)
            resp = client.get("/api/sessions/test-session/download")
            assert resp.status_code == 200
            assert resp.headers["content-type"] == "application/zip"
