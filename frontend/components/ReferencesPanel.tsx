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
        {refs.map((ref) => (
          <div
            key={ref.id}
            className="px-3 py-3 border-b border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold border border-gray-400 px-1 text-gray-600 uppercase">
                {SOURCE_LABEL[ref.source] ?? ref.source}
              </span>
              <code className="text-gray-700 text-[10px] truncate">
                {ref.cite_key}
              </code>
            </div>
            {ref.summary_md && (
              <p className="text-gray-400 text-[10px] leading-relaxed line-clamp-2">
                {ref.summary_md.replace(/^#+\s*/gm, "").slice(0, 120)}
              </p>
            )}
          </div>
        ))}
        {refs.length === 0 && sessionId && (
          <div className="px-3 py-4 text-xs text-gray-400">
            No references yet.
          </div>
        )}
      </div>
    </div>
  );
}
