from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from backend.models.schemas import CreateSessionRequest
from backend.db.repos import sessions as sessions_repo
from backend.db.repos import chapters as chapters_repo
from backend.db.repos import references as refs_repo

router = APIRouter()

@router.post("/sessions", response_model=dict)
def create_session(body: CreateSessionRequest):
    return sessions_repo.create_session(body.topic)

@router.get("/sessions", response_model=list)
def list_sessions():
    return sessions_repo.list_sessions()

@router.get("/sessions/{session_id}", response_model=dict)
def get_session(session_id: str):
    session = sessions_repo.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@router.get("/sessions/{session_id}/chapters", response_model=list)
def get_chapters(session_id: str):
    return chapters_repo.get_chapters(session_id)

@router.get("/sessions/{session_id}/references", response_model=list)
def get_references(session_id: str):
    return refs_repo.get_references(session_id)

@router.get("/library/references", response_model=list)
def get_library():
    return refs_repo.get_library_references()

@router.delete("/sessions/{session_id}", status_code=204)
def delete_session(session_id: str):
    if not sessions_repo.delete_session(session_id):
        raise HTTPException(status_code=404, detail="Session not found")

class ImportRefsRequest(BaseModel):
    cite_keys: List[str]

@router.post("/sessions/{session_id}/references/import", response_model=list)
def import_references(session_id: str, body: ImportRefsRequest):
    return refs_repo.import_references(session_id, body.cite_keys)
