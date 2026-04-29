"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Reference } from "@/lib/types";
import { api } from "@/lib/api";

const SOURCE_STYLE: Record<string, string> = {
  arxiv: "bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30",
  semantic_scholar: "bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30",
  tavily: "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30",
  upload: "bg-violet-500/15 text-violet-400 ring-1 ring-violet-500/30",
};

const SOURCE_LABEL: Record<string, string> = {
  arxiv: "arXiv",
  semantic_scholar: "S2",
  tavily: "Web",
  upload: "Upload",
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
      {/* Panel header */}
      <div className="flex-none px-4 py-3 border-b border-slate-700/60">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
            References
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!sessionId || uploading}
            className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 px-2.5 py-1.5 rounded-lg transition"
          >
            {uploading ? (
              <>
                <span className="w-3 h-3 border-2 border-slate-500 border-t-slate-300 rounded-full animate-spin" />
                Uploading
              </>
            ) : (
              <>
                <span className="text-slate-400">↑</span>
                Upload
              </>
            )}
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
        {refs.length > 0 && (
          <p className="text-[10px] text-slate-600 mt-2">
            {refs.length} reference{refs.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Reference list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {!sessionId && (
          <div className="py-6 text-center">
            <p className="text-xs text-slate-600">Select a session</p>
            <p className="text-[10px] text-slate-700 mt-1">
              to view references.
            </p>
          </div>
        )}
        {refs.map((ref) => (
          <div
            key={ref.id}
            className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-3 hover:border-slate-600/60 transition"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-none ${SOURCE_STYLE[ref.source] ?? "bg-slate-500/15 text-slate-400"}`}
              >
                {SOURCE_LABEL[ref.source] ?? ref.source}
              </span>
              <code className="text-slate-300 text-[10px] truncate font-mono">
                {ref.cite_key}
              </code>
            </div>
            {ref.summary_md && (
              <p className="text-slate-500 text-[10px] leading-relaxed line-clamp-2">
                {ref.summary_md.replace(/^#+\s*/gm, "").slice(0, 120)}…
              </p>
            )}
          </div>
        ))}
        {refs.length === 0 && sessionId && (
          <div className="py-6 text-center">
            <p className="text-xs text-slate-600">No references yet.</p>
            <p className="text-[10px] text-slate-700 mt-1">
              Agent will collect them during research.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
