from uuid import uuid4
from sqlalchemy import select, text
from backend.db.engine import get_db
from backend.db.models import MemoryItem
from backend.memory.embedder import embed, cosine


def save_item(title: str, content: str, type: str, session_id: str | None = None) -> str:
    item_id = str(uuid4())
    emb = embed(f"{title}\n{content}")
    with get_db() as db:
        obj = MemoryItem(
            id=item_id,
            session_id=session_id,
            type=type,
            title=title,
            content=content,
            embedding=emb,
        )
        db.add(obj)
        db.flush()
        db.execute(
            text("INSERT INTO memory_fts(id, title, content) VALUES (:id, :title, :content)"),
            {"id": item_id, "title": title, "content": content},
        )
    return item_id


def search(query: str, top_k: int = 5) -> list[dict]:
    query_emb = embed(query)

    with get_db() as db:
        # FTS candidates (up to 50)
        fts_rows = db.execute(
            text("SELECT id FROM memory_fts WHERE memory_fts MATCH :q LIMIT 50"),
            {"q": query},
        ).fetchall()
        fts_ids = {r[0] for r in fts_rows}

        # All items for vector scoring
        all_items = db.execute(select(MemoryItem)).scalars().all()

        scored = []
        for item in all_items:
            vec_score = cosine(query_emb, item.embedding) if item.embedding else 0.0
            fts_score = 1.0 if item.id in fts_ids else 0.0
            # hybrid: 70% vector + 30% FTS
            score = 0.7 * vec_score + 0.3 * fts_score
            scored.append((score, item))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [
            {
                "id": item.id,
                "type": item.type,
                "title": item.title,
                "content": item.content,
                "session_id": item.session_id,
                "score": round(score, 4),
            }
            for score, item in scored[:top_k]
            if score > 0.1
        ]
