"use client";
import { useState, useEffect, useCallback } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Chapter } from "@/lib/types";
import { api } from "@/lib/api";

interface Props {
  sessionId: string | null;
  previewStale: boolean;
  onRefreshed: () => void;
}

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
      <div className="p-3 border-b border-gray-800 flex items-center justify-between">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          LaTeX Preview
        </h2>
        {sessionId && (
          <a
            href={api.getDownloadUrl(sessionId)}
            className="text-[10px] bg-green-800 hover:bg-green-700 px-2 py-1 rounded transition text-green-200"
          >
            Download .zip
          </a>
        )}
      </div>

      {chapters.length > 0 && (
        <div className="flex gap-1 px-2 pt-2 flex-wrap border-b border-gray-800 pb-2">
          {chapters.map((ch, i) => (
            <button
              key={ch.id}
              onClick={() => setActiveTab(i)}
              className={`text-[10px] px-2 py-1 rounded transition truncate max-w-[120px] ${
                i === activeTab
                  ? "bg-blue-700 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
              title={ch.title}
            >
              {i + 1}. {ch.title}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-xs text-gray-500 animate-pulse">
              Updating preview...
            </div>
          </div>
        )}

        {!loading && !sessionId && (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-gray-600">
              Select a session to see preview.
            </p>
          </div>
        )}

        {!loading && sessionId && chapters.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-gray-600">
              No chapters yet. Writing will appear here.
            </p>
          </div>
        )}

        {!loading && activeChapter?.latex && (
          <SyntaxHighlighter
            language="latex"
            style={vscDarkPlus}
            customStyle={{
              margin: 0,
              borderRadius: 0,
              fontSize: "11px",
              height: "100%",
            }}
            showLineNumbers
          >
            {activeChapter.latex}
          </SyntaxHighlighter>
        )}

        {!loading && activeChapter && !activeChapter.latex && (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-gray-500">
              {activeChapter.status === "draft"
                ? "Writing in progress..."
                : "No content yet."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
