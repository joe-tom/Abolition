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
    <div className="flex flex-col h-full">
      {/* Top header */}
      <header className="flex-none flex items-center gap-3 px-5 py-3 bg-slate-900 border-b border-slate-700/60 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
            P
          </div>
          <span className="font-semibold text-sm text-slate-100 tracking-tight">
            Paper Writer
          </span>
        </div>
        <span className="text-slate-600 text-xs">|</span>
        <span className="text-slate-400 text-xs">
          AI-powered academic writing assistant
        </span>
        {activeSession && (
          <>
            <span className="text-slate-600 text-xs ml-auto">Session:</span>
            <span className="text-slate-300 text-xs font-medium truncate max-w-xs">
              {activeSession.topic}
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                {
                  clarifying: "bg-amber-500/20 text-amber-400",
                  research: "bg-blue-500/20 text-blue-400",
                  outline: "bg-violet-500/20 text-violet-400",
                  writing: "bg-emerald-500/20 text-emerald-400",
                  done: "bg-slate-500/20 text-slate-400",
                }[activeSession.status] ?? "bg-slate-500/20 text-slate-400"
              }`}
            >
              {activeSession.status}
            </span>
          </>
        )}
      </header>

      {/* 4-column body */}
      <div className="flex flex-1 min-h-0">
        {/* Col 1 — Sessions (20%) */}
        <div className="w-1/5 min-w-0 border-r border-slate-700/60 flex flex-col bg-slate-900">
          <SessionPanel
            sessions={sessions}
            activeSession={activeSession}
            loading={loading}
            onCreateSession={createSession}
            onSelectSession={selectSession}
          />
        </div>

        {/* Col 2 — References (20%) */}
        <div className="w-1/5 min-w-0 border-r border-slate-700/60 flex flex-col bg-slate-900">
          <ReferencesPanel sessionId={activeSession?.id ?? null} />
        </div>

        {/* Col 3 — Chat (30%) */}
        <div className="w-[30%] min-w-0 border-r border-slate-700/60 flex flex-col bg-slate-950">
          <ChatPanel
            messages={messages}
            isStreaming={isStreaming}
            sessionId={activeSession?.id ?? null}
            onSendMessage={sendMessage}
            onResumeHITL={resumeHITL}
          />
        </div>

        {/* Col 4 — Preview (30%) */}
        <div className="w-[30%] min-w-0 flex flex-col bg-slate-950">
          <PreviewPanel
            sessionId={activeSession?.id ?? null}
            previewStale={previewStale}
            onRefreshed={clearPreviewStale}
          />
        </div>
      </div>
    </div>
  );
}
