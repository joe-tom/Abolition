"use client";
import { useState, useEffect } from "react";
import { Session, Reference } from "@/lib/types";
import { api } from "@/lib/api";

interface Props {
  sessions: Session[];
  activeSession: Session | null;
  loading: boolean;
  onCreateSession: (topic: string, citeKeys: string[]) => Promise<Session>;
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
  const [step, setStep] = useState<"topic" | "refs">("topic");
  const [topic, setTopic] = useState("");
  const [creating, setCreating] = useState(false);
  const [libraryRefs, setLibraryRefs] = useState<Reference[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    api
      .getLibraryReferences()
      .then(setLibraryRefs)
      .catch(() => {});
  }, []);

  const goToRefs = () => {
    if (!topic.trim()) return;
    if (libraryRefs.length === 0) {
      handleCreate([]);
      return;
    }
    setSelected(new Set());
    setStep("refs");
  };

  const handleCreate = async (citeKeys: string[]) => {
    setCreating(true);
    try {
      await onCreateSession(topic.trim(), citeKeys);
      setTopic("");
      setStep("topic");
      setSelected(new Set());
    } finally {
      setCreating(false);
    }
  };

  const toggleRef = (citeKey: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(citeKey) ? next.delete(citeKey) : next.add(citeKey);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-none h-10 flex items-center px-3 border-b border-gray-900">
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
          Sessions
        </span>
      </div>

      {step === "topic" && (
        <div className="flex-none px-3 py-3 border-b border-gray-300">
          <textarea
            className="w-full bg-white border border-gray-400 p-2 text-xs text-gray-900 placeholder:text-gray-400 resize-none h-20 focus:outline-none focus:border-gray-900 transition-colors"
            placeholder="Enter paper topic..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                goToRefs();
              }
            }}
          />
          <button
            onClick={goToRefs}
            disabled={creating || !topic.trim()}
            className="mt-2 w-full bg-gray-900 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-bold py-2 uppercase tracking-wide transition-colors"
          >
            {creating
              ? "Creating..."
              : libraryRefs.length > 0
                ? "Next →"
                : "+ New Session"}
          </button>
        </div>
      )}

      {step === "refs" && (
        <div className="flex-none border-b border-gray-300 flex flex-col">
          <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Add from Library
            </span>
            <button
              onClick={() => setStep("topic")}
              className="text-[10px] text-gray-400 hover:text-gray-900"
            >
              ← Back
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {libraryRefs.map((ref) => (
              <label
                key={ref.cite_key}
                className="flex items-start gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
              >
                <input
                  type="checkbox"
                  checked={selected.has(ref.cite_key)}
                  onChange={() => toggleRef(ref.cite_key)}
                  className="mt-0.5 flex-none"
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-900 leading-tight truncate">
                    {ref.title || ref.cite_key}
                  </p>
                  <code className="text-[10px] text-gray-400 font-mono">
                    {ref.cite_key}
                  </code>
                </div>
              </label>
            ))}
          </div>
          <div className="px-3 py-2 flex gap-2">
            <button
              onClick={() => handleCreate([])}
              disabled={creating}
              className="flex-1 border border-gray-400 text-gray-600 text-xs font-bold py-1.5 uppercase tracking-wide hover:bg-gray-100 disabled:opacity-30 transition-colors"
            >
              Skip
            </button>
            <button
              onClick={() => handleCreate(Array.from(selected))}
              disabled={creating}
              className="flex-1 bg-gray-900 hover:bg-gray-700 disabled:opacity-30 text-white text-xs font-bold py-1.5 uppercase tracking-wide transition-colors"
            >
              {creating
                ? "..."
                : `Create${selected.size > 0 ? ` (${selected.size})` : ""}`}
            </button>
          </div>
        </div>
      )}

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
