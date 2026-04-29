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

const STATUS_STYLE: Record<string, string> = {
  clarifying: "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30",
  research: "bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30",
  outline: "bg-violet-500/15 text-violet-400 ring-1 ring-violet-500/30",
  writing: "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30",
  done: "bg-slate-500/15 text-slate-400 ring-1 ring-slate-500/30",
};

const STATUS_DOT: Record<string, string> = {
  clarifying: "bg-amber-400",
  research: "bg-blue-400",
  outline: "bg-violet-400",
  writing: "bg-emerald-400",
  done: "bg-slate-500",
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
      {/* Panel header */}
      <div className="flex-none px-4 py-3 border-b border-slate-700/60">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3">
          Sessions
        </p>
        <textarea
          className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 placeholder:text-slate-500 resize-none h-20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition"
          placeholder="Enter paper topic..."
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
        <button
          onClick={handleCreate}
          disabled={creating || !topic.trim()}
          className="mt-2 w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium py-2 rounded-lg transition shadow-sm"
        >
          {creating ? (
            <span className="flex items-center justify-center gap-1.5">
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Creating...
            </span>
          ) : (
            "+ New Session"
          )}
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto py-2">
        {loading && (
          <div className="px-4 py-3 text-xs text-slate-500 flex items-center gap-2">
            <span className="w-3 h-3 border-2 border-slate-600 border-t-slate-400 rounded-full animate-spin" />
            Loading...
          </div>
        )}
        {sessions.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelectSession(s)}
            className={`w-full text-left px-4 py-3 transition group ${
              activeSession?.id === s.id
                ? "bg-indigo-500/10 border-r-2 border-r-indigo-500"
                : "hover:bg-slate-800/60"
            }`}
          >
            <div className="flex items-start gap-2">
              <div
                className={`mt-1 w-1.5 h-1.5 rounded-full flex-none ${STATUS_DOT[s.status] ?? "bg-slate-500"}`}
              />
              <div className="min-w-0 flex-1">
                <p
                  className={`text-xs font-medium truncate leading-snug ${
                    activeSession?.id === s.id
                      ? "text-slate-100"
                      : "text-slate-300 group-hover:text-slate-100"
                  }`}
                >
                  {s.topic}
                </p>
                <span
                  className={`inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_STYLE[s.status] ?? "bg-slate-500/15 text-slate-400"}`}
                >
                  {s.status}
                </span>
              </div>
            </div>
          </button>
        ))}
        {sessions.length === 0 && !loading && (
          <div className="px-4 py-6 text-center">
            <p className="text-xs text-slate-600">No sessions yet.</p>
            <p className="text-[10px] text-slate-700 mt-1">
              Create one above to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
