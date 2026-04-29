from uuid import uuid4
from backend.db.client import get_client

def create_session(topic: str) -> dict:
    return get_client().table("sessions").insert({
        "id": str(uuid4()), "topic": topic, "status": "clarifying"
    }).execute().data[0]

def get_session(session_id: str) -> dict:
    return get_client().table("sessions").select("*").eq("id", session_id).single().execute().data

def update_session(session_id: str, **fields) -> dict:
    return get_client().table("sessions").update(fields).eq("id", session_id).execute().data[0]

def list_sessions() -> list[dict]:
    return get_client().table("sessions").select("*").order("created_at", desc=True).execute().data
