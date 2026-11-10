"use client";

import dynamic from "next/dynamic";

// The script lives in localStorage and the floating window API is browser-only.
const ScriptTab = dynamic(() => import("./ScriptTab").then((m) => m.ScriptTab), { ssr: false });

export function ScriptRoom({ boardId }: { boardId: string }) {
  return <ScriptTab boardId={boardId} />;
}
