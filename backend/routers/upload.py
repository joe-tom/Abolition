from fastapi import APIRouter, UploadFile, File, HTTPException
from backend.db.client import get_client
import uuid

router = APIRouter()

@router.post("/sessions/{session_id}/upload")
async def upload_file(session_id: str, file: UploadFile = File(...)):
    allowed = {".pdf", ".csv", ".xlsx", ".xls", ".txt"}
    suffix = "." + file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if suffix not in allowed:
        raise HTTPException(status_code=400, detail=f"File type {suffix} not allowed. Allowed: {allowed}")

    content = await file.read()
    path = f"{session_id}/{uuid.uuid4()}-{file.filename}"

    client = get_client()
    client.storage.from_("uploads").upload(path, content, {"content-type": file.content_type})

    return {"path": path, "filename": file.filename, "size": len(content)}
