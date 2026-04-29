from langchain_core.tools import tool
from tavily import TavilyClient
from backend.config import settings


@tool
def tavily_search(query: str) -> str:
    """Search the web for recent information. Returns Markdown-formatted results."""
    client = TavilyClient(api_key=settings.tavily_api_key)
    results = client.search(query=query, max_results=5)
    lines = []
    for r in results["results"]:
        lines.append(f"## {r['title']}\n{r['url']}\n\n{r['content']}")
    return "\n\n---\n\n".join(lines) if lines else "No results found."
