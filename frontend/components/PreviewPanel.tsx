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

const CHAPTER_STATUS: Record<string, string> = {
  draft: "bg-slate-500/15 text-slate-400",
  reviewing: "bg-amber-500/15 text-amber-400",
  approved: "bg-emerald-500/15 text-emerald-400",
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
      {/* Panel header */}
      <div className="flex-none px-4 py-3 border-b border-slate-700/60">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
            LaTeX Preview
          </p>
          {sessionId && (
            <a
              href={api.getDownloadUrl(sessionId)}
              className="flex items-center gap-1.5 text-xs bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-600/30 text-emerald-400 px-2.5 py-1.5 rounded-lg transition"
            >
              ↓ Download .zip
            </a>
          )}
        </div>

        {/* Chapter tabs */}
        {chapters.length > 0 && (
          <div className="flex gap-1 mt-3 flex-wrap">
            {chapters.map((ch, i) => (
              <button
                key={ch.id}
                onClick={() => setActiveTab(i)}
                title={ch.title}
                className={`text-[10px] px-2.5 py-1 rounded-lg font-medium transition truncate max-w-[130px] ${
                  i === activeTab
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-300 border border-slate-700"
                }`}
              >
                {i + 1}. {ch.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chapter status bar */}
      {activeChapter && (
        <div className="flex-none flex items-center gap-2 px-4 py-2 border-b border-slate-700/40 bg-slate-900/40">
          <span className="text-[10px] text-slate-500 truncate flex-1">
            {activeChapter.title}
          </span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${CHAPTER_STATUS[activeChapter.status] ?? "bg-slate-500/15 text-slate-400"}`}
          >
            {activeChapter.status}
          </span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <span className="w-6 h-6 border-2 border-slate-700 border-t-indigo-500 rounded-full animate-spin" />
            <p className="text-xs text-slate-500">Updating preview…</p>
          </div>
        )}

        {!loading && !sessionId && (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 text-lg">
              ◻
            </div>
            <p className="text-xs text-slate-500">
              Select a session to see preview.
            </p>
          </div>
        )}

        {!loading && sessionId && chapters.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 text-lg">
              ✎
            </div>
            <p className="text-xs text-slate-500">No chapters yet.</p>
            <p className="text-[10px] text-slate-600">
              Writing will appear here.
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
              lineHeight: "1.6",
              height: "100%",
              background: "transparent",
            }}
            showLineNumbers
            lineNumberStyle={{ color: "#334155", minWidth: "2.5em" }}
          >
            {activeChapter.latex}
          </SyntaxHighlighter>
        )}

        {!loading && activeChapter && !activeChapter.latex && (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <span className="w-5 h-5 border-2 border-slate-700 border-t-slate-400 rounded-full animate-spin" />
            <p className="text-xs text-slate-500">
              {activeChapter.status === "draft"
                ? "Writing in progress…"
                : "No content yet."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
