# Paper Writer Backend — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** FastAPI 백엔드 + deepagents 기반 orchestrator + 6개 specialized subagent로 학술 논문 자동 작성 시스템의 서버를 구축한다.

**Architecture:** FastAPI가 SSE 스트리밍(채팅 출력)과 REST 엔드포인트(세션/파일)를 제공한다. Orchestrator는 `create_deep_agent`로 만든 LangGraph compiled graph이며, 6개 subagent(Search, Paper, Write, References, Figure, Critic)를 각각 `@tool`로 래핑해 독립 컨텍스트로 호출한다. LangGraph `interrupt()`로 HITL을 구현하고 `MemorySaver`로 스레드 상태를 관리한다. 에이전트 메모, 참고문헌, critic 리포트는 모두 Markdown 형식으로 Supabase에 저장한다.

**Tech Stack:** Python 3.11, conda, deepagents, fastapi, uvicorn[standard], supabase, langchain, langchain-anthropic, arxiv, tavily-python, httpx, bibtexparser, python-multipart, pydantic-settings, pytest, pytest-asyncio

---

## File Map

```
backend/
├── main.py                          # FastAPI 앱 진입점
├── config.py                        # 환경변수 설정 (pydantic-settings)
├── agents/
│   ├── __init__.py
│   ├── base.py                      # get_model() 공통 유틸
│   ├── prompts.py                   # 모든 에이전트 시스템 프롬프트
│   ├── subagents.py                 # 6개 subagent @tool 팩토리
│   ├── hitl_tools.py                # interrupt() 기반 HITL 툴
│   └── orchestrator.py             # orchestrator 생성 함수
├── tools/
│   ├── __init__.py
│   ├── tavily_search.py             # Tavily API @tool
│   ├── arxiv_search.py              # arXiv API @tool
│   ├── semantic_scholar.py          # Semantic Scholar API @tool
│   └── bibtex_manager.py           # BibTeX 파싱/포맷 @tool
├── db/
│   ├── __init__.py
│   ├── client.py                    # Supabase 클라이언트 싱글턴
│   └── repos/
│       ├── __init__.py
│       ├── sessions.py              # sessions CRUD
│       ├── chapters.py              # chapters CRUD
│       ├── references.py            # paper_references CRUD
│       ├── messages.py              # messages CRUD
│       └── memory.py               # agent_memory CRUD
├── models/
│   ├── __init__.py
│   └── schemas.py                   # Pydantic 요청/응답 스키마
├── routers/
│   ├── __init__.py
│   ├── sessions.py                  # GET/POST /sessions
│   ├── chat.py                      # POST /sessions/{id}/chat (SSE), /resume
│   └── upload.py                    # POST /sessions/{id}/upload
└── tests/
    ├── __init__.py
    ├── conftest.py                  # pytest fixtures
    ├── test_tools.py                # 툴 유닛 테스트 (HTTP mock)
    ├── test_repos.py                # 레포 유닛 테스트 (Supabase mock)
    └── test_api.py                  # FastAPI 엔드포인트 테스트
```

---

## Task 1: Conda 환경 + 프로젝트 스캐폴딩

**Files:**

- Create: `backend/` 디렉토리 구조 전체
- Create: `backend/requirements.txt`
- Create: `.env.example`

- [ ] **Step 1: conda 환경 생성**

```bash
conda create -n abolition python=3.11 -y
conda activate abolition
```

- [ ] **Step 2: requirements.txt 작성**

`backend/requirements.txt`:

```
deepagents
fastapi
uvicorn[standard]
supabase
langchain
langchain-anthropic
arxiv
tavily-python
httpx
bibtexparser
python-multipart
pydantic-settings
python-dotenv
pytest
pytest-asyncio
pytest-httpx
```

- [ ] **Step 3: 패키지 설치**

```bash
cd backend
uv pip install -r requirements.txt
```

- [ ] **Step 4: 디렉토리 구조 생성**

```bash
mkdir -p backend/{agents,tools,db/repos,models,routers,tests}
touch backend/__init__.py
touch backend/agents/__init__.py backend/tools/__init__.py
touch backend/db/__init__.py backend/db/repos/__init__.py
touch backend/models/__init__.py backend/routers/__init__.py
touch backend/tests/__init__.py
```

- [ ] **Step 5: .env.example 작성**

`.env.example`:

```
ANTHROPIC_API_KEY=your_key_here
TAVILY_API_KEY=your_key_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_anon_key_here
MODEL_NAME=anthropic:claude-sonnet-4-6
```

- [ ] **Step 6: .env 생성 (실제 키 입력)**

```bash
cp .env.example .env
# .env 파일을 열어 실제 API 키 입력
```

- [ ] **Step 7: 커밋**

```bash
git add backend/ .env.example
git commit -m "feat: scaffold backend project structure"
```

---

## Task 2: Config + Supabase 클라이언트

**Files:**

- Create: `backend/config.py`
- Create: `backend/db/client.py`

- [ ] **Step 1: config.py 작성**

`backend/config.py`:

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    anthropic_api_key: str
    tavily_api_key: str
    supabase_url: str
    supabase_key: str
    model_name: str = "anthropic:claude-sonnet-4-6"

    model_config = {"env_file": ".env"}

settings = Settings()
```

- [ ] **Step 2: Supabase 클라이언트 싱글턴 작성**

`backend/db/client.py`:

```python
from supabase import create_client, Client
from backend.config import settings

_client: Client | None = None

def get_client() -> Client:
    global _client
    if _client is None:
        _client = create_client(settings.supabase_url, settings.supabase_key)
    return _client
