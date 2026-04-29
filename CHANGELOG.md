# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.3.0] — 2026-04-29

### Added

- **Long-term memory**: BGE-M3 embeddings + SQLite FTS5 hybrid search (`backend/memory/`)
  - `search_memory` / `save_to_memory` tools registered on the orchestrator
  - Hybrid scoring: 70% vector cosine + 30% FTS5, threshold 0.1
- **Chat history persistence**: messages saved to SQLite on stream end; restored when a session is selected
- **Session delete**: `DELETE /api/sessions/{id}` endpoint + hover-reveal delete button in UI

### Changed

- **UI**: full light theme (white bg, black text, `font-mono`, zero `border-radius`)
- **useSSE**: `sessionId` managed internally; exposed `setSessionId` for clean hook composition
- **Semantic Scholar tool**: exponential backoff (up to 3 retries) on HTTP 429
- **SSE chunk parsing**: extract text from list-type `chunk.content` (fixes `[object Object]` bug)
- **LangSmith**: `load_dotenv()` called at app startup so `LANGCHAIN_*` vars reach the SDK
- **Markdown rendering**: agent messages rendered via `react-markdown` + `remark-gfm`
- **Chat UX**: textarea autofocuses after streaming ends

---

## [0.2.0] — 2026-04-29

### Changed

- **Database**: Migrated from Supabase (PostgreSQL + Storage) to SQLite via SQLAlchemy — no external service required, DB file created automatically on first run
- **File uploads**: Replaced Supabase Storage with local `uploads/` directory
- **Config**: Removed `SUPABASE_URL` / `SUPABASE_KEY`; added `DATABASE_URL` (default: `sqlite:///./abolition.db`)
- **Tests**: Replaced Supabase mocks with real in-memory SQLite — 16 tests passing

### Added

- LangSmith tracing via `LANGCHAIN_*` environment variables (optional)
- Dashboard-style UI redesign (Tailwind v4, slate color palette, role avatars, status badges)

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
