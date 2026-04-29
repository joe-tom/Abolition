"use client";
interface Props {
  sessionId: string | null;
}
export default function ReferencesPanel(_: Props) {
  return <div className="h-full p-3 text-xs text-gray-500">References</div>;
}