```

- [ ] **Step 3: 연결 확인 테스트 작성**

`backend/tests/test_repos.py`:

```python
from unittest.mock import MagicMock, patch

def test_get_client_returns_singleton():
    with patch("backend.db.client._client", None):
        with patch("backend.db.client.create_client") as mock_create:
            mock_create.return_value = MagicMock()
            from backend.db.client import get_client
            c1 = get_client()
            c2 = get_client()
            assert c1 is c2
            assert mock_create.call_count == 1
```

- [ ] **Step 4: 테스트 실행 확인**

```bash
cd backend
pytest tests/test_repos.py::test_get_client_returns_singleton -v
```

Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add backend/config.py backend/db/client.py backend/tests/test_repos.py
git commit -m "feat: add config and supabase client"
```

---

## Task 3: Supabase 스키마 마이그레이션

**Files:**

- Create: `supabase/migrations/20260429000000_init.sql`

- [ ] **Step 1: migrations 디렉토리 생성**

```bash
mkdir -p supabase/migrations
```

- [ ] **Step 2: SQL 마이그레이션 파일 작성**

`supabase/migrations/20260429000000_init.sql`:

```sql
CREATE TABLE sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic         TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'clarifying',
  outline       TEXT,
  clarify_notes TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID REFERENCES sessions(id) ON DELETE CASCADE,
  role        TEXT NOT NULL,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE paper_references (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID REFERENCES sessions(id) ON DELETE CASCADE,
  summary_md  TEXT,
  bibtex_raw  TEXT,
  cite_key    TEXT,
  source      TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chapters (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID REFERENCES sessions(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  title       TEXT NOT NULL,
  latex       TEXT,
  status      TEXT NOT NULL DEFAULT 'draft',
  critic_log  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE agent_memory (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID REFERENCES sessions(id) ON DELETE CASCADE,
  agent       TEXT NOT NULL,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

- [ ] **Step 3: Supabase 대시보드에서 SQL 실행**

Supabase 대시보드 → SQL Editor → 위 SQL 붙여넣기 → Run

- [ ] **Step 4: Storage 버킷 생성**

Supabase 대시보드 → Storage → New bucket:

- 버킷명: `uploads` (Public: false)
- 버킷명: `outputs` (Public: false)

- [ ] **Step 5: 커밋**

```bash
git add supabase/
git commit -m "feat: add supabase schema migration"
```

---

## Task 4: Repository 레이어

**Files:**

- Create: `backend/db/repos/sessions.py`
- Create: `backend/db/repos/chapters.py`
- Create: `backend/db/repos/references.py`
- Create: `backend/db/repos/messages.py`
- Create: `backend/db/repos/memory.py`

- [ ] **Step 1: sessions 레포 작성**

`backend/db/repos/sessions.py`:

```python
from uuid import uuid4
from backend.db.client import get_client

def create_session(topic: str) -> dict:
    return get_client().table("sessions").insert({
        "id": str(uuid4()), "topic": topic, "status": "clarifying"
    }).execute().data[0]

def get_session(session_id: str) -> dict:
    return get_client().table("sessions").select("*").eq("id", session_id).single().execute().data

def update_session(session_id: str, **fields) -> dict:
    return get_client().table("sessions").update(fields).eq("id", session_id).execute().data[0]

def list_sessions() -> list[dict]:
    return get_client().table("sessions").select("*").order("created_at", desc=True).execute().data
```

- [ ] **Step 2: chapters 레포 작성**

`backend/db/repos/chapters.py`:

```python
from uuid import uuid4
from backend.db.client import get_client

def create_chapter(session_id: str, order_index: int, title: str) -> dict:
    return get_client().table("chapters").insert({
        "id": str(uuid4()), "session_id": session_id,
        "order_index": order_index, "title": title, "status": "draft"
    }).execute().data[0]

def update_chapter(chapter_id: str, **fields) -> dict:
    return get_client().table("chapters").update(fields).eq("id", chapter_id).execute().data[0]

def get_chapters(session_id: str) -> list[dict]:
    return get_client().table("chapters").select("*").eq("session_id", session_id).order("order_index").execute().data
```

- [ ] **Step 3: references 레포 작성**

`backend/db/repos/references.py`:

```python
from uuid import uuid4
from backend.db.client import get_client

def upsert_reference(session_id: str, cite_key: str, summary_md: str, bibtex_raw: str, source: str) -> dict:
    existing = get_client().table("paper_references").select("id").eq("session_id", session_id).eq("cite_key", cite_key).execute().data
    if existing:
        return get_client().table("paper_references").update({"summary_md": summary_md, "bibtex_raw": bibtex_raw}).eq("id", existing[0]["id"]).execute().data[0]
    return get_client().table("paper_references").insert({
        "id": str(uuid4()), "session_id": session_id, "cite_key": cite_key,
        "summary_md": summary_md, "bibtex_raw": bibtex_raw, "source": source
    }).execute().data[0]

def get_references(session_id: str) -> list[dict]:
    return get_client().table("paper_references").select("*").eq("session_id", session_id).execute().data
```

- [ ] **Step 4: messages 레포 작성**

`backend/db/repos/messages.py`:

```python
from uuid import uuid4
from backend.db.client import get_client

def save_message(session_id: str, role: str, content: str) -> dict:
    return get_client().table("messages").insert({
        "id": str(uuid4()), "session_id": session_id, "role": role, "content": content
    }).execute().data[0]

