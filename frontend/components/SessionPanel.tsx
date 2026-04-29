"use client";
import { useState } from "react";
import { Session } from "@/lib/types";

interface Props {
  sessions: Session[];
  activeSession: Session | null;
  loading: boolean;
  onCreateSession: (topic: string) => Promise<Session>;
  onSelectSession: (session: Session) => void;
  onDeleteSession: (sessionId: string) => Promise<void>;
}

const STATUS_LABEL: Record<string, string> = {
  clarifying: "CLARIFYING",
  research: "RESEARCH",
  outline: "OUTLINE",
  writing: "WRITING",
  done: "DONE",
};

export default function SessionPanel({
  sessions,
  activeSession,
  loading,
  onCreateSession,
  onSelectSession,
  onDeleteSession,
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
      <div className="flex-none h-10 flex items-center px-3 border-b border-gray-900">
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
          Sessions
        </span>
      </div>

      <div className="flex-none px-3 py-3 border-b border-gray-300">
        <textarea
          className="w-full bg-white border border-gray-400 p-2 text-xs text-gray-900 placeholder:text-gray-400 resize-none h-20 focus:outline-none focus:border-gray-900 transition-colors"
          placeholder="Enter paper topic..."
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
        <button
          onClick={handleCreate}
          disabled={creating || !topic.trim()}
          className="mt-2 w-full bg-gray-900 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-bold py-2 uppercase tracking-wide transition-colors"
        >
          {creating ? "Creating..." : "+ New Session"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="px-3 py-3 text-xs text-gray-400">Loading...</div>
        )}
        {sessions.map((s) => (
          <div
            key={s.id}
            className={`group flex items-stretch border-b border-gray-200 transition-colors ${
              activeSession?.id === s.id ? "bg-gray-200" : "hover:bg-gray-100"
            }`}
          >
            <button
              onClick={() => onSelectSession(s)}
              className="flex-1 text-left px-3 py-3 min-w-0"
            >
              <p
                className={`text-xs truncate leading-snug mb-1 ${
                  activeSession?.id === s.id ? "text-gray-900" : "text-gray-800"
                }`}
              >
                {s.topic}
              </p>
              <span className="text-[10px] uppercase tracking-wide font-bold text-gray-400">
                {STATUS_LABEL[s.status] ?? s.status}
              </span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteSession(s.id);
              }}
              className="flex-none px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-900"
              title="Delete session"
            >
              ✕
            </button>
          </div>
        ))}
        {sessions.length === 0 && !loading && (
          <div className="px-3 py-4 text-xs text-gray-400">No sessions.</div>
        )}
      </div>
    </div>
  );
}
