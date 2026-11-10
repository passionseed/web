"use client";

import { sceneCoordsToViewportCoords, viewportCoordsToSceneCoords } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { formatDistanceToNow } from "date-fns";
import { Check, RotateCcw, Send, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Avatar } from "./ShareDialog";
import type { CommentsApi, Thread } from "./useComments";
import { useViewportTick } from "./useViewportTick";

export { useViewportTick };

type Props = {
  api: ExcalidrawImperativeAPI;
  comments: CommentsApi;
  meId: string;
  canModerate: boolean;
  isOwner: boolean;
  placing: boolean;
  onPlaced: () => void;
  openId: string | null;
  onOpen: (id: string | null) => void;
  showResolved: boolean;
};

/** Comment pins on the canvas, the new-comment composer and the open thread. */
export function CommentsLayer(props: Props) {
  const { api, comments, placing, openId, onOpen, showResolved } = props;
  useViewportTick(api);
  const [draft, setDraft] = useState<{ x: number; y: number } | null>(null);
  const appState = api.getAppState();
  const toScreen = (x: number, y: number) => sceneCoordsToViewportCoords({ sceneX: x, sceneY: y }, appState);

  // The listener lives for the whole mount and reads the latest props from a ref.
  const latest = useRef({ placing, onOpen, onPlaced: props.onPlaced });
  useEffect(() => {
    latest.current = { placing, onOpen, onPlaced: props.onPlaced };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const { placing: isPlacing, onOpen: open, onPlaced } = latest.current;
      setDraft(null);
      open(null);
      if (isPlacing) onPlaced();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const visible = comments.threads.filter((t) => showResolved || !t.resolvedAt || t.id === openId);
  const open = comments.threads.find((t) => t.id === openId) ?? null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[3] overflow-hidden">
      {placing && (
        <div
          className="pointer-events-auto absolute inset-0 cursor-crosshair"
          onClick={(e) => {
            const { x, y } = viewportCoordsToSceneCoords({ clientX: e.clientX, clientY: e.clientY }, api.getAppState());
            setDraft({ x, y });
            props.onPlaced();
          }}
        />
      )}

      {visible.map((thread, i) => {
        const pos = toScreen(thread.x ?? 0, thread.y ?? 0);
        return (
          <button
            key={thread.id}
            type="button"
            onClick={() => onOpen(openId === thread.id ? null : thread.id)}
            className={`wb-pin pointer-events-auto absolute flex -translate-y-full items-center gap-1 rounded-full rounded-bl-none p-0.5 pr-2 ${
              thread.resolvedAt ? "wb-pin--resolved" : ""
            }`}
            style={{ left: pos.x, top: pos.y }}
            aria-label={`คอมเมนต์ของ ${thread.authorName} · Comment`}
          >
            <Avatar name={thread.authorName} url={thread.authorAvatar} size={24} />
            <span className="text-xs font-medium">{i + 1}</span>
          </button>
        );
      })}

      {draft && (
        <Composer
          at={toScreen(draft.x, draft.y)}
          placeholder="เขียนคอมเมนต์ · Add a comment"
          onCancel={() => setDraft(null)}
          onSubmit={async (body) => {
            const created = await comments.addThread(draft.x, draft.y, body);
            setDraft(null);
            if (created?.id) onOpen(created.id);
          }}
        />
      )}

      {open && open.x !== null && open.y !== null && (
        <ThreadCard
          thread={open}
          at={toScreen(open.x, open.y)}
          {...props}
          onClose={() => onOpen(null)}
        />
      )}
    </div>
  );
}

function Panel({ at, children }: { at: { x: number; y: number }; children: React.ReactNode }) {
  const left = Math.min(at.x + 16, (typeof window !== "undefined" ? window.innerWidth : 1200) - 340);
  const top = Math.min(Math.max(at.y - 24, 70), (typeof window !== "undefined" ? window.innerHeight : 800) - 380);
  return (
    <div
      className="wb-thread pointer-events-auto absolute w-80"
      style={{ left, top }}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

function Composer({
  at,
  placeholder,
  onSubmit,
  onCancel,
  compact,
}: {
  at?: { x: number; y: number };
  placeholder: string;
  onSubmit: (body: string) => Promise<void>;
  onCancel?: () => void;
  compact?: boolean;
}) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!body.trim() || busy) return;
    setBusy(true);
    await onSubmit(body.trim());
    setBody("");
    setBusy(false);
  };
  const form = (
    <div className="flex items-end gap-2 p-3">
      <textarea
        autoFocus={!compact}
        value={body}
        rows={compact ? 1 : 2}
        maxLength={2000}
        placeholder={placeholder}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void submit();
          }
          if (e.key === "Escape") onCancel?.();
        }}
        className="wb-input min-h-9 flex-1 resize-none px-3 py-2 text-sm"
      />
      <button
        type="button"
        onClick={() => void submit()}
        disabled={!body.trim() || busy}
        aria-label="ส่ง · Send"
        title="ส่ง · Send"
        className="wb-btn wb-btn--solid inline-flex h-9 w-9 shrink-0 items-center justify-center disabled:opacity-40"
      >
        <Send className="h-4 w-4" />
      </button>
    </div>
  );
  return at ? <Panel at={at}>{form}</Panel> : form;
}

