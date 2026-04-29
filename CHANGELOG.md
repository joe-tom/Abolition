# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] — 2026-04-29

### Added

#### Backend

- FastAPI application with SSE streaming (`backend/main.py`)
- Pydantic-settings config with `.env` support (`backend/config.py`)
- Supabase client singleton (`backend/db/client.py`)
- Repository layer: sessions, chapters, references, messages, agent memory
- Database schema: `sessions`, `messages`, `paper_references`, `chapters`, `agent_memory` tables
- Tools: Tavily web search, arXiv search, Semantic Scholar search, BibTeX manager
- Agent system prompts for all 6 specialized subagents
- Subagent factory `@tool` functions using `create_deep_agent` (deepagents / LangGraph)
- HITL tools using `langgraph.types.interrupt()` for user-in-the-loop pauses
- Orchestrator with `MemorySaver` checkpointer for session persistence
- Routers: sessions CRUD, file upload, chat SSE, HITL resume, LaTeX ZIP download
- 15 passing tests (repos, tools, API)
- LangSmith tracing via `LANGCHAIN_*` environment variables

#### Frontend

- Next.js 15 + Tailwind CSS v4 dashboard UI
- 4-column layout: Sessions | References | Chat | LaTeX Preview
- `useSSE` hook for fetch-based SSE stream consumption
- `useSession` hook for session state management
- `SessionPanel` — session list, creation form, status badges
- `ReferencesPanel` — reference cards with source badges, file upload
- `ChatPanel` — streaming chat bubbles with role avatars, HITL decision & questions blocks
- `PreviewPanel` — LaTeX syntax highlighting (react-syntax-highlighter), chapter tabs, ZIP download link
- Event-based preview refresh (no token streaming for paper content)

#### Infrastructure

- Supabase Storage buckets: `uploads` (private), `outputs` (public)
- `.env.example` template
- `.gitignore` for Python, Node.js, and OS artifacts
