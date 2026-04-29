"use client";
import { Session } from "@/lib/types";
interface Props {
  sessions: Session[];
  activeSession: Session | null;
  loading: boolean;
  onCreateSession: (topic: string) => Promise<Session>;
  onSelectSession: (session: Session) => void;
}
export default function SessionPanel(_: Props) {
  return <div className="h-full p-3 text-xs text-gray-500">Sessions</div>;
}
