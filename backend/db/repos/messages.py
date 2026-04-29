from uuid import uuid4
from sqlalchemy import select
from backend.db.engine import get_db
from backend.db.models import Message

def _row(obj: Message) -> dict:
    return {
        "id": obj.id, "session_id": obj.session_id,
        "role": obj.role, "content": obj.content,
        "created_at": obj.created_at.isoformat() if obj.created_at else None,
    }

def save_message(session_id: str, role: str, content: str) -> dict:
    with get_db() as db:
        obj = Message(id=str(uuid4()), session_id=session_id, role=role, content=content)
        db.add(obj)
        db.flush()
        return _row(obj)

def get_messages(session_id: str) -> list[dict]:
    with get_db() as db:
        rows = db.execute(
            select(Message).where(Message.session_id == session_id).order_by(Message.created_at)
        ).scalars().all()
        return [_row(r) for r in rows]
