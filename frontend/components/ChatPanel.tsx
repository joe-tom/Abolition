"use client";
import { useState, useRef, useEffect } from "react";
import { ChatMessage, HITLDecision, HITLQuestions } from "@/lib/types";

interface Props {
  messages: ChatMessage[];
  isStreaming: boolean;
  sessionId: string | null;
  onSendMessage: (msg: string) => void;
  onResumeHITL: (response: string) => void;
}

function HITLDecisionBlock({
  data,
  onResume,
}: {
  data: HITLDecision;
  onResume: (r: string) => void;
}) {
  return (
    <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-amber-400 text-sm">⚠</span>
        <p className="text-amber-400 text-xs font-semibold">Critic Report</p>
      </div>
      <pre className="whitespace-pre-wrap text-slate-300 text-[11px] leading-relaxed mb-3 bg-slate-900/50 rounded-lg p-3 font-sans">
        {data.critic_report}
      </pre>
      <p className="text-slate-300 text-xs mb-3">{data.question}</p>
      <div className="flex gap-2">
        {data.options.map((opt) => (
          <button
            key={opt}
            onClick={() => onResume(opt)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition shadow-sm ${
              opt === "rewrite"
                ? "bg-amber-500 hover:bg-amber-400 text-white"
                : "bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600"
            }`}
          >
            {opt === "rewrite" ? "Rewrite" : "Continue as-is"}
          </button>
        ))}
      </div>
    </div>
  );
}

function HITLQuestionsBlock({
  data,
  onResume,
}: {
  data: HITLQuestions;
  onResume: (r: string) => void;
}) {
  const [answers, setAnswers] = useState<string[]>(
    data.questions.map(() => ""),
  );

  const handleSubmit = () => {
    const md = data.questions
      .map((q, i) => `**Q${i + 1}: ${q}**\nA: ${answers[i]}`)
      .join("\n\n");
    onResume(md);
  };

  return (
    <div className="mt-3 rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-indigo-400 text-sm">?</span>
        <p className="text-indigo-400 text-xs font-semibold">
          Author Questions
        </p>
      </div>
      {data.questions.map((q, i) => (
        <div key={i} className="mb-3">
          <p className="text-slate-300 text-xs mb-1.5">
            <span className="text-indigo-400 font-medium">Q{i + 1}.</span> {q}
          </p>
          <textarea
            className="w-full bg-slate-900/60 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 placeholder:text-slate-600 resize-none h-14 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition"
            placeholder="Your answer..."
            value={answers[i]}
            onChange={(e) => {
              const next = [...answers];
              next[i] = e.target.value;
              setAnswers(next);
            }}
          />
        </div>
      ))}
      <button
        onClick={handleSubmit}
        disabled={answers.some((a) => !a.trim())}
        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium py-2 rounded-lg transition"
      >
        Submit Answers
      </button>
    </div>
  );
}

const ROLE_AVATAR: Record<string, { label: string; style: string }> = {
  user: { label: "U", style: "bg-indigo-600 text-white" },
  agent: { label: "A", style: "bg-slate-700 text-slate-300" },
  critic: { label: "C", style: "bg-amber-600 text-white" },
};

function MessageBubble({
  msg,
  onResume,
}: {
  msg: ChatMessage;
  onResume: (r: string) => void;
}) {
  const isUser = msg.role === "user";
  const avatar = ROLE_AVATAR[msg.role] ?? ROLE_AVATAR.agent;

  return (
    <div
      className={`flex gap-2.5 mb-4 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      <div
        className={`flex-none w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 ${avatar.style}`}
      >
        {avatar.label}
      </div>
      <div
        className={`max-w-[85%] ${isUser ? "items-end" : "items-start"} flex flex-col`}
      >
        <div
          className={`rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
            isUser
              ? "bg-indigo-600 text-white rounded-tr-sm"
              : "bg-slate-800 text-slate-200 border border-slate-700/50 rounded-tl-sm"
          }`}
        >
          {msg.content}
        </div>
        {msg.hitl?.type === "hitl_decision" && (
          <div className="w-full">
            <HITLDecisionBlock
              data={msg.hitl as HITLDecision}
              onResume={onResume}
            />
          </div>
        )}
        {msg.hitl?.type === "hitl_questions" && (
          <div className="w-full">
            <HITLQuestionsBlock
              data={msg.hitl as HITLQuestions}
              onResume={onResume}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatPanel({
  messages,
  isStreaming,
  sessionId,
  onSendMessage,
  onResumeHITL,
}: Props) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isStreaming || !sessionId) return;
    onSendMessage(input.trim());
    setInput("");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="flex-none px-4 py-3 border-b border-slate-700/60">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
            Chat
          </p>
          {isStreaming && (
            <span className="flex items-center gap-1.5 text-[10px] text-indigo-400">
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
              Agent thinking…
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {!sessionId && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2">
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 text-lg">
              ✎
            </div>
            <p className="text-xs text-slate-500">
              Create or select a session to start.
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} onResume={onResumeHITL} />
        ))}
        {isStreaming && (
          <div className="flex gap-2.5 mb-4">
            <div className="flex-none w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-300 mt-0.5">
              A
            </div>
            <div className="bg-slate-800 border border-slate-700/50 rounded-2xl rounded-tl-sm px-4 py-3">
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-none px-4 py-3 border-t border-slate-700/60 bg-slate-900/50">
        <div className="flex gap-2 items-end">
          <textarea
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 placeholder:text-slate-500 resize-none h-[72px] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition"
            placeholder={
              sessionId
                ? "Type a message… (Enter to send)"
                : "Select a session first"
            }
            value={input}
            disabled={!sessionId || isStreaming}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            onClick={handleSend}
            disabled={!sessionId || isStreaming || !input.trim()}
            className="flex-none bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium px-4 py-2.5 rounded-xl transition h-10 flex items-center"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
