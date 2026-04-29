from uuid import uuid4
from sqlalchemy import select, desc
from backend.db.engine import get_db
from backend.db.models import Session as SessionModel

def _row(obj: SessionModel) -> dict:
    return {
        "id": obj.id, "topic": obj.topic, "status": obj.status,
        "outline": obj.outline, "clarify_notes": obj.clarify_notes,
        "created_at": obj.created_at.isoformat() if obj.created_at else None,
    }

def create_session(topic: str) -> dict:
    with get_db() as db:
        obj = SessionModel(id=str(uuid4()), topic=topic, status="clarifying")
        db.add(obj)
        db.flush()
        return _row(obj)

def get_session(session_id: str) -> dict | None:
    with get_db() as db:
        obj = db.get(SessionModel, session_id)
        return _row(obj) if obj else None

def update_session(session_id: str, **fields) -> dict:
    with get_db() as db:
        obj = db.get(SessionModel, session_id)
        for k, v in fields.items():
            setattr(obj, k, v)
        db.flush()
        return _row(obj)

def list_sessions() -> list[dict]:
    with get_db() as db:
        rows = db.execute(select(SessionModel).order_by(desc(SessionModel.created_at))).scalars().all()
        return [_row(r) for r in rows]

def delete_session(session_id: str) -> bool:
    with get_db() as db:
        obj = db.get(SessionModel, session_id)
        if not obj:
            return False
        db.delete(obj)
        return True
