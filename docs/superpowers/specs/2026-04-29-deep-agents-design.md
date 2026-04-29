# Deep Agents Paper Writer — Design Spec

**Date:** 2026-04-29  
**Status:** Approved

---

## Overview

논문 주제를 입력하면 orchestrator 아래 여러 subagent가 협력하여 완성된 LaTeX 논문을 생성하는 agent harness. deepagents 라이브러리(LangGraph 기반)를 사용하며, 챕터별 write-critic 루프와 Human-in-the-Loop(HITL)를 핵심으로 한다.

---

## Tech Stack

| 레이어        | 기술                                              |
| ------------- | ------------------------------------------------- |
| Frontend      | Next.js 15 + Tailwind CSS                         |
| Backend       | FastAPI + SSE (스트리밍)                          |
| Agent Runtime | deepagents (LangGraph 기반)                       |
| LLM           | Claude claude-sonnet-4-6 (기본값, 설정 변경 가능) |
| 웹 검색       | Tavily API                                        |
| 논문 검색     | arXiv API + Semantic Scholar API                  |
| DB / Storage  | Supabase (PostgreSQL + Storage)                   |
| 출력 포맷     | LaTeX (.tex + .bib + figures/)                    |

---

## Frontend Layout

4컬럼 고정 레이아웃. 모든 패널은 세션 상태와 실시간으로 동기화된다.

```
┌──────────┬────────────────┬──────────────────┬────────────────────┐
│ Session  │  References    │    Chat          │  LaTeX Preview     │
│  (20%)   │    (20%)       │    (30%)         │     (30%)          │
│          │                │                  │                    │
│ 세션 목록 │ 업로드 파일     │ 진행 상황 스트림   │ 지금까지 작성된     │
│ 새 세션   │ 검색된 논문     │ clarifying Q&A   │ 챕터 미리보기       │
│ 세션 삭제 │ + 추가 버튼    │ 사용자 입력창     │ (LaTeX → HTML 렌더) │
└──────────┴────────────────┴──────────────────┴────────────────────┘
```

**각 패널 역할:**

- **Session:** 세션 목록, 새 세션 생성, 세션 삭제. 세션 클릭 시 해당 상태 복원.
- **References:** 사용자가 직접 업로드한 PDF/CSV/Excel 파일 목록 + SearchAgent/PaperAgent가 수집한 논문 목록. 파일 추가 버튼 제공.
- **Chat:** 모든 에이전트 메시지와 사용자 입력이 이 창에 SSE 스트리밍. HITL 승인 버튼도 여기에 렌더링.
- **Preview:** 챕터 완성 또는 HITL 트리거 시점에만 업데이트. 작업 중에는 로딩 스피너 표시. 완성된 챕터를 LaTeX → HTML로 렌더링. 챕터 탭으로 전환 가능.

---

## Agent Architecture

`create_deep_agent`로 생성된 orchestrator가 deepagents의 내장 `task` 툴을 통해 각 subagent를 호출한다. 각 subagent는 독립적인 컨텍스트와 전용 툴을 가진다.

```
Orchestrator (create_deep_agent)
├── SearchAgent     — Tavily API 웹 검색
├── PaperAgent      — arXiv API + Semantic Scholar API
├── WriteAgent      — LaTeX 챕터 초안 작성
├── ReferencesAgent — BibTeX 수집, 중복 제거, 인용키 정규화
├── FigureAgent     — 표/수식/그래프 LaTeX 코드 생성
└── CriticAgent     — 챕터 리뷰, 문제 리포트, HITL 질문 생성
```

**Orchestrator 책임:**

- 전체 워크플로 조율 및 단계 전환
- Clarifying questions 진행
- 아웃라인 생성 및 사용자 승인 관리
- 챕터 루프 순서 제어
- 최종 main.tex 조립 및 Supabase Storage 업로드

---

## Full Workflow

### Phase 1: Clarifying

