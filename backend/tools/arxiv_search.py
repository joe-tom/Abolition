from langchain_core.tools import tool
import arxiv


@tool
def arxiv_search(query: str, max_results: int = 10) -> str:
    """Search arXiv for academic papers. Returns Markdown with BibTeX cite keys."""
    client = arxiv.Client()
    search = arxiv.Search(query=query, max_results=max_results, sort_by=arxiv.SortCriterion.Relevance)
    results = list(client.results(search))
    lines = []
    for r in results:
        arxiv_id = r.entry_id.split("/")[-1]
        cite_key = arxiv_id.replace(".", "_")
        lines.append(
            f"## [{cite_key}] {r.title}\n"
            f"**Authors:** {', '.join(str(a.name) for a in r.authors)}\n"
            f"**Published:** {r.published.strftime('%Y-%m')}\n"
            f"**arXiv:** {r.entry_id}\n"
            f"**Abstract:** {r.summary[:600]}..."
        )
    return "\n\n---\n\n".join(lines) if lines else "No results found."
