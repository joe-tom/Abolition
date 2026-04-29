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

interface Props {
  sessionId: string | null;
  refsStale: boolean;
  onRefreshed: () => void;
}

export default function ReferencesPanel({
  sessionId,
  refsStale,
  onRefreshed,
}: Props) {
  const [refs, setRefs] = useState<Reference[]>([]);
  const [uploading, setUploading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
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
    setExpanded(null);
    loadRefs();
  }, [loadRefs]);

  useEffect(() => {
    if (refsStale) {
      loadRefs().then(() => onRefreshed());
    }
  }, [refsStale, loadRefs, onRefreshed]);

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
      <div className="flex-none h-10 flex items-center justify-between px-3 border-b border-gray-900">
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
          References{refs.length > 0 && ` (${refs.length})`}
        </span>
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
      </div>

      <div className="flex-1 overflow-y-auto">
        {!sessionId && (
          <div className="px-3 py-4 text-xs text-gray-400">
            Select a session.
          </div>
        )}
        {refs.map((ref) => {
          const isOpen = expanded === ref.id;
          const plainSummary = ref.summary_md
            ? ref.summary_md
                .replace(/^#+\s*/gm, "")
                .replace(/\*+/g, "")
                .trim()
            : null;
          return (
            <div key={ref.id} className="border-b border-gray-200">
              <button
                className="w-full text-left px-3 py-3 hover:bg-gray-50 transition-colors"
                onClick={() => setExpanded(isOpen ? null : ref.id)}
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
                {plainSummary && !isOpen && (
                  <p className="text-[10px] text-gray-400 leading-relaxed line-clamp-2">
                    {plainSummary.slice(0, 150)}
                  </p>
                )}
              </button>
              {isOpen && plainSummary && (
                <div className="px-3 pb-3 border-t border-gray-100 bg-gray-50">
                  <p className="text-[10px] text-gray-600 leading-relaxed pt-2 whitespace-pre-wrap">
                    {plainSummary}
                  </p>
                </div>
              )}
            </div>
          );
        })}
        {refs.length === 0 && sessionId && (
          <div className="px-3 py-4 text-xs text-gray-400">
            No references yet.
          </div>
        )}
      </div>
    </div>
  );
}