1. 사용자가 논문 주제를 채팅창에 입력
2. Orchestrator가 질문을 순차적으로 채팅창에 출력 (8~10개)
   - 논문의 목적과 핵심 기여점
   - 타겟 저널 또는 컨퍼런스
   - 예상 페이지 수
   - 포함할 섹션 구조
   - 연구 분야 및 핵심 키워드
   - 주요 주장 또는 가설
   - 데이터/실험 보유 여부
   - 참고하고 싶은 논문 스타일
3. 사용자가 파일 업로드 (PDF references, CSV/Excel data)
   - Supabase Storage에 저장
   - References 패널에 즉시 표시

### Phase 2: Research

SearchAgent와 PaperAgent가 병렬 실행된다.

- **SearchAgent:** Tavily API로 주제 관련 최신 웹 자료 수집
- **PaperAgent:** arXiv + Semantic Scholar에서 관련 학술 논문 수집
- **ReferencesAgent:** 수집된 결과를 BibTeX으로 정규화, 중복 제거, 인용키 생성 → Supabase `references` 테이블 저장 → References 패널 실시간 업데이트

### Phase 3: Outline

1. Orchestrator가 clarifying 답변 + 수집 자료 기반으로 아웃라인 생성
2. 채팅창에 아웃라인 표시 후 사용자 승인 요청
3. 사용자가 섹션 추가/수정/삭제 가능
4. 확정된 아웃라인을 Supabase `sessions` 테이블에 저장

### Phase 4: Chapter-by-Chapter Loop (HITL)

챕터 순서대로 아래 루프를 반복한다.

```
1. FigureAgent
   → 해당 챕터에 필요한 표, 수식, 그래프 LaTeX 코드 생성

2. WriteAgent
   → 챕터 초안 작성 (LaTeX 형식)
   → 수집된 자료 + 사용자 업로드 파일 + FigureAgent 산출물 활용

3. CriticAgent → 리뷰
   평가 항목: 논리적 흐름, 인용 정확도, 학술적 표현, LaTeX 문법, 주장의 근거, 완성도

   [Pass]
   → Supabase chapters 테이블 저장
   → Preview 패널 실시간 업데이트
   → 다음 챕터로

   [Fail]
   → CriticAgent가 채팅창에 리포트 전송:
     "N장 초안을 검토했습니다.
      [발견된 문제]
      • 2.3절 논리 전개 불명확
      • Fig.2 인용 누락
      • Related work 연결 약함
      재작성할까요? [재작성] [이대로 진행]"

   사용자가 [이대로 진행] 선택
   → 현재 버전으로 저장 후 다음 챕터

   사용자가 [재작성] 선택
   → CriticAgent가 부족한 항목별로 사용자에게 질문:
     "재작성 전에 몇 가지 여쭤볼게요.
      Q1. 2.3절에서 강조하고 싶은 핵심 주장이 무엇인가요?
      Q2. Fig.2는 어떤 결과를 보여주길 원하나요?
      Q3. Related work와의 차별점을 어떻게 표현하고 싶으신가요?"
   → 사용자 답변 수집
   → WriteAgent가 critic 피드백 + 사용자 답변 반영하여 재작성
   → CriticAgent 재평가 (최대 3회 반복, 이후 자동 확정)
```

### Phase 5: Finalization

1. ReferencesAgent → `bibliography.bib` 최종 정리
2. Orchestrator → `main.tex` 조립 (`\input{}` 방식)
3. Supabase Storage에 업로드
4. 채팅창에 다운로드 링크 제공

---

## Database Schema (Supabase)

```sql
sessions (
  id              uuid primary key,
  topic           text,
  status          text,           -- clarifying | research | outline | writing | done
  outline         text,           -- Markdown 형식
  clarify_notes   text,           -- clarifying Q&A 요약 Markdown
  created_at      timestamptz
)

messages (
  id          uuid primary key,
  session_id  uuid references sessions,
  role        text,               -- user | agent | critic
  content     text,               -- Markdown 형식
  created_at  timestamptz
)

paper_references (
  id          uuid primary key,
  session_id  uuid references sessions,
  summary_md  text,               -- 논문/자료 요약 Markdown (LLM이 읽는 포맷)
  bibtex_raw  text,               -- BibTeX 원본 (최종 .bib 파일 생성용)
  cite_key    text,
  source      text,               -- arxiv | semantic_scholar | tavily | upload
  created_at  timestamptz
)

chapters (
  id          uuid primary key,
  session_id  uuid references sessions,
  order_index int,
  title       text,
  latex       text,               -- 최종 LaTeX 본문
  status      text,               -- draft | reviewing | approved
  critic_log  text,               -- 리뷰 이력 Markdown
  created_at  timestamptz
)

agent_memory (
  id          uuid primary key,
  session_id  uuid references sessions,
  agent       text,               -- orchestrator | search | paper | write | ...
  content     text,               -- 에이전트 작업 메모 Markdown
  created_at  timestamptz
)
```

