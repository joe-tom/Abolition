from uuid import uuid4
from backend.db.client import get_client

def save_memory(session_id: str, agent: str, content: str) -> dict:
    return get_client().table("agent_memory").insert({
        "id": str(uuid4()), "session_id": session_id, "agent": agent, "content": content
    }).execute().data[0]

def get_memory(session_id: str, agent: str) -> list[dict]:
    return get_client().table("agent_memory").select("*").eq("session_id", session_id).eq("agent", agent).order("created_at").execute().data
