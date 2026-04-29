from langchain_core.tools import tool
import bibtexparser
from bibtexparser.bwriter import BibTexWriter


def _parse(raw: str) -> bibtexparser.bibdatabase.BibDatabase:
    return bibtexparser.loads(raw)


@tool
def bibtex_to_markdown(raw_bibtex: str) -> str:
    """Convert BibTeX entries to Markdown summary for LLM context. Deduplicates by ID."""
    db = _parse(raw_bibtex)
    seen = set()
    lines = []
    for entry in db.entries:
        key = entry.get("ID", "?")
        if key in seen:
            continue
        seen.add(key)
        lines.append(
            f"## [{key}] {entry.get('title', 'Untitled')}\n"
            f"**Authors:** {entry.get('author', 'N/A')}\n"
            f"**Year:** {entry.get('year', 'N/A')}\n"
            f"**Venue:** {entry.get('journal') or entry.get('booktitle', 'N/A')}"
        )
    return "\n\n".join(lines) if lines else "No BibTeX entries found."


@tool
def format_bibtex(raw_bibtex: str) -> str:
    """Parse and normalize a BibTeX string. Removes duplicates. Returns clean BibTeX."""
    db = _parse(raw_bibtex)
    seen = set()
    unique_entries = []
    for entry in db.entries:
        key = entry.get("ID", "?")
        if key not in seen:
            seen.add(key)
            unique_entries.append(entry)
    db.entries = unique_entries
    writer = BibTexWriter()
    return bibtexparser.dumps(db, writer)
