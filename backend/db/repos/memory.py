from uuid import uuid4
from sqlalchemy import select
from backend.db.engine import get_db
from backend.db.models import AgentMemory

def _row(obj: AgentMemory) -> dict:
    return {
        "id": obj.id, "session_id": obj.session_id,
        "agent": obj.agent, "content": obj.content,
        "created_at": obj.created_at.isoformat() if obj.created_at else None,
    }

def save_memory(session_id: str, agent: str, content: str) -> dict:
    with get_db() as db:
        obj = AgentMemory(id=str(uuid4()), session_id=session_id, agent=agent, content=content)
        db.add(obj)
        db.flush()
        return _row(obj)

def get_memory(session_id: str, agent: str) -> list[dict]:
    with get_db() as db:
        rows = db.execute(
            select(AgentMemory)
            .where(AgentMemory.session_id == session_id, AgentMemory.agent == agent)
            .order_by(AgentMemory.created_at)
        ).scalars().all()
        return [_row(r) for r in rows]
