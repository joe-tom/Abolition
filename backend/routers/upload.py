import uuid
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException

UPLOAD_DIR = Path("uploads")
router = APIRouter()

@router.post("/sessions/{session_id}/upload")
async def upload_file(session_id: str, file: UploadFile = File(...)):
    allowed = {".pdf", ".csv", ".xlsx", ".xls", ".txt"}
    suffix = ("." + file.filename.split(".")[-1].lower()) if "." in file.filename else ""
    if suffix not in allowed:
        raise HTTPException(status_code=400, detail=f"File type {suffix} not allowed. Allowed: {allowed}")

    session_dir = UPLOAD_DIR / session_id
    session_dir.mkdir(parents=True, exist_ok=True)

    dest = session_dir / f"{uuid.uuid4()}-{file.filename}"
    content = await file.read()
    dest.write_bytes(content)

    return {"path": str(dest), "filename": file.filename, "size": len(content)}
