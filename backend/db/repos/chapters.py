from uuid import uuid4
from backend.db.client import get_client

def create_chapter(session_id: str, order_index: int, title: str) -> dict:
    return get_client().table("chapters").insert({
        "id": str(uuid4()), "session_id": session_id,
        "order_index": order_index, "title": title, "status": "draft"
    }).execute().data[0]

def update_chapter(chapter_id: str, **fields) -> dict:
    return get_client().table("chapters").update(fields).eq("id", chapter_id).execute().data[0]

def get_chapters(session_id: str) -> list[dict]:
    return get_client().table("chapters").select("*").eq("session_id", session_id).order("order_index").execute().data
