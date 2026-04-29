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
