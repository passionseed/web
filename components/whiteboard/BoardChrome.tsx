"use client";

import { CloudOff, Eye, Loader2, TriangleAlert } from "lucide-react";
import { memo, useState } from "react";
import { toast } from "sonner";

import type { SaveState } from "./useWhiteboardSync";

/** Board name in the top-left card; the owner clicks it to rename. */
export const BoardTitle = memo(function BoardTitle({
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
        aria-label="ชื่อบอร์ด · Board name"
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
        className="wb-title wb-title--editing"
      />
    );
  }
  if (!canRename) {
    return (
      <span className="wb-title" title={title}>
        {title}
      </span>
    );
  }
  return (
    <button
      type="button"
      aria-label={`${title}: เปลี่ยนชื่อ · Rename`}
      data-tip="เปลี่ยนชื่อ · Rename"
      data-tip-side="bottom"
      onClick={() => {
        setDraft(title);
        setEditing(true);
      }}
      className="wb-title wb-title--button"
    >
      {title}
    </button>
  );
});

/** Lucide's cloud with a check inside (this lucide version has no CloudCheck). */
function CloudCheck({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
      <path d="m9.5 13.5 2 2 3.5-3.5" />
    </svg>
  );
}

const SAVE_STATUS: Record<"saved" | "saving" | "offline" | "connecting" | "error", { label: string; icon: React.ReactNode }> = {
  saved: { label: "บันทึกแล้ว · Saved", icon: <CloudCheck className="h-4 w-4 text-emerald-600" /> },
  saving: { label: "กำลังบันทึก · Saving", icon: <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> },
  offline: {
    label: "ออฟไลน์ บันทึกให้เมื่อกลับมาออนไลน์ · Offline, saves when you are back",
    icon: <CloudOff className="h-4 w-4 text-amber-600" />,
  },
  connecting: { label: "กำลังเชื่อมต่อ · Connecting", icon: <CloudOff className="h-4 w-4 text-amber-600" /> },
  error: { label: "บันทึกไม่ได้ กำลังลองใหม่ · Retrying", icon: <TriangleAlert className="h-4 w-4 text-red-500" /> },
};

/** A small save-state icon with a tooltip; viewers see a "view only" chip instead. */
export const SaveStatus = memo(function SaveStatus({
  state,
  connected,
  readOnly,
}: {
  state: SaveState;
  connected: boolean;
  readOnly: boolean;
}) {
  if (readOnly) {
    return (
      <span className="wb-chip" data-tip="ดูได้อย่างเดียว แก้ไขไม่ได้ · View only" data-tip-side="bottom" tabIndex={0}>
        <Eye className="h-3.5 w-3.5" aria-hidden /> ดูอย่างเดียว
      </span>
    );
  }
  const key =
    state === "offline"
      ? "offline"
      : !connected
        ? "connecting"
        : state === "error"
          ? "error"
          : state === "saving" || state === "unsaved"
            ? "saving"
            : "saved";
  const { label, icon } = SAVE_STATUS[key];
  return (
    <span className="wb-status" role="status" aria-label={label} data-tip={label} data-tip-side="bottom" tabIndex={0}>
      {icon}
    </span>
  );
});