def get_messages(session_id: str) -> list[dict]:
    return get_client().table("messages").select("*").eq("session_id", session_id).order("created_at").execute().data
```

- [ ] **Step 5: memory 레포 작성**

`backend/db/repos/memory.py`:

```python
from uuid import uuid4
from backend.db.client import get_client

def save_memory(session_id: str, agent: str, content: str) -> dict:
    return get_client().table("agent_memory").insert({
        "id": str(uuid4()), "session_id": session_id, "agent": agent, "content": content
    }).execute().data[0]

def get_memory(session_id: str, agent: str) -> list[dict]:
    return get_client().table("agent_memory").select("*").eq("session_id", session_id).eq("agent", agent).order("created_at").execute().data
```

- [ ] **Step 6: 레포 유닛 테스트 작성**

`backend/tests/test_repos.py`에 추가:

```python
from unittest.mock import MagicMock, patch

def _mock_supabase(return_data: list):
    mock_client = MagicMock()
    mock_execute = MagicMock()
    mock_execute.data = return_data
    mock_client.table.return_value.insert.return_value.execute.return_value = mock_execute
    mock_client.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = mock_execute
    mock_client.table.return_value.update.return_value.eq.return_value.execute.return_value = mock_execute
    return mock_client

def test_create_session():
    expected = {"id": "abc", "topic": "AI safety", "status": "clarifying"}
    with patch("backend.db.repos.sessions.get_client", return_value=_mock_supabase([expected])):
        from backend.db.repos.sessions import create_session
        result = create_session("AI safety")
        assert result["topic"] == "AI safety"

def test_upsert_reference_inserts_new():
    with patch("backend.db.repos.references.get_client") as mock_get:
        mock_client = _mock_supabase([{"id": "ref1"}])
        mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = []
        mock_get.return_value = mock_client
        from backend.db.repos.references import upsert_reference
        result = upsert_reference("s1", "smith2024", "## Smith 2024\n...", "@article{}", "arxiv")
        assert result["id"] == "ref1"
```

- [ ] **Step 7: 테스트 실행**

```bash
pytest tests/test_repos.py -v
```

Expected: 3 tests PASS

- [ ] **Step 8: 커밋**

```bash
git add backend/db/repos/ backend/tests/test_repos.py
git commit -m "feat: add repository layer with upsert for references"
```

---

## Task 5: Tavily Search Tool

**Files:**

- Create: `backend/tools/tavily_search.py`
- Modify: `backend/tests/test_tools.py`

- [ ] **Step 1: 실패 테스트 작성**

`backend/tests/test_tools.py`:

```python
from unittest.mock import MagicMock, patch

def test_tavily_search_returns_markdown():
    mock_response = {
        "results": [
            {"title": "AI Safety Overview", "url": "https://example.com", "content": "Content here..."}
        ]
    }
    with patch("backend.tools.tavily_search.TavilyClient") as MockClient:
        MockClient.return_value.search.return_value = mock_response
        from backend.tools.tavily_search import tavily_search
        result = tavily_search.invoke({"query": "AI safety"})
        assert "## AI Safety Overview" in result
        assert "https://example.com" in result
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
pytest tests/test_tools.py::test_tavily_search_returns_markdown -v
```

Expected: FAIL (ModuleNotFoundError)

- [ ] **Step 3: Tavily 툴 구현**

`backend/tools/tavily_search.py`:

```python
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
    return "\n\n---\n\n".join(lines)
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
pytest tests/test_tools.py::test_tavily_search_returns_markdown -v
```

Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add backend/tools/tavily_search.py backend/tests/test_tools.py
git commit -m "feat: add tavily search tool"
```

---

## Task 6: arXiv + Semantic Scholar Tools

**Files:**

- Create: `backend/tools/arxiv_search.py`
- Create: `backend/tools/semantic_scholar.py`
- Modify: `backend/tests/test_tools.py`

- [ ] **Step 1: arXiv 툴 실패 테스트 작성**

`backend/tests/test_tools.py`에 추가:

```python
def test_arxiv_search_returns_markdown():
    mock_result = MagicMock()
    mock_result.title = "Attention Is All You Need"
    mock_result.authors = [MagicMock(name="Vaswani")]
    mock_result.published.strftime.return_value = "2017-06"
    mock_result.entry_id = "https://arxiv.org/abs/1706.03762"
    mock_result.summary = "We propose a new simple network architecture..."

    with patch("backend.tools.arxiv_search.arxiv") as mock_arxiv:
        mock_arxiv.Client.return_value.results.return_value = iter([mock_result])
        mock_arxiv.Search = MagicMock()
        mock_arxiv.SortCriterion.Relevance = "relevance"
        from backend.tools.arxiv_search import arxiv_search
        result = arxiv_search.invoke({"query": "transformer attention"})
        assert "Attention Is All You Need" in result
        assert "1706.03762" in result

def test_semantic_scholar_returns_markdown():
    mock_data = {"data": [{"title": "BERT", "authors": [{"name": "Devlin"}], "year": 2019, "abstract": "We introduce BERT...", "externalIds": {"DOI": "10.18653/v1/N19-1423"}, "citationCount": 50000}]}
    with patch("backend.tools.semantic_scholar.httpx.get") as mock_get:
        mock_get.return_value.json.return_value = mock_data
        mock_get.return_value.raise_for_status = MagicMock()
        from backend.tools.semantic_scholar import semantic_scholar_search
        result = semantic_scholar_search.invoke({"query": "BERT language model"})
        assert "## BERT" in result
        assert "Devlin" in result
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
pytest tests/test_tools.py -v
```

