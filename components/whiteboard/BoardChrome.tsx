"use client";

import { Cloud, CloudOff, Eye, Loader2, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import type { SaveState } from "./useWhiteboardSync";

const pill = "wb-pill";

/** Board name in the top bar; the owner clicks it to rename. */
export function BoardTitle({
  boardId,
  title,
  canRename,
  onRenamed,
}: {
  boardId: string;
  title: string;
  canRename: boolean;
  onRenamed: (title: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);

  const commit = async () => {
    setEditing(false);
    const next = draft.trim();
    if (!next || next === title) return setDraft(title);
    onRenamed(next);
    const res = await fetch(`/api/whiteboards/${boardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: next }),
    });
    if (!res.ok) {
      onRenamed(title);
      setDraft(title);
      toast.error("เปลี่ยนชื่อไม่สำเร็จ · Could not rename");
    }
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        maxLength={120}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setDraft(title);
            setEditing(false);
          }
          e.stopPropagation();
        }}
        className={`${pill} wb-pill--title w-56 outline-none focus:border-orange-400/60`}
      />
    );
  }
  return (
    <button
      type="button"
      disabled={!canRename}
      title={canRename ? "Rename" : undefined}
      onClick={() => {
        setDraft(title);
        setEditing(true);
      }}
      className={`${pill} wb-pill--title truncate`}
    >
      <span className="truncate">{title}</span>
    </button>
  );
}

export function SaveBadge({ state, connected, readOnly }: { state: SaveState; connected: boolean; readOnly: boolean }) {
  if (readOnly) {
    return (
      <span className={pill}>
        <Eye className="h-3.5 w-3.5" /> ดูอย่างเดียว
      </span>
    );
  }
  if (state === "offline" || !connected) {
    return (
      <span className={pill} title="Changes save when you are back online">
        <CloudOff className="h-3.5 w-3.5 text-amber-500" /> {state === "offline" ? "Offline" : "Connecting"}
      </span>
    );
  }
  if (state === "error") {
    return (
      <span className={pill} title="Retrying">
        <TriangleAlert className="h-3.5 w-3.5 text-red-500" /> Retrying
      </span>
    );
  }
  if (state === "saving" || state === "unsaved") {
    return (
      <span className={pill}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving
      </span>
    );
  }
  return (
    <span className={pill}>
      <Cloud className="h-3.5 w-3.5 text-emerald-500" /> Saved
    </span>
  );
}
