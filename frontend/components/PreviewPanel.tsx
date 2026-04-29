"use client";
import { useState, useEffect, useCallback } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Chapter } from "@/lib/types";
import { api } from "@/lib/api";

interface Props {
  sessionId: string | null;
  previewStale: boolean;
  onRefreshed: () => void;
}

const CHAPTER_STATUS: Record<string, string> = {
  draft: "DRAFT",
  reviewing: "REVIEWING",
  approved: "APPROVED",
};

export default function PreviewPanel({
  sessionId,
  previewStale,
  onRefreshed,
}: Props) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadChapters = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const data = await api.getChapters(sessionId);
      setChapters(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    setChapters([]);
    setActiveTab(0);
    loadChapters();
  }, [loadChapters]);

  useEffect(() => {
    if (previewStale) {
      loadChapters().then(onRefreshed);
    }
  }, [previewStale, loadChapters, onRefreshed]);

  const activeChapter = chapters[activeTab];

  return (
    <div className="flex flex-col h-full">
      <div className="flex-none h-10 flex items-center justify-between px-3 border-b border-gray-900">
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
          LaTeX Preview
        </span>
        {sessionId && (
          <a
            href={api.getDownloadUrl(sessionId)}
            className="text-[10px] font-bold uppercase tracking-wide border border-gray-400 px-2 py-1 hover:bg-gray-100 transition-colors"
          >
            Download .zip
          </a>
        )}
      </div>

      {chapters.length > 0 && (
        <div className="flex-none flex border-b border-gray-900 overflow-x-auto">
          {chapters.map((ch, i) => (
            <button
              key={ch.id}
              onClick={() => setActiveTab(i)}
              title={ch.title}
              className={`flex-none text-[10px] font-bold uppercase tracking-wide px-3 py-2 border-r border-gray-300 transition-colors whitespace-nowrap ${
                i === activeTab
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-500 hover:bg-gray-100"
              }`}
            >
              {i + 1}. {ch.title}
            </button>
          ))}
        </div>
      )}

      {activeChapter && (
        <div className="flex-none flex items-center justify-between px-3 py-1.5 border-b border-gray-300 bg-gray-50">
          <span className="text-[10px] text-gray-500 truncate">
            {activeChapter.title}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500 ml-4 flex-none">
            {CHAPTER_STATUS[activeChapter.status] ?? activeChapter.status}
          </span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="px-3 py-4 text-xs text-gray-400">Loading...</div>
        )}

        {!loading && !sessionId && (
          <div className="px-3 py-4 text-xs text-gray-400">
            Select a session to see preview.
          </div>
        )}

        {!loading && sessionId && chapters.length === 0 && (
          <div className="px-3 py-4 text-xs text-gray-400">
            No chapters yet. Writing will appear here.
          </div>
        )}

        {!loading && activeChapter?.latex && (
          <SyntaxHighlighter
            language="latex"
            style={oneLight}
            customStyle={{
              margin: 0,
              borderRadius: 0,
              fontSize: "11px",
              lineHeight: "1.6",
              height: "100%",
              background: "transparent",
            }}
            showLineNumbers
            lineNumberStyle={{ color: "#d1d5db", minWidth: "2.5em" }}
          >
            {activeChapter.latex}
          </SyntaxHighlighter>
        )}

        {!loading && activeChapter && !activeChapter.latex && (
          <div className="px-3 py-4 text-xs text-gray-400">
            {activeChapter.status === "draft"
              ? "Writing in progress..."
              : "No content yet."}
          </div>
        )}
      </div>
    </div>
  );
}
