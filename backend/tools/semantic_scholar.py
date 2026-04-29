from langchain_core.tools import tool
import httpx

_API = "https://api.semanticscholar.org/graph/v1/paper/search"
_FIELDS = "title,authors,year,abstract,externalIds,citationCount"


@tool
def semantic_scholar_search(query: str, limit: int = 10) -> str:
    """Search Semantic Scholar for academic papers. Returns Markdown with citation info."""
    resp = httpx.get(_API, params={"query": query, "limit": limit, "fields": _FIELDS}, timeout=30)
    resp.raise_for_status()
    papers = resp.json().get("data", [])
    lines = []
    for p in papers:
        authors = ", ".join(a["name"] for a in p.get("authors", []))
        doi = p.get("externalIds", {}).get("DOI", "N/A")
        abstract = (p.get("abstract") or "")[:600]
        lines.append(
            f"## {p['title']}\n"
            f"**Authors:** {authors}\n"
            f"**Year:** {p.get('year', 'N/A')} | **Citations:** {p.get('citationCount', 0)}\n"
            f"**DOI:** {doi}\n"
            f"**Abstract:** {abstract}..."
        )
    return "\n\n---\n\n".join(lines) if lines else "No results found."
