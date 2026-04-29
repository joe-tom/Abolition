"use client";
import { useState, useEffect, useCallback } from "react";
import { Session } from "@/lib/types";
import { api } from "@/lib/api";

export const useSession = () => {
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

  const createSession = useCallback(async (topic: string) => {
    setLoading(true);
    try {
      const session = await api.createSession(topic);
      setSessions((prev) => [session, ...prev]);
      setActiveSession(session);
      return session;
    } finally {
      setLoading(false);
    }
  }, []);

  const selectSession = useCallback(async (session: Session) => {
    const fresh = await api.getSession(session.id);
    setActiveSession(fresh);
  }, []);

  return {
    sessions,
    activeSession,
    loading,
    createSession,
    selectSession,
    loadSessions,
  };
};
