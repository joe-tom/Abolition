def test_create_session():
    from backend.db.repos.sessions import create_session
    result = create_session("AI safety")
    assert result["topic"] == "AI safety"
    assert result["status"] == "clarifying"
    assert result["id"] is not None

def test_list_sessions_returns_all():
    from backend.db.repos.sessions import create_session, list_sessions
    create_session("First")
    create_session("Second")
    topics = {r["topic"] for r in list_sessions()}
    assert {"First", "Second"} == topics

def test_upsert_reference_inserts_new():
    from backend.db.repos.sessions import create_session
    from backend.db.repos.references import upsert_reference, get_references
    session = create_session("test")
    ref = upsert_reference(session["id"], "smith2024", "## Smith", "@article{}", "arxiv")
    assert ref["cite_key"] == "smith2024"
    assert len(get_references(session["id"])) == 1

def test_upsert_reference_updates_existing():
    from backend.db.repos.sessions import create_session
    from backend.db.repos.references import upsert_reference, get_references
    session = create_session("test")
    upsert_reference(session["id"], "smith2024", "## Old", "@article{old}", "arxiv")
    upsert_reference(session["id"], "smith2024", "## New", "@article{new}", "arxiv")
    refs = get_references(session["id"])
    assert len(refs) == 1
    assert refs[0]["summary_md"] == "## New"
