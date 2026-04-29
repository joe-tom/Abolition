"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Reference } from "@/lib/types";
import { api } from "@/lib/api";

const SOURCE_LABEL: Record<string, string> = {
  arxiv: "ARXIV",
  semantic_scholar: "S2",
  tavily: "WEB",
  upload: "UPLOAD",
};

function RefCard({
  ref,
  expanded,
  onToggle,
}: {
  ref: Reference;
  expanded: boolean;
  onToggle: () => void;
}) {
  const plainSummary = ref.summary_md
    ? ref.summary_md
        .replace(/^#+\s*/gm, "")
        .replace(/\*+/g, "")
        .trim()
    : null;
  return (
    <div className="border-b border-gray-200">
      <button
        className="w-full text-left px-3 py-3 hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-start gap-2 mb-1">
          <span className="flex-none text-[9px] font-bold border border-gray-400 px-1 py-0.5 text-gray-600 uppercase mt-0.5">
            {SOURCE_LABEL[ref.source] ?? ref.source}
          </span>
          <span className="text-xs font-bold text-gray-900 leading-tight line-clamp-2">
            {ref.title || ref.cite_key}
          </span>
        </div>
        <code className="text-[10px] text-gray-400 font-mono block mb-1">
          {ref.cite_key}
        </code>
        {plainSummary && !expanded && (
          <p className="text-[10px] text-gray-400 leading-relaxed line-clamp-2">
            {plainSummary.slice(0, 150)}
          </p>
        )}
      </button>
      {expanded && plainSummary && (
        <div className="px-3 pb-3 border-t border-gray-100 bg-gray-50">
          <p className="text-[10px] text-gray-600 leading-relaxed pt-2 whitespace-pre-wrap">
            {plainSummary}
          </p>
        </div>
      )}
    </div>
  );
}

interface Props {
  sessionId: string | null;
  refsStale: boolean;
  onRefreshed: () => void;
}

type Tab = "session" | "library";

export default function ReferencesPanel({
  sessionId,
  refsStale,
  onRefreshed,
}: Props) {
  const [tab, setTab] = useState<Tab>("session");
  const [sessionRefs, setSessionRefs] = useState<Reference[]>([]);
  const [libraryRefs, setLibraryRefs] = useState<Reference[]>([]);
  const [uploading, setUploading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadSession = useCallback(async () => {
    if (!sessionId) return;
    try {
      const data = await api.getReferences(sessionId);
      setSessionRefs(data);
    } catch (e) {
      console.error(e);
    }
  }, [sessionId]);

  const loadLibrary = useCallback(async () => {
    try {
      const data = await api.getLibraryReferences();
      setLibraryRefs(data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    setSessionRefs([]);
    setExpanded(null);
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  useEffect(() => {
    if (refsStale) {
      Promise.all([loadSession(), loadLibrary()]).then(() => onRefreshed());
    }
  }, [refsStale, loadSession, loadLibrary, onRefreshed]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!sessionId || !e.target.files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(e.target.files)) {
        await api.uploadFile(sessionId, file);
      }
      await loadSession();
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const activeRefs = tab === "session" ? sessionRefs : libraryRefs;

  return (
    <div className="flex flex-col h-full">
      {/* header */}
      <div className="flex-none h-10 flex items-center justify-between px-3 border-b border-gray-900">
        <div className="flex items-center gap-0">
          {(["session", "library"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                setExpanded(null);
              }}
              className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 border-b-2 transition-colors ${
                tab === t
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              {t === "session"
                ? `Session${sessionRefs.length > 0 ? ` (${sessionRefs.length})` : ""}`
                : `Library${libraryRefs.length > 0 ? ` (${libraryRefs.length})` : ""}`}
            </button>
          ))}
        </div>
        {tab === "session" && (
          <>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={!sessionId || uploading}
              className="text-[10px] font-bold uppercase tracking-wide border border-gray-400 px-2 py-1 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              {uploading ? "..." : "Upload"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.csv,.xlsx,.xls,.txt"
              className="hidden"
              onChange={handleUpload}
            />
          </>
        )}
      </div>

      {/* list */}
      <div className="flex-1 overflow-y-auto">
        {tab === "session" && !sessionId && (
          <div className="px-3 py-4 text-xs text-gray-400">
            Select a session.
          </div>
        )}
        {activeRefs.map((ref) => (
          <RefCard
            key={ref.id}
            ref={ref}
            expanded={expanded === ref.id}
            onToggle={() => setExpanded(expanded === ref.id ? null : ref.id)}
          />
        ))}
        {activeRefs.length === 0 && (tab === "library" || sessionId) && (
          <div className="px-3 py-4 text-xs text-gray-400">
            {tab === "session" ? "No references yet." : "Library is empty."}
          </div>
        )}
      </div>
    </div>
  );
}
