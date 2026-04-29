"use client";
interface Props {
  sessionId: string | null;
  previewStale: boolean;
  onRefreshed: () => void;
}
export default function PreviewPanel(_: Props) {
  return <div className="h-full p-3 text-xs text-gray-500">Preview</div>;
}
