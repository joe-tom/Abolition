export type SessionStatus =
  | "clarifying"
  | "research"
  | "outline"
  | "writing"
  | "done";

export interface Session {
  id: string;
  topic: string;
  status: SessionStatus;
  outline: string | null;
  clarify_notes: string | null;
  created_at: string;
}

export interface Chapter {
  id: string;
  order_index: number;
  title: string;
  latex: string | null;
  status: "draft" | "reviewing" | "approved";
}

export interface Reference {
  id: string;
  cite_key: string;
  title: string | null;
  summary_md: string | null;
  source: "arxiv" | "semantic_scholar" | "tavily" | "upload";
  created_at: string;
}

export type SSEMessageType =
  | { type: "token"; content: string }
  | { type: "hitl"; data: HITLDecision | HITLQuestions }
  | { type: "preview_update"; session_id: string }
  | { type: "reference_update"; session_id: string }
  | { type: "done" }
  | { type: "error"; message: string };

export interface HITLDecision {
  type: "hitl_decision";
  critic_report: string;
  question: string;
  options: string[];
}

export interface HITLQuestions {
  type: "hitl_questions";
  questions: string[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "agent" | "critic";
  content: string;
  hitl?: HITLDecision | HITLQuestions;
}
