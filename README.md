# Abolition — AI Paper Writer

AI-powered academic paper writing assistant. Input a research topic and an orchestrator agent coordinates multiple specialized subagents to produce a complete LaTeX paper through a Human-in-the-Loop workflow.

## Architecture

```
Orchestrator
├── SearchAgent      — Tavily web search
├── PaperAgent       — arXiv + Semantic Scholar
├── WriteAgent       — LaTeX chapter drafting
├── ReferencesAgent  — BibTeX collection & normalization
├── FigureAgent      — Tables, equations, figures in LaTeX
├── CriticAgent      — Chapter review & HITL feedback
├── search_memory    — BGE-M3 + FTS5 hybrid search over past sessions
└── save_to_memory   — persist references & content for future sessions
```

**Tech Stack**

| Layer         | Technology                     |
| ------------- | ------------------------------ |
| Frontend      | Next.js 15, Tailwind CSS v4    |
| Backend       | FastAPI, SSE streaming         |
| Agent Runtime | deepagents (LangGraph)         |
| LLM           | Claude claude-sonnet-4-6       |
| Web Search    | Tavily API                     |
| Paper Search  | arXiv + Semantic Scholar       |
| Database      | SQLite (via SQLAlchemy)        |
| Embeddings    | BGE-M3 (sentence-transformers) |
| Output        | LaTeX (.tex + .bib + figures/) |
| Observability | LangSmith (optional)           |

## UI Layout

4-column dashboard:

```
┌─────────────┬─────────────┬──────────────────┬──────────────────┐
│  Sessions   │ References  │      Chat        │  LaTeX Preview   │
│    (20%)    │   (20%)     │     (30%)        │     (30%)        │
└─────────────┴─────────────┴──────────────────┴──────────────────┘
```

## Workflow

1. **Clarifying** — Orchestrator asks 8–10 questions to understand the paper scope
2. **Research** — SearchAgent + PaperAgent run in parallel to collect sources
3. **Outline** — Orchestrator generates outline, user approves
4. **Writing** — Chapter-by-chapter loop: FigureAgent → WriteAgent → CriticAgent
   - CriticAgent reports issues → user decides rewrite or continue
   - On rewrite: targeted questions collected → WriteAgent revises (max 3 iterations)
5. **Finalization** — `main.tex` assembled and available for download as ZIP

## Getting Started

### Prerequisites

- Python 3.11+ (conda)
- Node.js 20+

### 1. Clone & configure

```bash
git clone https://github.com/joe-tom/Abolition.git
cd Abolition
cp .env.example .env
# Fill in .env with your API keys
```

### 2. Backend

```bash
conda create -n abolition python=3.11 -y
conda activate abolition
uv pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --port 10001
```

The SQLite database (`abolition.db`) is created automatically on first run.

> **Note:** BGE-M3 (~1.5 GB) is downloaded from HuggingFace on first startup. Subsequent starts use the local cache.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev -- --port 10000
```

Open `http://localhost:10000`.

## Environment Variables

```env
# LangSmith tracing (optional)
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your_langsmith_key_here
LANGCHAIN_PROJECT=abolition

# LLM & tools (required)
ANTHROPIC_API_KEY=your_key_here
TAVILY_API_KEY=your_key_here

# Database (default: SQLite, no setup needed)
DATABASE_URL=sqlite:///./abolition.db

# Model (optional)
# MODEL_NAME=anthropic:claude-sonnet-4-6
```

## Running Tests

```bash
conda activate abolition
python -m pytest backend/tests/ -v
```

## Output Structure

```
output/{session_id}/
├── main.tex
├── bibliography.bib
├── chapters/
│   ├── 01_introduction.tex
│   └── ...
└── figures/
    └── fig1.tex
```
