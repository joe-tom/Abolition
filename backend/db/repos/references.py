from uuid import uuid4
from backend.db.client import get_client

def upsert_reference(session_id: str, cite_key: str, summary_md: str, bibtex_raw: str, source: str) -> dict:
    existing = get_client().table("paper_references").select("id").eq("session_id", session_id).eq("cite_key", cite_key).execute().data
    if existing:
        return get_client().table("paper_references").update({"summary_md": summary_md, "bibtex_raw": bibtex_raw}).eq("id", existing[0]["id"]).execute().data[0]
    return get_client().table("paper_references").insert({
        "id": str(uuid4()), "session_id": session_id, "cite_key": cite_key,
        "summary_md": summary_md, "bibtex_raw": bibtex_raw, "source": source
    }).execute().data[0]

def get_references(session_id: str) -> list[dict]:
    return get_client().table("paper_references").select("*").eq("session_id", session_id).execute().data
