"use client";
import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
    <div className="mt-2 border border-gray-900 bg-gray-50">
      <div className="px-3 py-2 border-b border-gray-900 bg-gray-900">
        <span className="text-[10px] font-bold text-white uppercase tracking-wide">
          Critic Report
        </span>
      </div>
      <pre className="whitespace-pre-wrap text-gray-700 text-[11px] leading-relaxed p-3 font-mono border-b border-gray-300">
        {data.critic_report}
      </pre>
      <div className="p-3">
        <p className="text-xs text-gray-700 mb-3">{data.question}</p>
        <div className="flex gap-2">
          {data.options.map((opt) => (
            <button
              key={opt}
              onClick={() => onResume(opt)}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wide border transition-colors ${
                opt === "rewrite"
                  ? "bg-gray-900 text-white border-gray-900 hover:bg-gray-700"
                  : "bg-white text-gray-700 border-gray-400 hover:bg-gray-100"
              }`}
            >
              {opt === "rewrite" ? "Rewrite" : "Continue"}
            </button>
          ))}
        </div>
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
    <div className="mt-2 border border-gray-900">
      <div className="px-3 py-2 border-b border-gray-900 bg-gray-900">
        <span className="text-[10px] font-bold text-white uppercase tracking-wide">
          Questions
        </span>
      </div>
      <div className="p-3">
        {data.questions.map((q, i) => (
          <div key={i} className="mb-3">
            <p className="text-xs text-gray-700 mb-1">
              <span className="font-bold">Q{i + 1}.</span> {q}
            </p>
            <textarea
              className="w-full bg-white border border-gray-400 p-2 text-xs text-gray-900 placeholder:text-gray-400 resize-none h-14 focus:outline-none focus:border-gray-900 transition-colors"
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
          className="w-full bg-gray-900 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-bold py-2 uppercase tracking-wide transition-colors"
        >
          Submit
        </button>
      </div>
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
    <div className={`mb-4 ${isUser ? "pl-8" : "pr-8"}`}>
      <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">
        {isUser ? "You" : msg.role === "critic" ? "Critic" : "Agent"}
      </div>
      <div
        className={`border text-xs leading-relaxed p-3 ${
          isUser
            ? "bg-gray-200 text-gray-900 border-gray-300"
            : "bg-white text-gray-800 border-gray-300"
        }`}
      >
        {isUser ? (
          <span className="whitespace-pre-wrap">{msg.content}</span>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              h1: ({ children }) => (
                <p className="font-bold text-sm mb-1">{children}</p>
              ),
              h2: ({ children }) => (
                <p className="font-bold mb-1">{children}</p>
              ),
              h3: ({ children }) => (
                <p className="font-bold mb-1">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal pl-4 mb-2 space-y-0.5">
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li className="leading-relaxed">{children}</li>
              ),
              strong: ({ children }) => (
                <strong className="font-bold">{children}</strong>
              ),
              em: ({ children }) => <em>{children}</em>,
              code: ({ children }) => (
                <code className="bg-gray-100 border border-gray-300 px-1 text-[10px] font-mono">
                  {children}
                </code>
              ),
              hr: () => <hr className="border-gray-300 my-2" />,
            }}
          >
            {msg.content}
          </ReactMarkdown>
        )}
      </div>
      {msg.hitl?.type === "hitl_decision" && (
        <HITLDecisionBlock
          data={msg.hitl as HITLDecision}
          onResume={onResume}
        />
      )}
      {msg.hitl?.type === "hitl_questions" && (
        <HITLQuestionsBlock
          data={msg.hitl as HITLQuestions}
          onResume={onResume}
        />
      )}
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
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!isStreaming) inputRef.current?.focus();
  }, [isStreaming]);

  const handleSend = () => {
    if (!input.trim() || isStreaming || !sessionId) return;
    onSendMessage(input.trim());
    setInput("");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-none h-10 flex items-center justify-between px-3 border-b border-gray-900">
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
          Chat
        </span>
        {isStreaming && (
          <span className="text-[10px] text-gray-400 uppercase tracking-wide">
            Thinking...
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        {!sessionId && (
          <div className="text-xs text-gray-400">
            Select a session to start.
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} onResume={onResumeHITL} />
        ))}
        {isStreaming && (
          <div className="pr-8 mb-4">
            <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">
              Agent
            </div>
            <div className="border border-gray-300 bg-white p-3">
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 bg-gray-400 animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-gray-400 animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-gray-400 animate-bounce [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex-none px-3 py-3 border-t border-gray-900 bg-gray-50">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            autoFocus
            className="flex-1 bg-white border border-gray-400 p-2 text-xs text-gray-900 placeholder:text-gray-400 resize-none h-[72px] focus:outline-none focus:border-gray-900 transition-colors"
            placeholder={
              sessionId
                ? "Type a message... (Enter to send)"
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
            className="flex-none bg-gray-900 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-bold px-4 h-10 uppercase tracking-wide transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
