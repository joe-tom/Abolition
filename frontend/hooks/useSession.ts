"use client";
import { useState, useEffect, useCallback } from "react";
import { Session, ChatMessage } from "@/lib/types";
import { api } from "@/lib/api";

interface UseSessionOptions {
  onMessages?: (msgs: ChatMessage[]) => void;
  onSessionId?: (id: string | null) => void;
}

export const useSession = (options: UseSessionOptions = {}) => {
  const { onMessages, onSessionId } = options;
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);

  const loadSessions = useCallback(async () => {
    try {
      const data = await api.listSessions();
      setSessions(data);
    } catch (e) {
      console.error("Failed to load sessions", e);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const createSession = useCallback(
    async (topic: string) => {
      setLoading(true);
      try {
        const session = await api.createSession(topic);
        setSessions((prev) => [session, ...prev]);
        setActiveSession(session);
        onSessionId?.(session.id);
        onMessages?.([]);
        return session;
      } finally {
        setLoading(false);
      }
    },
    [onMessages, onSessionId],
  );

  const selectSession = useCallback(
    async (session: Session) => {
      const fresh = await api.getSession(session.id);
      setActiveSession(fresh);
      onSessionId?.(fresh.id);
      if (onMessages) {
        try {
          const msgs = await api.getMessages(session.id);
          let counter = 0;
          const chatMsgs: ChatMessage[] = msgs.map(
            (m: { id: string; role: string; content: string }) => ({
              id: `db-${counter++}-${m.id}`,
              role: m.role === "user" ? "user" : ("agent" as const),
              content: m.content,
            }),
          );
          onMessages(chatMsgs);
        } catch (e) {
          console.error("Failed to load messages", e);
        }
      }
    },
    [onMessages, onSessionId],
  );

  const deleteSession = useCallback(
    async (sessionId: string) => {
      await api.deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      setActiveSession((prev) => {
        if (prev?.id === sessionId) {
          onSessionId?.(null);
          onMessages?.([]);
          return null;
        }
        return prev;
      });
    },
    [onMessages, onSessionId],
  );

  return {
    sessions,
    activeSession,
    loading,
    createSession,
    selectSession,
    deleteSession,
    loadSessions,
  };
};
