"use client";
import { useState, useCallback, useRef } from "react";
import { SSEMessageType, ChatMessage } from "@/lib/types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

let msgCounter = 0;

export const useSSE = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [previewStale, setPreviewStale] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const currentAgentMsgId = useRef<string | null>(null);

  const appendToken = useCallback((token: string) => {
    setMessages((prev) => {
      if (!currentAgentMsgId.current) return prev;
      return prev.map((m) =>
        m.id === currentAgentMsgId.current
          ? { ...m, content: m.content + token }
          : m,
      );
    });
  }, []);

  const processStream = useCallback(
    async (response: Response) => {
      if (!response.body) return;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const agentMsgId = `agent-${++msgCounter}`;
      currentAgentMsgId.current = agentMsgId;
      setMessages((prev) => [
        ...prev,
        { id: agentMsgId, role: "agent", content: "" },
      ]);
      setIsStreaming(true);

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6);
            let parsed: SSEMessageType;
            try {
              parsed = JSON.parse(raw);
            } catch {
              continue;
            }

            if (parsed.type === "token") {
              appendToken(parsed.content);
            } else if (parsed.type === "hitl") {
              currentAgentMsgId.current = null;
              const hitlId = `hitl-${++msgCounter}`;
              setMessages((prev) => [
                ...prev,
                {
                  id: hitlId,
                  role: "critic",
                  content: "",
                  hitl: parsed.data as any,
                },
              ]);
            } else if (parsed.type === "preview_update") {
              setPreviewStale(true);
            } else if (parsed.type === "done") {
              currentAgentMsgId.current = null;
            } else if (parsed.type === "error") {
              setMessages((prev) => [
                ...prev,
                {
                  id: `err-${++msgCounter}`,
                  role: "agent",
                  content: `Error: ${parsed.message}`,
                },
              ]);
            }
          }
        }
      } finally {
        setIsStreaming(false);
        currentAgentMsgId.current = null;
      }
    },
    [appendToken],
  );

  const sendMessage = useCallback(
    async (message: string) => {
      if (!sessionId || isStreaming) return;
      setMessages((prev) => [
        ...prev,
        { id: `user-${++msgCounter}`, role: "user", content: message },
      ]);
      const res = await fetch(`${BASE}/api/sessions/${sessionId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      await processStream(res);
    },
    [sessionId, isStreaming, processStream],
  );

  const resumeHITL = useCallback(
    async (response: string) => {
      if (!sessionId || isStreaming) return;
      const res = await fetch(`${BASE}/api/sessions/${sessionId}/resume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response }),
      });
      await processStream(res);
    },
    [sessionId, isStreaming, processStream],
  );

  const clearPreviewStale = useCallback(() => setPreviewStale(false), []);

  return {
    messages,
    isStreaming,
    previewStale,
    sendMessage,
    resumeHITL,
    clearPreviewStale,
    setMessages,
    setSessionId,
  };
};
