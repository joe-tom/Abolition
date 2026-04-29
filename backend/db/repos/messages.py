from uuid import uuid4
from backend.db.client import get_client

def save_message(session_id: str, role: str, content: str) -> dict:
    return get_client().table("messages").insert({
        "id": str(uuid4()), "session_id": session_id, "role": role, "content": content
    }).execute().data[0]

def get_messages(session_id: str) -> list[dict]:
    return get_client().table("messages").select("*").eq("session_id", session_id).order("created_at").execute().data
