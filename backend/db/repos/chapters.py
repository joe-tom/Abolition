from uuid import uuid4
from sqlalchemy import select
from backend.db.engine import get_db
from backend.db.models import Chapter

def _row(obj: Chapter) -> dict:
    return {
        "id": obj.id, "session_id": obj.session_id,
        "order_index": obj.order_index, "title": obj.title,
        "latex": obj.latex, "status": obj.status, "critic_log": obj.critic_log,
        "created_at": obj.created_at.isoformat() if obj.created_at else None,
    }

def create_chapter(session_id: str, order_index: int, title: str) -> dict:
    with get_db() as db:
        obj = Chapter(id=str(uuid4()), session_id=session_id, order_index=order_index, title=title, status="draft")
        db.add(obj)
        db.flush()
        return _row(obj)

def update_chapter(chapter_id: str, **fields) -> dict:
    with get_db() as db:
        obj = db.get(Chapter, chapter_id)
        for k, v in fields.items():
            setattr(obj, k, v)
        db.flush()
        return _row(obj)

def get_chapters(session_id: str) -> list[dict]:
    with get_db() as db:
        rows = db.execute(
            select(Chapter).where(Chapter.session_id == session_id).order_by(Chapter.order_index)
        ).scalars().all()
        return [_row(r) for r in rows]
