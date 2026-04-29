"use client";
import { ChatMessage } from "@/lib/types";
interface Props {
  messages: ChatMessage[];
  isStreaming: boolean;
  sessionId: string | null;
  onSendMessage: (msg: string) => void;
  onResumeHITL: (response: string) => void;
}
export default function ChatPanel(_: Props) {
  return <div className="h-full p-3 text-xs text-gray-500">Chat</div>;
}
