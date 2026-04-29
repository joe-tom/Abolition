from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import io
import zipfile
from backend.db.repos.chapters import get_chapters
from backend.db.repos.references import get_references

router = APIRouter()

def _build_main_tex(chapters: list[dict]) -> str:
    inputs = "\n".join(
        f"\\input{{chapters/{i+1:02d}_{c['title'].lower().replace(' ', '_')}}}"
        for i, c in enumerate(chapters)
    )
    return f"""\\documentclass{{article}}
\\usepackage{{amsmath,amssymb,graphicx,hyperref,natbib}}
\\begin{{document}}
{inputs}
\\bibliographystyle{{plain}}
\\bibliography{{bibliography}}
\\end{{document}}
"""

def _build_bibliography(refs: list[dict]) -> str:
    return "\n\n".join(r["bibtex_raw"] for r in refs if r.get("bibtex_raw"))

@router.get("/sessions/{session_id}/download")
def download_output(session_id: str):
    chapters = get_chapters(session_id)
    refs = get_references(session_id)
    if not chapters:
        raise HTTPException(status_code=404, detail="No chapters found")

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("main.tex", _build_main_tex(chapters))
        zf.writestr("bibliography.bib", _build_bibliography(refs))
        for i, ch in enumerate(chapters):
            filename = f"chapters/{i+1:02d}_{ch['title'].lower().replace(' ', '_')}.tex"
            zf.writestr(filename, ch.get("latex") or "")
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename=paper_{session_id[:8]}.zip"},
    )
