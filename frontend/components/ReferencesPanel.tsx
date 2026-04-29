"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Reference } from "@/lib/types";
import { api } from "@/lib/api";

const SOURCE_BADGE: Record<string, string> = {
  arxiv: "bg-red-900 text-red-200",
  semantic_scholar: "bg-blue-900 text-blue-200",
  tavily: "bg-green-900 text-green-200",
  upload: "bg-purple-900 text-purple-200",
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
      <div className="p-3 border-b border-gray-800 flex items-center justify-between">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          References
        </h2>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={!sessionId || uploading}
          className="text-[10px] bg-gray-700 hover:bg-gray-600 disabled:opacity-40 px-2 py-1 rounded transition"
        >
          {uploading ? "Uploading..." : "+ Upload"}
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

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {!sessionId && (
          <p className="text-xs text-gray-600 p-1">
            Select a session to see references.
          </p>
        )}
        {refs.map((ref) => (
          <div key={ref.id} className="bg-gray-900 rounded p-2 text-xs">
            <div className="flex items-center gap-1 mb-1">
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded ${SOURCE_BADGE[ref.source] ?? "bg-gray-700"}`}
              >
                {ref.source}
              </span>
              <code className="text-gray-300 truncate">{ref.cite_key}</code>
            </div>
            {ref.summary_md && (
              <p className="text-gray-500 line-clamp-2 text-[10px] leading-relaxed">
                {ref.summary_md.replace(/^#+\s*/gm, "").slice(0, 120)}...
              </p>
            )}
          </div>
        ))}
        {refs.length === 0 && sessionId && (
          <p className="text-xs text-gray-600 p-1">
            No references yet. Agent will collect them during research.
          </p>
        )}
      </div>
    </div>
  );
}