Expected: 2 new FAIL

- [ ] **Step 3: arXiv 툴 구현**

`backend/tools/arxiv_search.py`:

```python
from langchain_core.tools import tool
import arxiv

@tool
def arxiv_search(query: str, max_results: int = 10) -> str:
    """Search arXiv for academic papers. Returns Markdown with BibTeX cite keys."""
    client = arxiv.Client()
    search = arxiv.Search(query=query, max_results=max_results, sort_by=arxiv.SortCriterion.Relevance)
    results = list(client.results(search))
    lines = []
    for r in results:
        arxiv_id = r.entry_id.split("/")[-1]
        cite_key = arxiv_id.replace(".", "_")
        lines.append(
            f"## [{cite_key}] {r.title}\n"
            f"**Authors:** {', '.join(a.name for a in r.authors)}\n"
            f"**Published:** {r.published.strftime('%Y-%m')}\n"
            f"**arXiv:** {r.entry_id}\n"
            f"**Abstract:** {r.summary[:600]}..."
        )
    return "\n\n---\n\n".join(lines) if lines else "No results found."
```

- [ ] **Step 4: Semantic Scholar 툴 구현**

`backend/tools/semantic_scholar.py`:

```python
from langchain_core.tools import tool
import httpx

_API = "https://api.semanticscholar.org/graph/v1/paper/search"
_FIELDS = "title,authors,year,abstract,externalIds,citationCount"

@tool
def semantic_scholar_search(query: str, limit: int = 10) -> str:
    """Search Semantic Scholar for academic papers. Returns Markdown with citation info."""
    resp = httpx.get(_API, params={"query": query, "limit": limit, "fields": _FIELDS}, timeout=30)
    resp.raise_for_status()
    papers = resp.json().get("data", [])
    lines = []
    for p in papers:
        authors = ", ".join(a["name"] for a in p.get("authors", []))
        doi = p.get("externalIds", {}).get("DOI", "N/A")
        abstract = (p.get("abstract") or "")[:600]
        lines.append(
            f"## {p['title']}\n"
            f"**Authors:** {authors}\n"
            f"**Year:** {p.get('year', 'N/A')} | **Citations:** {p.get('citationCount', 0)}\n"
            f"**DOI:** {doi}\n"
            f"**Abstract:** {abstract}..."
        )
    return "\n\n---\n\n".join(lines) if lines else "No results found."
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
pytest tests/test_tools.py -v
```

Expected: 3 tests PASS

- [ ] **Step 6: 커밋**

```bash
git add backend/tools/arxiv_search.py backend/tools/semantic_scholar.py backend/tests/test_tools.py
git commit -m "feat: add arxiv and semantic scholar search tools"
```

---

## Task 7: BibTeX Manager Tool

**Files:**

- Create: `backend/tools/bibtex_manager.py`
- Modify: `backend/tests/test_tools.py`

- [ ] **Step 1: 실패 테스트 작성**

`backend/tests/test_tools.py`에 추가:

```python
def test_bibtex_to_markdown_converts_entry():
    raw = """@article{vaswani2017,
  title={Attention Is All You Need},
  author={Vaswani, Ashish and others},
  year={2017},
  journal={NeurIPS}
}"""
    from backend.tools.bibtex_manager import bibtex_to_markdown
    result = bibtex_to_markdown.invoke({"raw_bibtex": raw})
    assert "vaswani2017" in result
    assert "Attention Is All You Need" in result
    assert "2017" in result

def test_bibtex_to_markdown_deduplicates():
    raw = """@article{smith2024,
  title={Test Paper},
  author={Smith},
  year={2024}
}
@article{smith2024,
  title={Test Paper},
  author={Smith},
  year={2024}
}"""
    from backend.tools.bibtex_manager import bibtex_to_markdown
    result = bibtex_to_markdown.invoke({"raw_bibtex": raw})
    assert result.count("smith2024") == 1
```

- [ ] **Step 2: 실패 확인**

```bash
pytest tests/test_tools.py::test_bibtex_to_markdown_converts_entry tests/test_tools.py::test_bibtex_to_markdown_deduplicates -v
```

Expected: FAIL

- [ ] **Step 3: BibTeX 툴 구현**

`backend/tools/bibtex_manager.py`:

```python
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
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
pytest tests/test_tools.py -v
```

Expected: 5 tests PASS

- [ ] **Step 5: 커밋**

```bash
git add backend/tools/bibtex_manager.py backend/tests/test_tools.py
git commit -m "feat: add bibtex manager tool with deduplication"
```

---

## Task 8: 시스템 프롬프트 + 에이전트 베이스

**Files:**

- Create: `backend/agents/base.py`
- Create: `backend/agents/prompts.py`

- [ ] **Step 1: base.py 작성**

`backend/agents/base.py`:

```python
from langchain.chat_models import init_chat_model
from backend.config import settings

def get_model():
    return init_chat_model(settings.model_name)
```

- [ ] **Step 2: prompts.py 작성**

`backend/agents/prompts.py`:

````python
SEARCH_AGENT_PROMPT = """You are a web research specialist.
Your job: search the web for information relevant to the given academic paper topic.
Use the tavily_search tool to gather recent, credible sources.
Return your findings as Markdown with clear headings, source URLs, and key insights.
Focus on: recent developments, key concepts, important names/organizations, and controversies.
Do NOT write BibTeX. Focus on web sources only."""

