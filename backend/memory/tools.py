from langchain_core.tools import tool
from backend.memory import store


@tool
def search_memory(query: str, top_k: int = 5) -> str:
    """Search long-term memory for relevant references or content from past sessions.
    Use this before starting research to avoid duplicating work.
    Returns Markdown list of matching items with source session info."""
    results = store.search(query, top_k=top_k)
    if not results:
        return "No relevant memory found."
    lines = []
    for r in results:
        lines.append(
            f"### [{r['type'].upper()}] {r['title']} (score: {r['score']})\n"
            f"Session: {r['session_id'] or 'global'}\n\n"
            f"{r['content'][:800]}"
        )
    return "\n\n---\n\n".join(lines)


@tool
def save_to_memory(title: str, content: str, type: str, session_id: str = "") -> str:
    """Save a reference or content snippet to long-term memory for future sessions.
    type must be 'reference' or 'content'.
    Call this after finding a useful paper or writing an important section."""
    if type not in ("reference", "content"):
        return "Error: type must be 'reference' or 'content'."
    item_id = store.save_item(
        title=title,
        content=content,
        type=type,
        session_id=session_id or None,
    )
    return f"Saved to memory: {item_id}"
