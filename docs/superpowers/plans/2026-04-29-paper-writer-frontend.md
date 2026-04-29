# Paper Writer Frontend — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Next.js 15 + Tailwind CSS로 4컬럼 레이아웃의 논문 작성 UI를 구축한다. Session 관리, 참고문헌 업로드, SSE 기반 채팅 스트리밍, HITL 버튼, LaTeX 프리뷰를 포함한다.

**Architecture:** `page.tsx`가 4컬럼 고정 레이아웃을 렌더링한다. 각 패널은 독립 컴포넌트. `useSSE` 훅이 백엔드 SSE 스트림을 소비하고 채팅 메시지를 누적한다. Preview 패널은 `preview_update` 이벤트 수신 시에만 API를 호출해 최신 챕터를 가져온다(토큰 스트리밍 없음). HITL 이벤트 수신 시 ChatPanel에 인라인 버튼이 렌더링된다.

**Tech Stack:** Node.js 20+, Next.js 15 (App Router), Tailwind CSS, TypeScript, react-syntax-highlighter (LaTeX 코드 하이라이팅), EventSource API (SSE)

---

## File Map

```
frontend/
├── app/
│   ├── layout.tsx              # 루트 레이아웃
│   ├── globals.css             # Tailwind 기본 스타일
│   └── page.tsx                # 4컬럼 메인 레이아웃
├── components/
│   ├── SessionPanel.tsx        # 좌측: 세션 목록 + 새 세션 생성
│   ├── ReferencesPanel.tsx     # 2번: 참고문헌 목록 + 파일 업로드
│   ├── ChatPanel.tsx           # 3번: 채팅 스트림 + HITL 버튼
│   └── PreviewPanel.tsx        # 우측: LaTeX 챕터 미리보기
├── hooks/
│   ├── useSession.ts           # 세션 상태 관리
│   └── useSSE.ts              # SSE 연결 + 메시지 파싱
└── lib/
    ├── api.ts                  # 백엔드 API 클라이언트
    └── types.ts                # TypeScript 공통 타입
```

---

## Task 1: Next.js 프로젝트 초기화

**Files:**

- Create: `frontend/` 전체

- [ ] **Step 1: Next.js 앱 생성**

```bash
cd D:\dev\abolition
npx create-next-app@latest frontend --typescript --tailwind --app --no-src-dir --import-alias "@/*"
cd frontend
```

- [ ] **Step 2: 추가 패키지 설치**

```bash
npm install react-syntax-highlighter
npm install --save-dev @types/react-syntax-highlighter
```

- [ ] **Step 3: globals.css — 기본 스타일 설정**

`frontend/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html,
body {
  height: 100%;
  overflow: hidden;
}
```

- [ ] **Step 4: 개발 서버 기동 확인**

```bash
npm run dev
```

Expected: `http://localhost:3000` 브라우저에서 Next.js 기본 페이지 확인.

- [ ] **Step 5: 커밋**

```bash
git add frontend/
git commit -m "feat: initialize next.js frontend with tailwind"
```

---

## Task 2: TypeScript 타입 + API 클라이언트

**Files:**

- Create: `frontend/lib/types.ts`
- Create: `frontend/lib/api.ts`

- [ ] **Step 1: 공통 타입 작성**

`frontend/lib/types.ts`:

```typescript
export type SessionStatus =
  | "clarifying"
  | "research"
  | "outline"
  | "writing"
  | "done";

export interface Session {
  id: string;
  topic: string;
  status: SessionStatus;
  outline: string | null;
  clarify_notes: string | null;
  created_at: string;
}

export interface Chapter {
  id: string;
  order_index: number;
  title: string;
  latex: string | null;
  status: "draft" | "reviewing" | "approved";
}

export interface Reference {
  id: string;
  cite_key: string;
  summary_md: string | null;
  source: "arxiv" | "semantic_scholar" | "tavily" | "upload";
  created_at: string;
}

export type SSEMessageType =
  | { type: "token"; content: string }
  | { type: "hitl"; data: HITLDecision | HITLQuestions }
  | { type: "preview_update"; session_id: string }
  | { type: "done" }
  | { type: "error"; message: string };

export interface HITLDecision {
  type: "hitl_decision";
  critic_report: string;
  question: string;
  options: string[];
}

export interface HITLQuestions {
  type: "hitl_questions";
  questions: string[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "agent" | "critic";
  content: string;
  hitl?: HITLDecision | HITLQuestions;
}
```

