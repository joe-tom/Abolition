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
