from langchain_core.tools import tool
from langchain_core.runnables import RunnableConfig
from backend.db.repos.references import upsert_reference


@tool
def save_reference(
    cite_key: str,
    title: str,
    summary: str,
    bibtex: str,
    source: str,
    config: RunnableConfig,
) -> str:
    """Save a single academic reference to the session library.
    Call this for EVERY paper found during research.
    source must be one of: arxiv, semantic_scholar, tavily, upload.
    cite_key example: smith2024attention"""
    session_id = (config.get("configurable") or {}).get("thread_id", "")
    if not session_id:
        return "Error: no session_id in config."
    ref = upsert_reference(
        session_id=session_id,
        cite_key=cite_key,
        title=title,
        summary_md=summary,
        bibtex_raw=bibtex,
        source=source,
    )
    return f"Saved: {ref['id']}"
