"use client";
import { useSession } from "@/hooks/useSession";
import { useSSE } from "@/hooks/useSSE";
import SessionPanel from "@/components/SessionPanel";
import ReferencesPanel from "@/components/ReferencesPanel";
import ChatPanel from "@/components/ChatPanel";
import PreviewPanel from "@/components/PreviewPanel";

export default function Home() {
  const {
    messages,
    isStreaming,
    previewStale,
    sendMessage,
    resumeHITL,
    clearPreviewStale,
    setMessages,
    setSessionId,
  } = useSSE();

  const {
    sessions,
    activeSession,
    loading,
    createSession,
    selectSession,
    deleteSession,
  } = useSession({ onMessages: setMessages, onSessionId: setSessionId });

  return (
    <div className="flex flex-col h-full">
      <header className="flex-none flex items-center gap-4 px-4 h-10 bg-white border-b border-gray-900">
        <span className="font-bold text-sm tracking-tight">PAPER WRITER</span>
        <span className="text-gray-400 text-xs">|</span>
        <span className="text-gray-500 text-xs">
          AI academic writing assistant
        </span>
        {activeSession && (
          <>
            <span className="text-gray-300 text-xs ml-auto">session:</span>
            <span className="text-gray-700 text-xs truncate max-w-xs">
              {activeSession.topic}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 border border-gray-400 text-gray-600 uppercase tracking-wide">
              {activeSession.status}
            </span>
          </>
        )}
      </header>

      <div className="flex flex-1 min-h-0">
        <div className="w-1/5 min-w-0 border-r border-gray-900 flex flex-col bg-white overflow-hidden">
          <SessionPanel
            sessions={sessions}
            activeSession={activeSession}
            loading={loading}
            onCreateSession={createSession}
            onSelectSession={selectSession}
            onDeleteSession={deleteSession}
          />
        </div>

        <div className="w-1/5 min-w-0 border-r border-gray-900 flex flex-col bg-white overflow-hidden">
          <ReferencesPanel sessionId={activeSession?.id ?? null} />
        </div>

        <div className="w-[30%] min-w-0 border-r border-gray-900 flex flex-col bg-white overflow-hidden">
          <ChatPanel
            messages={messages}
            isStreaming={isStreaming}
            sessionId={activeSession?.id ?? null}
            onSendMessage={sendMessage}
            onResumeHITL={resumeHITL}
          />
        </div>

        <div className="w-[30%] min-w-0 flex flex-col bg-white overflow-hidden">
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