PAPER_AGENT_PROMPT = """You are an academic literature specialist.
Your job: find relevant academic papers on the given topic using arXiv and Semantic Scholar.
Use both arxiv_search and semantic_scholar_search tools.
Return results as Markdown with:
- Paper title, authors, year, venue
- BibTeX cite key (e.g., smith2024attention)
- 2-3 sentence summary of relevance
- Raw BibTeX entry at the end in a ```bibtex block```
Group papers by sub-topic."""

WRITE_AGENT_PROMPT = """You are an expert academic paper writer specializing in LaTeX.
Your job: write a single chapter/section of a research paper in LaTeX format.
You will receive: chapter title, outline, collected references (as Markdown), figures/tables (as LaTeX code), user clarifications, and critic feedback if this is a revision.
Rules:
- Write valid LaTeX (use \\section, \\subsection, \\cite, \\ref, \\label)
- Cite sources using their BibTeX keys with \\cite{}
- Integrate provided figures/tables using \\begin{figure} and \\begin{table}
- Academic tone, precise language
- Do NOT include \\begin{document} or preamble — write section content only
- Return ONLY the LaTeX code, no explanation"""

REFERENCES_AGENT_PROMPT = """You are a references and bibliography specialist.
Your job: collect, normalize, and manage BibTeX references for an academic paper.
Use bibtex_to_markdown to summarize references for context.
Use format_bibtex to clean and deduplicate BibTeX entries.
When given raw search results containing BibTeX blocks, extract and normalize them.
Return:
1. A Markdown summary of all references (for LLM context)
2. A clean, deduplicated BibTeX block (for bibliography.bib)"""

FIGURE_AGENT_PROMPT = """You are a LaTeX figure and table specialist.
Your job: generate LaTeX code for figures, tables, and equations needed for a chapter.
You will receive a description of what visual elements are needed.
Return valid LaTeX environments:
- \\begin{figure}...\\end{figure} for figures (use \\includegraphics or TikZ)
- \\begin{table}...\\end{table} for tables
- \\begin{equation}...\\end{equation} for equations
Include \\label{} and \\caption{} for every element.
Return ONLY the LaTeX code."""

CRITIC_AGENT_PROMPT = """You are a rigorous academic peer reviewer.
Your job: review a LaTeX chapter draft and identify problems.
Evaluate:
1. Logical flow and argument structure
2. Citation accuracy (are claims supported by \\cite{}?)
3. Academic language and tone
4. LaTeX syntax correctness (balanced environments, valid commands)
5. Completeness relative to chapter outline
6. Connection to related sections

Output format (always use this exact structure):
## Review Result: PASS or FAIL

## Problems Found
- [Problem 1]: [Description]
- [Problem 2]: [Description]
(empty if PASS)

## Questions for Author
- [Question about specific unclear point]
(only include if FAIL and revision needed)

Be specific. Reference line/section numbers when possible."""

ORCHESTRATOR_PROMPT = """You are the orchestrator of an academic paper writing system.
You coordinate specialized subagents to produce a complete LaTeX research paper.

YOUR WORKFLOW:
1. CLARIFY: Ask the user 8-10 targeted questions about the paper (one at a time) to understand topic, goals, structure, and constraints. Save answers with call_memory_tool.
2. RESEARCH: Call call_search_agent and call_paper_agent in parallel for literature review.
3. OUTLINE: Generate a paper outline, present to user, get approval. User may edit.
4. WRITE: For each chapter in order:
   a. Call call_figure_agent for needed visuals
   b. Call call_write_agent with all context (outline, references, figures, user answers)
   c. Call call_critic_agent to review
   d. If FAIL: use request_human_decision to show the report to user
   e. If user chooses rewrite: use request_human_answers to collect targeted answers, then call call_write_agent again
   f. Repeat critic loop max 3 times, then finalize regardless
5. FINALIZE: Call call_references_agent to produce final bibliography.bib, then assemble main.tex

IMPORTANT RULES:
- Never auto-rewrite without user approval (always use request_human_decision first)
- Store all research notes as Markdown
- Always include session_id context when calling subagents
- Be transparent about what you are doing at each step"""
````

- [ ] **Step 3: 커밋**

```bash
git add backend/agents/base.py backend/agents/prompts.py
git commit -m "feat: add agent base and system prompts"
```

---

## Task 9: Subagent @tool 팩토리 (Search, Paper, Write)

**Files:**

- Create: `backend/agents/subagents.py`

- [ ] **Step 1: subagents.py 초안 (Search + Paper + Write)**

`backend/agents/subagents.py`:

```python
from langchain_core.tools import tool
from deepagents import create_deep_agent
from backend.agents.base import get_model
from backend.agents.prompts import (
    SEARCH_AGENT_PROMPT, PAPER_AGENT_PROMPT, WRITE_AGENT_PROMPT,
    REFERENCES_AGENT_PROMPT, FIGURE_AGENT_PROMPT, CRITIC_AGENT_PROMPT,
)
from backend.tools.tavily_search import tavily_search
from backend.tools.arxiv_search import arxiv_search
from backend.tools.semantic_scholar import semantic_scholar_search
from backend.tools.bibtex_manager import bibtex_to_markdown, format_bibtex

@tool
def call_search_agent(task: str) -> str:
    """Delegate web search to SearchAgent. Input: detailed task description. Returns Markdown."""
    agent = create_deep_agent(
        model=get_model(),
        tools=[tavily_search],
        system_prompt=SEARCH_AGENT_PROMPT,
    )
    result = agent.invoke({"messages": [{"role": "user", "content": task}]})
    return result["messages"][-1].content

@tool
def call_paper_agent(task: str) -> str:
    """Delegate academic literature search to PaperAgent. Returns Markdown with BibTeX."""
    agent = create_deep_agent(
        model=get_model(),
        tools=[arxiv_search, semantic_scholar_search],
        system_prompt=PAPER_AGENT_PROMPT,
    )
    result = agent.invoke({"messages": [{"role": "user", "content": task}]})
    return result["messages"][-1].content

@tool
def call_write_agent(task: str) -> str:
    """Delegate chapter writing to WriteAgent. Input must include chapter title, outline, references, figures, and any user clarifications. Returns LaTeX code only."""
    agent = create_deep_agent(
        model=get_model(),
        tools=[],
        system_prompt=WRITE_AGENT_PROMPT,
    )
    result = agent.invoke({"messages": [{"role": "user", "content": task}]})
    return result["messages"][-1].content
```

