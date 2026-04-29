from pydantic import BaseModel
from typing import Optional

class CreateSessionRequest(BaseModel):
    topic: str

class SessionResponse(BaseModel):
    id: str
    topic: str
    status: str
    outline: Optional[str] = None
    created_at: str

class ChatRequest(BaseModel):
    message: str

class ResumeRequest(BaseModel):
    response: str

class ChapterResponse(BaseModel):
    id: str
    order_index: int
    title: str
    latex: Optional[str] = None
    status: str

class ReferenceResponse(BaseModel):
    id: str
    cite_key: str
    summary_md: Optional[str] = None
    source: str