- [ ] **Step 2: API 클라이언트 작성**

`frontend/lib/api.ts`:

```typescript
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const api = {
  async createSession(topic: string) {
    const res = await fetch(`${BASE}/api/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async listSessions() {
    const res = await fetch(`${BASE}/api/sessions`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getSession(sessionId: string) {
    const res = await fetch(`${BASE}/api/sessions/${sessionId}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getChapters(sessionId: string) {
    const res = await fetch(`${BASE}/api/sessions/${sessionId}/chapters`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getReferences(sessionId: string) {
    const res = await fetch(`${BASE}/api/sessions/${sessionId}/references`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async uploadFile(sessionId: string, file: File) {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${BASE}/api/sessions/${sessionId}/upload`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  chatStream(sessionId: string, message: string): EventSource {
    // POST via fetch + ReadableStream (EventSource only supports GET)
    // We use fetch-based SSE manually in useSSE hook instead
    throw new Error("Use useSSE hook for streaming");
  },

  async resumeStream(sessionId: string, response: string): Promise<Response> {
    return fetch(`${BASE}/api/sessions/${sessionId}/resume`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ response }),
    });
  },

  getDownloadUrl(sessionId: string): string {
    return `${BASE}/api/sessions/${sessionId}/download`;
  },
};
```

- [ ] **Step 3: .env.local 작성**

`frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

- [ ] **Step 4: 커밋**

```bash
git add frontend/lib/ frontend/.env.local
git commit -m "feat: add typescript types and api client"
```

---

## Task 3: useSSE + useSession 훅

**Files:**

- Create: `frontend/hooks/useSSE.ts`
- Create: `frontend/hooks/useSession.ts`

- [ ] **Step 1: useSSE 훅 작성**

`frontend/hooks/useSSE.ts`:

