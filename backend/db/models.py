from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass

def _now():
    return datetime.now(timezone.utc)

class Session(Base):
    __tablename__ = "sessions"
    id            = Column(String, primary_key=True)
    topic         = Column(Text, nullable=False)
    status        = Column(String, default="clarifying")
    outline       = Column(Text, nullable=True)
    clarify_notes = Column(Text, nullable=True)
    created_at    = Column(DateTime, default=_now)

class Message(Base):
    __tablename__ = "messages"
    id         = Column(String, primary_key=True)
    session_id = Column(String, ForeignKey("sessions.id"), nullable=False)
    role       = Column(String, nullable=False)
    content    = Column(Text, nullable=False)
    created_at = Column(DateTime, default=_now)

class PaperReference(Base):
    __tablename__ = "paper_references"
    id         = Column(String, primary_key=True)
    session_id = Column(String, ForeignKey("sessions.id"), nullable=False)
    summary_md = Column(Text, nullable=True)
    bibtex_raw = Column(Text, nullable=True)
    cite_key   = Column(String, nullable=True)
    source     = Column(String, nullable=True)
    created_at = Column(DateTime, default=_now)

class Chapter(Base):
    __tablename__ = "chapters"
    id          = Column(String, primary_key=True)
    session_id  = Column(String, ForeignKey("sessions.id"), nullable=False)
    order_index = Column(Integer, nullable=False)
    title       = Column(Text, nullable=False)
    latex       = Column(Text, nullable=True)
    status      = Column(String, default="draft")
    critic_log  = Column(Text, nullable=True)
    created_at  = Column(DateTime, default=_now)

class AgentMemory(Base):
    __tablename__ = "agent_memory"
    id         = Column(String, primary_key=True)
    session_id = Column(String, ForeignKey("sessions.id"), nullable=False)
    agent      = Column(String, nullable=False)
    content    = Column(Text, nullable=False)
    created_at = Column(DateTime, default=_now)
