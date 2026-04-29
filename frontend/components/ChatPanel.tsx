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
    <div className="mt-2 bg-gray-800 border border-yellow-700 rounded p-3 text-xs">
      <p className="text-yellow-400 font-bold mb-1">Critic Report</p>
      <pre className="whitespace-pre-wrap text-gray-300 mb-3 text-[10px] leading-relaxed">
        {data.critic_report}
      </pre>
      <p className="text-gray-300 mb-2">{data.question}</p>
      <div className="flex gap-2">
        {data.options.map((opt) => (
          <button
            key={opt}
            onClick={() => onResume(opt)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition ${
              opt === "rewrite"
                ? "bg-yellow-600 hover:bg-yellow-500 text-white"
                : "bg-gray-600 hover:bg-gray-500 text-gray-200"
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
    <div className="mt-2 bg-gray-800 border border-blue-700 rounded p-3 text-xs">
      <p className="text-blue-400 font-bold mb-2">Author Questions</p>
      {data.questions.map((q, i) => (
        <div key={i} className="mb-3">
          <p className="text-gray-300 mb-1">{`Q${i + 1}. ${q}`}</p>
          <textarea
            className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-xs resize-none h-14 focus:outline-none focus:border-blue-500"
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
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white py-1.5 rounded transition"
      >
        Submit Answers
      </button>
    </div>
  );
}

function MessageBubble({
  msg,
  onResume,
}: {
  msg: ChatMessage;
  onResume: (r: string) => void;
}) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[90%] rounded-lg px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
          isUser ? "bg-blue-700 text-white" : "bg-gray-800 text-gray-200"
        }`}
      >
        {msg.content}
        {msg.hitl && (msg.hitl as HITLDecision).options && (
          <HITLDecisionBlock
            data={msg.hitl as HITLDecision}
            onResume={onResume}
          />
        )}
        {msg.hitl &&
          (msg.hitl as HITLQuestions).questions &&
          !(msg.hitl as HITLDecision).options && (
            <HITLQuestionsBlock
              data={msg.hitl as HITLQuestions}
              onResume={onResume}
            />
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
      <div className="p-3 border-b border-gray-800">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          Chat
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {!sessionId && (
          <p className="text-xs text-gray-600">
            Create or select a session to start.
          </p>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} onResume={onResumeHITL} />
        ))}
        {isStreaming && (
          <div className="flex justify-start mb-3">
            <div className="bg-gray-800 rounded-lg px-3 py-2">
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-gray-800">
        <div className="flex gap-2">
          <textarea
            className="flex-1 bg-gray-900 border border-gray-700 rounded p-2 text-xs resize-none h-16 focus:outline-none focus:border-blue-500"
            placeholder={
              sessionId ? "Type a message..." : "Select a session first"
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
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs px-3 rounded transition"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
