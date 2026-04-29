from uuid import uuid4
from sqlalchemy import select
from backend.db.engine import get_db
from backend.db.models import PaperReference

def _row(obj: PaperReference) -> dict:
    return {
        "id": obj.id, "session_id": obj.session_id,
        "title": obj.title, "cite_key": obj.cite_key,
        "summary_md": obj.summary_md, "bibtex_raw": obj.bibtex_raw,
        "source": obj.source,
        "created_at": obj.created_at.isoformat() if obj.created_at else None,
    }

def upsert_reference(session_id: str, cite_key: str, title: str, summary_md: str, bibtex_raw: str, source: str) -> dict:
    with get_db() as db:
        existing = db.execute(
            select(PaperReference)
            .where(PaperReference.session_id == session_id, PaperReference.cite_key == cite_key)
        ).scalar_one_or_none()
        if existing:
            existing.title = title
            existing.summary_md = summary_md
            existing.bibtex_raw = bibtex_raw
            db.flush()
            return _row(existing)
        obj = PaperReference(
            id=str(uuid4()), session_id=session_id, cite_key=cite_key,
            title=title, summary_md=summary_md, bibtex_raw=bibtex_raw, source=source,
        )
        db.add(obj)
        db.flush()
        return _row(obj)

def get_references(session_id: str) -> list[dict]:
    with get_db() as db:
        rows = db.execute(
            select(PaperReference).where(PaperReference.session_id == session_id)
            .order_by(PaperReference.created_at)
        ).scalars().all()
        return [_row(r) for r in rows]

def get_library_references() -> list[dict]:
    """All references across sessions, deduplicated by cite_key (latest wins)."""
    with get_db() as db:
        # subquery: latest created_at per cite_key
        from sqlalchemy import func
        subq = (
            db.execute(
                select(
                    PaperReference.cite_key,
                    func.max(PaperReference.created_at).label("latest"),
                )
                .group_by(PaperReference.cite_key)
            ).all()
        )
        latest_map = {row.cite_key: row.latest for row in subq}
        if not latest_map:
            return []
        rows = db.execute(
            select(PaperReference).where(
                PaperReference.created_at.in_(list(latest_map.values()))
            ).order_by(PaperReference.created_at.desc())
        ).scalars().all()
        # dedup in Python in case of created_at collision
        seen: set[str] = set()
        result = []
        for r in rows:
            if r.cite_key not in seen:
                seen.add(r.cite_key)
                result.append(_row(r))
        return result
