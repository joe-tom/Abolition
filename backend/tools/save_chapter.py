import logging
from langchain_core.tools import tool
from langchain_core.runnables import RunnableConfig
from backend.db.repos.chapters import create_chapter, update_chapter, get_chapters

logger = logging.getLogger(__name__)


@tool
def save_chapter(
    order_index: int,
    title: str,
    latex: str,
    config: RunnableConfig,
) -> str:
    """Save or update a LaTeX chapter for the current session.
    Call this immediately after call_write_agent returns LaTeX content.
    order_index: 1-based chapter number (1, 2, 3, ...)
    title: chapter title
    latex: full LaTeX content returned by call_write_agent"""
    session_id = (config.get("configurable") or {}).get("thread_id", "")
    if not session_id:
        return "Error: no session_id in config."

    existing = next(
        (c for c in get_chapters(session_id) if c["order_index"] == order_index),
        None,
    )
    if existing:
        ch = update_chapter(existing["id"], title=title, latex=latex, status="draft")
        logger.info("save_chapter updated: id=%s order=%d", ch["id"], order_index)
    else:
        ch = create_chapter(session_id, order_index, title)
        ch = update_chapter(ch["id"], latex=latex, status="draft")
        logger.info("save_chapter created: id=%s order=%d", ch["id"], order_index)

    return f"Saved chapter {order_index}: {ch['id']}"