function ThreadCard({
  thread,
  at,
  comments,
  meId,
  canModerate,
  isOwner,
  onClose,
}: Props & { thread: Thread; at: { x: number; y: number }; onClose: () => void }) {
  const canResolve = canModerate || thread.authorId === meId;
  return (
    <Panel at={at}>
      <div className="wb-thread__head flex items-center justify-between px-3 py-2">
        <span className="wb-label">{thread.resolvedAt ? "ปิดแล้ว · Resolved" : "คอมเมนต์ · Comment"}</span>
        <div className="flex items-center gap-1">
          {canResolve && (
            <button
              type="button"
              title={thread.resolvedAt ? "เปิดอีกครั้ง · Reopen" : "ปิดคอมเมนต์ · Resolve"}
              aria-label={thread.resolvedAt ? "เปิดอีกครั้ง · Reopen" : "ปิดคอมเมนต์ · Resolve"}
              onClick={() => void comments.resolve(thread.id, !thread.resolvedAt)}
              className="wb-thread__btn"
            >
              {thread.resolvedAt ? <RotateCcw className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            </button>
          )}
          <button type="button" onClick={onClose} aria-label="ปิด · Close" title="ปิด · Close" className="wb-thread__btn">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <ul className="max-h-64 space-y-3 overflow-y-auto px-3 py-3">
        {[thread, ...thread.replies].map((c) => (
          <li key={c.id} className="group flex gap-2">
            <Avatar name={c.authorName} url={c.authorAvatar} size={26} />
            <div className="min-w-0 flex-1">
              <p className="text-xs">
                <span className="font-semibold">{c.authorName}</span>{" "}
                <span className="wb-soft">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</span>
              </p>
              <p className="whitespace-pre-wrap break-words text-sm">{c.body}</p>
            </div>
            {(isOwner || c.authorId === meId) && (
              <button
                type="button"
                aria-label="ลบคอมเมนต์ · Delete comment"
                title="ลบคอมเมนต์ · Delete comment"
                onClick={() => {
                  if (c.id === thread.id) onClose();
                  void comments.remove(c.id);
                }}
                // Hidden until hover or focus; on touch it always shows, dimmed (.wb-thread__delete).
                className="wb-thread__delete self-start"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </li>
        ))}
      </ul>
      <div className="wb-thread__foot">
        <Composer compact placeholder="ตอบกลับ · Reply" onSubmit={async (body) => void (await comments.reply(thread.id, body))} />
      </div>
    </Panel>
  );
}