- [ ] **Step 2: References, Figure, Critic 추가**

`backend/agents/subagents.py`에 이어서 추가:

```python
@tool
def call_references_agent(task: str) -> str:
    """Delegate BibTeX collection and normalization to ReferencesAgent. Returns Markdown summary + clean BibTeX."""
    agent = create_deep_agent(
        model=get_model(),
        tools=[bibtex_to_markdown, format_bibtex],
        system_prompt=REFERENCES_AGENT_PROMPT,
    )
    result = agent.invoke({"messages": [{"role": "user", "content": task}]})
    return result["messages"][-1].content

@tool
def call_figure_agent(task: str) -> str:
    """Delegate figure/table/equation LaTeX generation to FigureAgent. Returns LaTeX environments only."""
    agent = create_deep_agent(
        model=get_model(),
        tools=[],
        system_prompt=FIGURE_AGENT_PROMPT,
    )
    result = agent.invoke({"messages": [{"role": "user", "content": task}]})
    return result["messages"][-1].content

@tool
def call_critic_agent(task: str) -> str:
    """Delegate chapter review to CriticAgent. Input: chapter LaTeX + outline context. Returns structured review with PASS/FAIL."""
    agent = create_deep_agent(
        model=get_model(),
        tools=[],
        system_prompt=CRITIC_AGENT_PROMPT,
    )
    result = agent.invoke({"messages": [{"role": "user", "content": task}]})
    return result["messages"][-1].content
```

- [ ] **Step 3: subagent 스모크 테스트 (mock LLM)**

`backend/tests/test_tools.py`에 추가:

```python
def test_call_write_agent_returns_string():
    mock_agent = MagicMock()
    mock_agent.invoke.return_value = {"messages": [MagicMock(content="\\section{Introduction}\nContent here.")]}
    with patch("backend.agents.subagents.create_deep_agent", return_value=mock_agent):
        with patch("backend.agents.subagents.get_model", return_value=MagicMock()):
            from backend.agents.subagents import call_write_agent
            result = call_write_agent.invoke({"task": "Write introduction chapter."})
            assert "\\section{Introduction}" in result
```

- [ ] **Step 4: 테스트 실행**

```bash
pytest tests/test_tools.py::test_call_write_agent_returns_string -v
```

Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add backend/agents/subagents.py backend/tests/test_tools.py
git commit -m "feat: add subagent factory tools"
```

---

## Task 10: HITL 툴 + Orchestrator

**Files:**

- Create: `backend/agents/hitl_tools.py`
- Create: `backend/agents/orchestrator.py`

- [ ] **Step 1: HITL 툴 작성**

`backend/agents/hitl_tools.py`:

```python
from langchain_core.tools import tool
from langgraph.types import interrupt

@tool
def request_human_decision(critic_report: str, question: str) -> str:
    """Pause execution to show user a critic report and ask for a decision.
    Returns the user's decision string ('rewrite' or 'proceed')."""
    return interrupt({
        "type": "hitl_decision",
        "critic_report": critic_report,
        "question": question,
        "options": ["rewrite", "proceed"],
    })

@tool
def request_human_answers(questions: list[str]) -> str:
    """Pause execution to collect targeted answers from the user before rewriting.
    Returns user answers as a Markdown string."""
    return interrupt({
        "type": "hitl_questions",
        "questions": questions,
    })
```

- [ ] **Step 2: Orchestrator 작성**

`backend/agents/orchestrator.py`:

```python
from deepagents import create_deep_agent
from langgraph.checkpoint.memory import MemorySaver
from backend.agents.base import get_model
from backend.agents.prompts import ORCHESTRATOR_PROMPT
from backend.agents.subagents import (
    call_search_agent, call_paper_agent, call_write_agent,
    call_references_agent, call_figure_agent, call_critic_agent,
)
from backend.agents.hitl_tools import request_human_decision, request_human_answers

_checkpointer = MemorySaver()
_orchestrator = None

def get_orchestrator():
    global _orchestrator
    if _orchestrator is None:
        # Note: if create_deep_agent does not accept checkpointer kwarg,
        # access agent.graph and recompile: agent = agent.graph.compile(checkpointer=_checkpointer)
        _orchestrator = create_deep_agent(
            model=get_model(),
            tools=[
                call_search_agent,
                call_paper_agent,
                call_write_agent,
                call_references_agent,
                call_figure_agent,
                call_critic_agent,
                request_human_decision,
                request_human_answers,
            ],
            system_prompt=ORCHESTRATOR_PROMPT,
            checkpointer=_checkpointer,
        )
    return _orchestrator