**Supabase Storage 버킷:**

```
uploads/   → 사용자 업로드 파일 (PDF, CSV, Excel)
outputs/   → 생성된 LaTeX 프로젝트 (session_id 기준 폴더)
```

---

## Output Structure

```
output/{session_id}/
├── main.tex
├── bibliography.bib
├── chapters/
│   ├── 01_introduction.tex
│   ├── 02_related_work.tex
│   ├── 03_methodology.tex
│   └── ...
└── figures/
    ├── fig1.tex
    └── fig2.tex
```

---

## Project Directory Structure

```
abolition/
├── backend/
│   ├── main.py                      # FastAPI 앱, SSE 엔드포인트
│   ├── agents/
│   │   ├── orchestrator.py
│   │   ├── search_agent.py
│   │   ├── paper_agent.py
│   │   ├── write_agent.py
│   │   ├── references_agent.py
│   │   ├── figure_agent.py
│   │   └── critic_agent.py
│   ├── tools/                       # 각 agent용 커스텀 툴
│   │   ├── tavily_search.py
│   │   ├── arxiv_search.py
│   │   ├── semantic_scholar.py
│   │   ├── latex_writer.py
│   │   └── bibtex_manager.py
│   ├── db/
│   │   ├── supabase.py              # 클라이언트 초기화
│   │   └── repositories/
│   │       ├── sessions.py
│   │       ├── chapters.py
│   │       ├── references.py
│   │       └── messages.py
│   └── models/                      # Pydantic 스키마
├── frontend/
│   ├── app/
│   │   └── page.tsx                 # 4컬럼 메인 레이아웃
│   └── components/
│       ├── SessionPanel.tsx
│       ├── ReferencesPanel.tsx
│       ├── ChatPanel.tsx
│       └── PreviewPanel.tsx
└── docs/
    └── superpowers/
        └── specs/
            └── 2026-04-29-deep-agents-design.md
```

---

## Key Design Decisions

- **deepagents `task` 툴 활용:** 각 subagent를 별도 컨텍스트로 격리하여 오염 방지
- **HITL 원칙:** CriticAgent는 자동 재작성 없이 반드시 사용자 승인 후 재작성. 문제 설명 → 사용자 결정 → 사용자 추가 입력 수집 순서를 지킨다.
- **LLM 내부 저장 포맷은 Markdown:** 에이전트가 기억, 참고문헌, 데이터 분석 결과를 저장할 때 모두 Markdown 형식으로 작성한다. JSON/BibTeX 원본은 별도 보관하되, LLM이 읽고 쓰는 컨텍스트는 Markdown으로 통일하여 토큰 효율을 높인다.
- **Preview는 이벤트 기반 렌더링:** 논문 본문은 토큰 단위 스트리밍 없이, 챕터 완성 또는 사용자 의견이 필요한 시점(HITL 트리거)에만 Preview 패널을 업데이트한다. 진행 중에는 로딩 인디케이터를 표시한다.
- **Chat 창만 SSE 스트리밍:** 에이전트의 채팅 메시지(질문, 상태 안내, critic 리포트)는 토큰 단위로 스트리밍. 논문 본문은 스트리밍하지 않는다.
- **LaTeX 우선:** 모든 출력은 처음부터 LaTeX 형식으로 작성. HTML 렌더링은 Preview 전용
- **최대 반복 3회:** critic 루프가 무한 반복되지 않도록 챕터당 최대 3회로 제한, 이후 자동 확정
