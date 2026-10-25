"use client";

import { sceneCoordsToViewportCoords, viewportCoordsToSceneCoords } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { formatDistanceToNow } from "date-fns";
import { Check, RotateCcw, Send, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Avatar } from "./ShareDialog";
import type { CommentsApi, Thread } from "./useComments";

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

/** Hook that re-renders whenever the canvas scrolls or zooms. */
export function useViewportTick(api: ExcalidrawImperativeAPI) {
  const [, setTick] = useState(0);
  useEffect(() => api.onScrollChange(() => setTick((t) => t + 1)), [api]);
  useEffect(() => api.onChange(() => setTick((t) => t + 1)), [api]);
}

/** Comment pins on the canvas, the new-comment composer and the open thread. */
export function CommentsLayer(props: Props) {
  const { api, comments, placing, openId, onOpen, showResolved } = props;
  useViewportTick(api);
  const [draft, setDraft] = useState<{ x: number; y: number } | null>(null);
  const appState = api.getAppState();
  const toScreen = (x: number, y: number) => sceneCoordsToViewportCoords({ sceneX: x, sceneY: y }, appState);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setDraft(null);
      onOpen(null);
      if (placing) props.onPlaced();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const visible = comments.threads.filter((t) => showResolved || !t.resolvedAt || t.id === openId);
  const open = comments.threads.find((t) => t.id === openId) ?? null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[3] overflow-hidden">
      {placing && (
        <div
          className="pointer-events-auto absolute inset-0 cursor-crosshair"
          onClick={(e) => {
            const { x, y } = viewportCoordsToSceneCoords({ clientX: e.clientX, clientY: e.clientY }, appState);
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
            className={`pointer-events-auto absolute flex -translate-y-full items-center gap-1 rounded-full rounded-bl-none border-2 bg-white p-0.5 pr-2 shadow-lg transition-transform hover:scale-110 ${
              thread.resolvedAt ? "border-emerald-400 opacity-60" : "border-orange-400"
            }`}
            style={{ left: pos.x, top: pos.y }}
            aria-label={`Comment by ${thread.authorName}`}
          >
            <Avatar name={thread.authorName} url={thread.authorAvatar} size={24} />
            <span className="text-xs font-semibold text-neutral-700">{i + 1}</span>
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
      className="pointer-events-auto absolute w-80 rounded-xl border border-black/10 bg-white text-neutral-900 shadow-2xl"
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
        className="min-h-9 flex-1 resize-none rounded-lg border border-black/10 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-orange-400"
      />
      <button
        type="button"
        onClick={() => void submit()}
        disabled={!body.trim() || busy}
        aria-label="Send"
        className="rounded-lg bg-orange-500 p-2 text-white disabled:opacity-40"
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
      <div className="flex items-center justify-between border-b border-black/5 px-3 py-2">
        <span className="text-xs font-medium text-neutral-500">{thread.resolvedAt ? "Resolved" : "Comment"}</span>
        <div className="flex items-center gap-1">
          {canResolve && (
            <button
              type="button"
              title={thread.resolvedAt ? "Reopen" : "Resolve"}
              onClick={() => void comments.resolve(thread.id, !thread.resolvedAt)}
              className="rounded-md p-1 text-neutral-500 hover:bg-neutral-100 hover:text-emerald-600"
            >
              {thread.resolvedAt ? <RotateCcw className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            </button>
          )}
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-neutral-500 hover:bg-neutral-100">
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
                <span className="text-neutral-400">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</span>
              </p>
              <p className="whitespace-pre-wrap break-words text-sm">{c.body}</p>
            </div>
            {(isOwner || c.authorId === meId) && (
              <button
                type="button"
                aria-label="Delete comment"
                onClick={() => {
                  if (c.id === thread.id) onClose();
                  void comments.remove(c.id);
                }}
                className="self-start text-neutral-300 opacity-0 hover:text-red-500 group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </li>
        ))}
      </ul>
      <div className="border-t border-black/5">
        <Composer compact placeholder="ตอบกลับ · Reply" onSubmit={async (body) => void (await comments.reply(thread.id, body))} />
      </div>
    </Panel>
  );
}