```

- [ ] **Step 3: Orchestrator 스모크 테스트**

`backend/tests/test_tools.py`에 추가:

```python
def test_get_orchestrator_returns_agent():
    with patch("backend.agents.orchestrator.create_deep_agent") as mock_create:
        with patch("backend.agents.orchestrator.get_model", return_value=MagicMock()):
            mock_create.return_value = MagicMock()
            from backend.agents.orchestrator import get_orchestrator
            import backend.agents.orchestrator as orch_module
            orch_module._orchestrator = None  # reset singleton
            agent = get_orchestrator()
            assert agent is not None
            assert mock_create.call_count == 1
```

- [ ] **Step 4: 테스트 실행**

```bash
pytest tests/test_tools.py::test_get_orchestrator_returns_agent -v
```

Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add backend/agents/hitl_tools.py backend/agents/orchestrator.py backend/tests/test_tools.py
git commit -m "feat: add hitl tools and orchestrator"
```

---

## Task 11: Pydantic 스키마 + FastAPI 앱

**Files:**

- Create: `backend/models/schemas.py`
- Create: `backend/main.py`

- [ ] **Step 1: 스키마 작성**

`backend/models/schemas.py`:

```python
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
```

- [ ] **Step 2: main.py 작성**

`backend/main.py`:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import sessions, chat, upload