```typescript
"use client";
import { useState, useCallback, useRef } from "react";
import { SSEMessageType, ChatMessage } from "@/lib/types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

let msgCounter = 0;

export const useSSE = (sessionId: string | null) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [previewStale, setPreviewStale] = useState(false);
  const currentAgentMsgId = useRef<string | null>(null);

  const appendToken = useCallback((token: string) => {
    setMessages((prev) => {
      if (!currentAgentMsgId.current) return prev;
      return prev.map((m) =>
        m.id === currentAgentMsgId.current
          ? { ...m, content: m.content + token }
          : m,
      );
    });
  }, []);

  const processStream = useCallback(
    async (response: Response) => {
      if (!response.body) return;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // Start a new agent message bubble
      const agentMsgId = `agent-${++msgCounter}`;
      currentAgentMsgId.current = agentMsgId;
      setMessages((prev) => [
        ...prev,
        { id: agentMsgId, role: "agent", content: "" },
      ]);
      setIsStreaming(true);

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6);
            let parsed: SSEMessageType;
            try {
              parsed = JSON.parse(raw);
            } catch {
              continue;
            }

            if (parsed.type === "token") {
              appendToken(parsed.content);
            } else if (parsed.type === "hitl") {
              // Close current agent bubble and add HITL message
              currentAgentMsgId.current = null;
              const hitlId = `hitl-${++msgCounter}`;
              setMessages((prev) => [
                ...prev,
                {
                  id: hitlId,
                  role: "critic",
                  content: "",
                  hitl: parsed.data as any,
                },
              ]);
            } else if (parsed.type === "preview_update") {
              setPreviewStale(true);
            } else if (parsed.type === "done") {
              currentAgentMsgId.current = null;
            } else if (parsed.type === "error") {
              setMessages((prev) => [
                ...prev,
                {
                  id: `err-${++msgCounter}`,
                  role: "agent",
                  content: `Error: ${parsed.message}`,
                },
              ]);
            }
          }
        }
      } finally {
        setIsStreaming(false);
        currentAgentMsgId.current = null;
      }
    },
    [appendToken],
  );

  const sendMessage = useCallback(
    async (message: string) => {
      if (!sessionId || isStreaming) return;
      const userMsgId = `user-${++msgCounter}`;
      setMessages((prev) => [
        ...prev,
        { id: userMsgId, role: "user", content: message },
      ]);
      const res = await fetch(`${BASE}/api/sessions/${sessionId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      await processStream(res);
    },
    [sessionId, isStreaming, processStream],
  );

  const resumeHITL = useCallback(
    async (response: string) => {
      if (!sessionId || isStreaming) return;
      const res = await fetch(`${BASE}/api/sessions/${sessionId}/resume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response }),
      });
      await processStream(res);
    },
    [sessionId, isStreaming, processStream],
  );

  const clearPreviewStale = useCallback(() => setPreviewStale(false), []);

  return {
    messages,
    isStreaming,
    previewStale,
    sendMessage,
    resumeHITL,
    clearPreviewStale,
    setMessages,
  };
};
```

- [ ] **Step 2: useSession 훅 작성**

`frontend/hooks/useSession.ts`:

```typescript
"use client";
import { useState, useEffect, useCallback } from "react";
import { Session } from "@/lib/types";
import { api } from "@/lib/api";

export const useSession = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);

  const loadSessions = useCallback(async () => {
    try {
      const data = await api.listSessions();
      setSessions(data);
    } catch (e) {
      console.error("Failed to load sessions", e);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const createSession = useCallback(async (topic: string) => {
    setLoading(true);
    try {
      const session = await api.createSession(topic);
      setSessions((prev) => [session, ...prev]);
      setActiveSession(session);
      return session;
    } finally {
      setLoading(false);
    }
  }, []);

  const selectSession = useCallback(async (session: Session) => {
    const fresh = await api.getSession(session.id);
    setActiveSession(fresh);
  }, []);

  return {
    sessions,
    activeSession,
    loading,
    createSession,
    selectSession,
    loadSessions,
  };
};
```

- [ ] **Step 3: 커밋**

```bash
git add frontend/hooks/
git commit -m "feat: add useSSE and useSession hooks"
```

---

## Task 4: 4컬럼 메인 레이아웃

**Files:**

- Modify: `frontend/app/layout.tsx`
- Modify: `frontend/app/page.tsx`

- [ ] **Step 1: layout.tsx 수정**

`frontend/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Paper Writer",
  description: "AI-powered academic paper writing assistant",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-gray-950 text-gray-100 font-mono overflow-hidden">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 2: page.tsx 4컬럼 레이아웃 작성**

`frontend/app/page.tsx`:

```tsx
"use client";
import { useSession } from "@/hooks/useSession";
import { useSSE } from "@/hooks/useSSE";
import SessionPanel from "@/components/SessionPanel";
import ReferencesPanel from "@/components/ReferencesPanel";
import ChatPanel from "@/components/ChatPanel";
import PreviewPanel from "@/components/PreviewPanel";

export default function Home() {
  const { sessions, activeSession, loading, createSession, selectSession } =
    useSession();
  const {
    messages,
    isStreaming,
    previewStale,
    sendMessage,
    resumeHITL,
    clearPreviewStale,
    setMessages,
  } = useSSE(activeSession?.id ?? null);

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Col 1 — Sessions (20%) */}
      <div className="w-1/5 min-w-0 border-r border-gray-800 flex flex-col">
        <SessionPanel
          sessions={sessions}
          activeSession={activeSession}
          loading={loading}
          onCreateSession={createSession}
          onSelectSession={selectSession}
        />
      </div>

      {/* Col 2 — References (20%) */}
      <div className="w-1/5 min-w-0 border-r border-gray-800 flex flex-col">
        <ReferencesPanel sessionId={activeSession?.id ?? null} />
      </div>

      {/* Col 3 — Chat (30%) */}
      <div className="w-[30%] min-w-0 border-r border-gray-800 flex flex-col">
        <ChatPanel
          messages={messages}
          isStreaming={isStreaming}
          sessionId={activeSession?.id ?? null}
          onSendMessage={sendMessage}
          onResumeHITL={resumeHITL}
        />
      </div>

      {/* Col 4 — Preview (30%) */}
      <div className="w-[30%] min-w-0 flex flex-col">
        <PreviewPanel
          sessionId={activeSession?.id ?? null}
          previewStale={previewStale}
          onRefreshed={clearPreviewStale}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 커밋**

```bash
git add frontend/app/
git commit -m "feat: add 4-column main layout"
```

---

## Task 5: SessionPanel 컴포넌트

**Files:**

- Create: `frontend/components/SessionPanel.tsx`

- [ ] **Step 1: SessionPanel 작성**

`frontend/components/SessionPanel.tsx`:

```tsx
"use client";
import { useState } from "react";
import { Session } from "@/lib/types";

interface Props {
  sessions: Session[];
  activeSession: Session | null;
  loading: boolean;
  onCreateSession: (topic: string) => Promise<Session>;
  onSelectSession: (session: Session) => void;
}

const STATUS_COLOR: Record<string, string> = {
  clarifying: "text-yellow-400",
  research: "text-blue-400",
  outline: "text-purple-400",
  writing: "text-green-400",
  done: "text-gray-400",
};

export default function SessionPanel({
  sessions,
  activeSession,
  loading,
  onCreateSession,
  onSelectSession,
}: Props) {
  const [topic, setTopic] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!topic.trim()) return;
    setCreating(true);
    try {
      await onCreateSession(topic.trim());
      setTopic("");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-800">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
          Sessions
        </h2>
        <textarea
          className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-xs resize-none h-16 focus:outline-none focus:border-blue-500"
          placeholder="Enter paper topic..."
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
        <button
          onClick={handleCreate}
          disabled={creating || !topic.trim()}
          className="mt-1 w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs py-1.5 rounded transition"
        >
          {creating ? "Creating..." : "New Session"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && <p className="text-xs text-gray-500 p-3">Loading...</p>}
        {sessions.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelectSession(s)}
            className={`w-full text-left px-3 py-2 border-b border-gray-800 hover:bg-gray-800 transition ${
              activeSession?.id === s.id ? "bg-gray-800" : ""
            }`}
          >
            <p className="text-xs font-medium truncate">{s.topic}</p>
            <p
              className={`text-[10px] mt-0.5 ${STATUS_COLOR[s.status] ?? "text-gray-500"}`}
            >
              {s.status}
            </p>
          </button>
        ))}
        {sessions.length === 0 && !loading && (
          <p className="text-xs text-gray-600 p-3">No sessions yet.</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 개발 서버에서 SessionPanel 확인**

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` — 좌측 컬럼에 Sessions 패널 렌더링 확인. (백엔드 없이도 UI 구조 확인 가능)

- [ ] **Step 3: 커밋**

```bash
git add frontend/components/SessionPanel.tsx
git commit -m "feat: add session panel component"
```

---

## Task 6: ReferencesPanel + 파일 업로드

**Files:**

- Create: `frontend/components/ReferencesPanel.tsx`

- [ ] **Step 1: ReferencesPanel 작성**

`frontend/components/ReferencesPanel.tsx`:

```tsx
"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Reference } from "@/lib/types";
import { api } from "@/lib/api";

const SOURCE_BADGE: Record<string, string> = {
  arxiv: "bg-red-900 text-red-200",
  semantic_scholar: "bg-blue-900 text-blue-200",
  tavily: "bg-green-900 text-green-200",
  upload: "bg-purple-900 text-purple-200",
};

interface Props {
  sessionId: string | null;
}

export default function ReferencesPanel({ sessionId }: Props) {
  const [refs, setRefs] = useState<Reference[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadRefs = useCallback(async () => {
    if (!sessionId) return;
    try {
      const data = await api.getReferences(sessionId);
      setRefs(data);
    } catch (e) {
      console.error(e);
    }
  }, [sessionId]);

  useEffect(() => {
    setRefs([]);
    loadRefs();
  }, [loadRefs]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!sessionId || !e.target.files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(e.target.files)) {
        await api.uploadFile(sessionId, file);
      }
      await loadRefs();
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-800 flex items-center justify-between">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          References
        </h2>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={!sessionId || uploading}
          className="text-[10px] bg-gray-700 hover:bg-gray-600 disabled:opacity-40 px-2 py-1 rounded transition"
        >
          {uploading ? "Uploading..." : "+ Upload"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.csv,.xlsx,.xls,.txt"
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {!sessionId && (
          <p className="text-xs text-gray-600 p-1">
            Select a session to see references.
          </p>
        )}
        {refs.map((ref) => (
          <div key={ref.id} className="bg-gray-900 rounded p-2 text-xs">
            <div className="flex items-center gap-1 mb-1">
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded ${SOURCE_BADGE[ref.source] ?? "bg-gray-700"}`}
              >
                {ref.source}
              </span>
              <code className="text-gray-300 truncate">{ref.cite_key}</code>
            </div>
            {ref.summary_md && (
              <p className="text-gray-500 line-clamp-2 text-[10px] leading-relaxed">
                {ref.summary_md.replace(/^#+\s*/gm, "").slice(0, 120)}...
              </p>
            )}
          </div>
        ))}
        {refs.length === 0 && sessionId && (
          <p className="text-xs text-gray-600 p-1">
            No references yet. Agent will collect them during research.
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add frontend/components/ReferencesPanel.tsx
git commit -m "feat: add references panel with file upload"
```

---

## Task 7: ChatPanel + HITL 버튼

**Files:**

- Create: `frontend/components/ChatPanel.tsx`

- [ ] **Step 1: ChatPanel 작성**

`frontend/components/ChatPanel.tsx`:

```tsx
"use client";
import { useState, useRef, useEffect } from "react";
import { ChatMessage, HITLDecision, HITLQuestions } from "@/lib/types";

interface Props {
  messages: ChatMessage[];
  isStreaming: boolean;
  sessionId: string | null;
  onSendMessage: (msg: string) => void;
  onResumeHITL: (response: string) => void;
}

function HITLDecisionBlock({
  data,
  onResume,
}: {
  data: HITLDecision;
  onResume: (r: string) => void;
}) {
  return (
    <div className="mt-2 bg-gray-800 border border-yellow-700 rounded p-3 text-xs">
      <p className="text-yellow-400 font-bold mb-1">Critic Report</p>
      <pre className="whitespace-pre-wrap text-gray-300 mb-3 text-[10px] leading-relaxed">
        {data.critic_report}
      </pre>
      <p className="text-gray-300 mb-2">{data.question}</p>
      <div className="flex gap-2">
        {data.options.map((opt) => (
          <button
            key={opt}
            onClick={() => onResume(opt)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition ${
              opt === "rewrite"
                ? "bg-yellow-600 hover:bg-yellow-500 text-white"
                : "bg-gray-600 hover:bg-gray-500 text-gray-200"
            }`}
          >
            {opt === "rewrite" ? "Rewrite" : "Continue as-is"}
          </button>
        ))}
      </div>
    </div>
  );
}

function HITLQuestionsBlock({
  data,
  onResume,
}: {
  data: HITLQuestions;
  onResume: (r: string) => void;
}) {
  const [answers, setAnswers] = useState<string[]>(
    data.questions.map(() => ""),
  );

  const handleSubmit = () => {
    const md = data.questions
      .map((q, i) => `**Q${i + 1}: ${q}**\nA: ${answers[i]}`)
      .join("\n\n");
    onResume(md);
  };

  return (
    <div className="mt-2 bg-gray-800 border border-blue-700 rounded p-3 text-xs">
      <p className="text-blue-400 font-bold mb-2">Author Questions</p>
      {data.questions.map((q, i) => (
        <div key={i} className="mb-3">
          <p className="text-gray-300 mb-1">{`Q${i + 1}. ${q}`}</p>
          <textarea
            className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-xs resize-none h-14 focus:outline-none focus:border-blue-500"
            placeholder="Your answer..."
            value={answers[i]}
            onChange={(e) => {
              const next = [...answers];
              next[i] = e.target.value;
              setAnswers(next);
            }}
          />
        </div>
      ))}
      <button
        onClick={handleSubmit}
        disabled={answers.some((a) => !a.trim())}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white py-1.5 rounded transition"
      >
        Submit Answers
      </button>
    </div>
  );
}

function MessageBubble({
  msg,
  onResume,
}: {
  msg: ChatMessage;
  onResume: (r: string) => void;
}) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[90%] rounded-lg px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
          isUser ? "bg-blue-700 text-white" : "bg-gray-800 text-gray-200"
        }`}
      >
        {msg.content}
        {msg.hitl && (msg.hitl as HITLDecision).options && (
          <HITLDecisionBlock
            data={msg.hitl as HITLDecision}
            onResume={onResume}
          />
        )}
        {msg.hitl &&
          (msg.hitl as HITLQuestions).questions &&
          !(msg.hitl as HITLDecision).options && (
            <HITLQuestionsBlock
              data={msg.hitl as HITLQuestions}
              onResume={onResume}
            />
          )}
      </div>
    </div>
  );
}

export default function ChatPanel({
  messages,
  isStreaming,
  sessionId,
  onSendMessage,
  onResumeHITL,
}: Props) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isStreaming || !sessionId) return;
    onSendMessage(input.trim());
    setInput("");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-800">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          Chat
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {!sessionId && (
          <p className="text-xs text-gray-600">
            Create or select a session to start.
          </p>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} onResume={onResumeHITL} />
        ))}
        {isStreaming && (
          <div className="flex justify-start mb-3">
            <div className="bg-gray-800 rounded-lg px-3 py-2">
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-gray-800">
        <div className="flex gap-2">
          <textarea
            className="flex-1 bg-gray-900 border border-gray-700 rounded p-2 text-xs resize-none h-16 focus:outline-none focus:border-blue-500"
            placeholder={
              sessionId ? "Type a message..." : "Select a session first"
            }
            value={input}
            disabled={!sessionId || isStreaming}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            onClick={handleSend}
            disabled={!sessionId || isStreaming || !input.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs px-3 rounded transition"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add frontend/components/ChatPanel.tsx
git commit -m "feat: add chat panel with streaming display and hitl buttons"
```

---

## Task 8: PreviewPanel (LaTeX 미리보기)

**Files:**

- Create: `frontend/components/PreviewPanel.tsx`

- [ ] **Step 1: PreviewPanel 작성**

`frontend/components/PreviewPanel.tsx`:

```tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Chapter } from "@/lib/types";
import { api } from "@/lib/api";

interface Props {
  sessionId: string | null;
  previewStale: boolean;
  onRefreshed: () => void;
}

export default function PreviewPanel({
  sessionId,
  previewStale,
  onRefreshed,
}: Props) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadChapters = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const data = await api.getChapters(sessionId);
      setChapters(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    setChapters([]);
    setActiveTab(0);
    loadChapters();
  }, [loadChapters]);

  useEffect(() => {
    if (previewStale) {
      loadChapters().then(onRefreshed);
    }
  }, [previewStale, loadChapters, onRefreshed]);

  const activeChapter = chapters[activeTab];

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-800 flex items-center justify-between">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          LaTeX Preview
        </h2>
        {sessionId && (
          <a
            href={api.getDownloadUrl(sessionId)}
            className="text-[10px] bg-green-800 hover:bg-green-700 px-2 py-1 rounded transition text-green-200"
          >
            Download .zip
          </a>
        )}
      </div>

      {chapters.length > 0 && (
        <div className="flex gap-1 px-2 pt-2 flex-wrap border-b border-gray-800 pb-2">
          {chapters.map((ch, i) => (
            <button
              key={ch.id}
              onClick={() => setActiveTab(i)}
              className={`text-[10px] px-2 py-1 rounded transition truncate max-w-[120px] ${
                i === activeTab
                  ? "bg-blue-700 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
              title={ch.title}
            >
              {i + 1}. {ch.title}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-xs text-gray-500 animate-pulse">
              Updating preview...
            </div>
          </div>
        )}

        {!loading && !sessionId && (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-gray-600">
              Select a session to see preview.
            </p>
          </div>
        )}

        {!loading && sessionId && chapters.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-gray-600">
              No chapters yet. Writing will appear here.
            </p>
          </div>
        )}

        {!loading && activeChapter?.latex && (
          <SyntaxHighlighter
            language="latex"
            style={vscDarkPlus}
            customStyle={{
              margin: 0,
              borderRadius: 0,
              fontSize: "11px",
              height: "100%",
            }}
            showLineNumbers
          >
            {activeChapter.latex}
          </SyntaxHighlighter>
        )}

        {!loading && activeChapter && !activeChapter.latex && (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-gray-500">
              {activeChapter.status === "draft"
                ? "Writing in progress..."
                : "No content yet."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 개발 서버에서 전체 UI 확인**

```bash
npm run dev
```

`http://localhost:3000` — 4컬럼 레이아웃 전체 확인:

- 좌측: Session 생성 폼 + 목록
- 2번: References 패널 (업로드 버튼)
- 3번: Chat 패널 (입력창)
- 우측: Preview 패널 (탭 없음 상태)

- [ ] **Step 3: TypeScript 에러 확인**

```bash
npm run build
```

Expected: TypeScript 에러 0개로 빌드 성공.

- [ ] **Step 4: 커밋**

```bash
git add frontend/components/PreviewPanel.tsx
git commit -m "feat: add preview panel with latex syntax highlighting and chapter tabs"
```

---

## Task 9: 백엔드 연동 E2E 수동 테스트

**Files:** 없음 (수동 테스트)

- [ ] **Step 1: 백엔드 기동**

```bash
# 터미널 1
conda activate abolition
cd backend
uvicorn main:app --reload --port 8000
```

- [ ] **Step 2: 프론트엔드 기동**

```bash
# 터미널 2
cd frontend
npm run dev
```

- [ ] **Step 3: 세션 생성 테스트**

`http://localhost:3000` → Session 패널에 토픽 입력("Transformer architecture survey") → "New Session" 클릭 → 세션이 Sessions 목록에 나타나는지 확인.

- [ ] **Step 4: 채팅 스트리밍 테스트**

Chat 패널에 "Let's start writing the paper" 입력 → Send → Chat 패널에 토큰 단위 스트리밍 표시 확인. Preview 패널은 로딩 없이 대기 상태 유지 확인.

- [ ] **Step 5: 파일 업로드 테스트**

References 패널 "+ Upload" → PDF 파일 선택 → 업로드 후 References 목록에 파일 표시 확인.

- [ ] **Step 6: HITL 테스트**

Critic 리뷰 후 HITL 이벤트 발생 시 Chat 패널에 노란 박스 + 버튼 표시 확인. "Rewrite" 클릭 시 질문 박스(파란색)로 전환 확인. 답변 제출 후 스트리밍 재개 확인.

- [ ] **Step 7: Preview 업데이트 테스트**

챕터 작성 완료 후 Preview 패널에 LaTeX 코드 표시 + 챕터 탭 생성 확인.

- [ ] **Step 8: 최종 커밋**

```bash
git add .
git commit -m "feat: complete frontend implementation"
```

---

## Self-Review Checklist

- [x] **Spec coverage:**
  - 4컬럼 레이아웃 (20/20/30/30%) → page.tsx ✓
  - Session 패널 (목록, 생성, 선택) → SessionPanel ✓
  - References 패널 (업로드, 목록) → ReferencesPanel ✓
  - Chat SSE 스트리밍 → useSSE + ChatPanel ✓
  - HITL 버튼 (decision + questions) → HITLDecisionBlock, HITLQuestionsBlock ✓
  - Preview 이벤트 기반 렌더링 (토큰 스트리밍 없음) → previewStale 플래그 ✓
  - LaTeX 코드 미리보기 (syntax highlighting) → PreviewPanel + react-syntax-highlighter ✓
  - Download ZIP → PreviewPanel download 링크 ✓

- [x] **Placeholder scan:** 없음.

- [x] **Type consistency:** `HITLDecision.options`와 `HITLQuestions.questions`로 두 HITL 타입 구분. `useSSE`의 `previewStale` → `PreviewPanel`의 `previewStale` prop으로 일관.