app = FastAPI(title="Paper Writer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sessions.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(upload.router, prefix="/api")

@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 3: FastAPI health 테스트**

`backend/tests/test_api.py`:

```python
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

def get_test_client():
    with patch("backend.agents.orchestrator.create_deep_agent", return_value=MagicMock()):
        with patch("backend.agents.orchestrator.get_model", return_value=MagicMock()):
            with patch("backend.db.client.create_client", return_value=MagicMock()):
                from backend.main import app
                return TestClient(app)

def test_health():
    client = get_test_client()
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}
```

- [ ] **Step 4: 테스트 실행**

```bash
pytest tests/test_api.py::test_health -v
```

Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add backend/models/schemas.py backend/main.py backend/tests/test_api.py
git commit -m "feat: add pydantic schemas and fastapi app"
```

---

## Task 12: Sessions + Upload 라우터

**Files:**

- Create: `backend/routers/sessions.py`
- Create: `backend/routers/upload.py`

- [ ] **Step 1: sessions 라우터 작성**

`backend/routers/sessions.py`:

```python
from fastapi import APIRouter, HTTPException
from backend.models.schemas import CreateSessionRequest, SessionResponse, ChapterResponse, ReferenceResponse
from backend.db.repos import sessions as sessions_repo, chapters as chapters_repo, references as refs_repo

router = APIRouter()

@router.post("/sessions", response_model=dict)
def create_session(body: CreateSessionRequest):
    session = sessions_repo.create_session(body.topic)
    return session

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
```

- [ ] **Step 2: upload 라우터 작성**

`backend/routers/upload.py`:

```python
from fastapi import APIRouter, UploadFile, File, HTTPException
from backend.db.client import get_client
from backend.config import settings
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
```

- [ ] **Step 3: sessions 엔드포인트 테스트**

`backend/tests/test_api.py`에 추가:

```python
def test_create_session():
    with patch("backend.routers.sessions.sessions_repo.create_session") as mock_create:
        mock_create.return_value = {"id": "abc", "topic": "AI safety", "status": "clarifying", "created_at": "2026-04-29T00:00:00Z"}
        client = get_test_client()
        resp = client.post("/api/sessions", json={"topic": "AI safety"})
        assert resp.status_code == 200
        assert resp.json()["topic"] == "AI safety"

def test_list_sessions():
    with patch("backend.routers.sessions.sessions_repo.list_sessions") as mock_list:
        mock_list.return_value = []
        client = get_test_client()
        resp = client.get("/api/sessions")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
```

- [ ] **Step 4: 테스트 실행**

```bash
pytest tests/test_api.py -v
```

Expected: 3 tests PASS

- [ ] **Step 5: 커밋**

```bash
git add backend/routers/sessions.py backend/routers/upload.py backend/tests/test_api.py
git commit -m "feat: add sessions and upload routers"
```

---

## Task 13: Chat SSE + HITL Resume 라우터

**Files:**

- Create: `backend/routers/chat.py`

- [ ] **Step 1: chat 라우터 작성**

`backend/routers/chat.py`:

```python
import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from langgraph.types import Command
from backend.models.schemas import ChatRequest, ResumeRequest
from backend.agents.orchestrator import get_orchestrator

router = APIRouter()

def _make_config(session_id: str) -> dict:
    return {"configurable": {"thread_id": session_id}}

async def _stream_events(input_, session_id: str):
    agent = get_orchestrator()
    config = _make_config(session_id)
    try:
        async for event in agent.astream_events(input_, config=config, version="v2"):
            event_type = event.get("event", "")

            if event_type == "on_chat_model_stream":
                chunk = event["data"]["chunk"].content
                if chunk:
                    yield f"data: {json.dumps({'type': 'token', 'content': chunk})}\n\n"

            elif event_type == "on_tool_end":
                tool_name = event.get("name", "")
                output = event["data"].get("output")

                if tool_name in ("request_human_decision", "request_human_answers"):
                    yield f"data: {json.dumps({'type': 'hitl', 'data': output})}\n\n"

                elif tool_name in ("call_write_agent", "call_critic_agent"):
                    yield f"data: {json.dumps({'type': 'preview_update', 'session_id': session_id})}\n\n"

        yield f"data: {json.dumps({'type': 'done'})}\n\n"
    except Exception as e:
        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

@router.post("/sessions/{session_id}/chat")
async def chat(session_id: str, body: ChatRequest):
    input_ = {"messages": [{"role": "user", "content": body.message}]}
    return StreamingResponse(
        _stream_events(input_, session_id),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

@router.post("/sessions/{session_id}/resume")
async def resume(session_id: str, body: ResumeRequest):
    return StreamingResponse(
        _stream_events(Command(resume=body.response), session_id),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
```

- [ ] **Step 2: conftest.py 작성 (공통 fixtures)**

`backend/tests/conftest.py`:

```python
import pytest
from unittest.mock import patch, MagicMock

@pytest.fixture(autouse=True)
def mock_supabase():
    with patch("backend.db.client.create_client", return_value=MagicMock()):
        yield

@pytest.fixture(autouse=True)
def mock_orchestrator():
    with patch("backend.agents.orchestrator.create_deep_agent", return_value=MagicMock()):
        with patch("backend.agents.orchestrator.get_model", return_value=MagicMock()):
            yield
```

- [ ] **Step 3: pytest.ini 작성**

`backend/pytest.ini`:

```ini
[pytest]
asyncio_mode = auto
```

- [ ] **Step 4: chat SSE 라우터 테스트**

`backend/tests/test_api.py`에 추가:

```python
import asyncio

def test_chat_endpoint_returns_streaming_response():
    async def mock_stream(*args, **kwargs):
        yield {"event": "on_chat_model_stream", "data": {"chunk": MagicMock(content="Hello")}}
        yield {"event": "on_chat_model_stream", "data": {"chunk": MagicMock(content=" world")}}

    mock_agent = MagicMock()
    mock_agent.astream_events = mock_stream

    with patch("backend.routers.chat.get_orchestrator", return_value=mock_agent):
        from backend.main import app
        client = TestClient(app)
        resp = client.post("/api/sessions/test-session/chat", json={"message": "Write a paper on AI"})
        assert resp.status_code == 200
        assert "text/event-stream" in resp.headers["content-type"]
```

- [ ] **Step 5: 테스트 실행**

```bash
pytest tests/test_api.py -v
```

Expected: 4 tests PASS

- [ ] **Step 6: 서버 기동 확인**

```bash
uvicorn backend.main:app --reload --port 8000
```

Expected: "Application startup complete" 출력. `http://localhost:8000/health` 브라우저에서 `{"status": "ok"}` 확인.

- [ ] **Step 7: 커밋**

```bash
git add backend/routers/chat.py backend/tests/conftest.py backend/pytest.ini backend/tests/test_api.py
git commit -m "feat: add chat SSE router with HITL resume support"
```

---

## Task 14: 최종 LaTeX 조립 + Supabase Storage 업로드

**Files:**

- Create: `backend/routers/output.py`
- Modify: `backend/main.py`

- [ ] **Step 1: output 라우터 작성**

`backend/routers/output.py`:

```python
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import io
import zipfile
from backend.db.repos.chapters import get_chapters
from backend.db.repos.references import get_references
from backend.db.client import get_client

router = APIRouter()

def _build_main_tex(session_id: str, chapters: list[dict]) -> str:
    inputs = "\n".join(f"\\input{{chapters/{i+1:02d}_{c['title'].lower().replace(' ', '_')}}}" for i, c in enumerate(chapters))
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
        zf.writestr("main.tex", _build_main_tex(session_id, chapters))
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
```

- [ ] **Step 2: main.py에 output 라우터 추가**

`backend/main.py`에서:

```python
from backend.routers import sessions, chat, upload, output
# ...
app.include_router(output.router, prefix="/api")
```

- [ ] **Step 3: download 엔드포인트 테스트**

`backend/tests/test_api.py`에 추가:

```python
def test_download_output_returns_zip():
    mock_chapters = [{"id": "c1", "order_index": 0, "title": "Introduction", "latex": "\\section{Introduction}\nContent.", "status": "approved"}]
    mock_refs = [{"id": "r1", "cite_key": "smith2024", "bibtex_raw": "@article{smith2024, title={Test}}", "source": "arxiv"}]

    with patch("backend.routers.output.get_chapters", return_value=mock_chapters):
        with patch("backend.routers.output.get_references", return_value=mock_refs):
            from backend.main import app
            client = TestClient(app)
            resp = client.get("/api/sessions/test-session/download")
            assert resp.status_code == 200
            assert resp.headers["content-type"] == "application/zip"
```

- [ ] **Step 4: 테스트 실행**

```bash
pytest tests/ -v
```

Expected: 전체 테스트 PASS

- [ ] **Step 5: 전체 커밋**

```bash
git add backend/routers/output.py backend/main.py backend/tests/test_api.py
git commit -m "feat: add latex assembly and zip download endpoint"
```

---

## Self-Review Checklist

- [x] **Spec coverage:**
  - Phase 1 Clarifying → Orchestrator prompt + chat SSE ✓
  - Phase 2 Research → SearchAgent + PaperAgent tools ✓
  - Phase 3 Outline → Orchestrator prompt handles this ✓
  - Phase 4 Chapter loop + HITL → request_human_decision/answers + critic loop ✓
  - Phase 5 Finalization → output router ✓
  - Supabase DB schema → Task 3 ✓
  - Supabase Storage → upload router ✓
  - Markdown 저장 포맷 → prompts + repos 모두 Markdown ✓
  - 이벤트 기반 preview_update → chat router ✓

- [x] **Placeholder scan:** 없음. `checkpointer` kwarg 미지원 시 대응 방법 명시.

- [x] **Type consistency:** `call_*_agent` tool 시그니처 전 태스크 통일. `get_orchestrator()` 싱글턴 패턴 일관.
