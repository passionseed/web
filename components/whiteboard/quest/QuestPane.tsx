"use client";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { Flag, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { WB_FONT_VARS } from "../fonts";
import { QuestDashboard, questSectionId, type Person } from "./QuestDashboard";

const OPEN_EVENT = "wb-quest-pane";
const WIDTH_KEY = "whiteboard-quest-panel-width";
const openKey = (boardId: string) => `whiteboard-quest-pane-open:${boardId}`;
const MIN_WIDTH = 280;
const DEFAULT_WIDTH = 380;
/** The board keeps at least this much room beside the pane. */
const MIN_BOARD = 240;
const maxWidth = () => Math.max(MIN_WIDTH, Math.min(900, window.innerWidth - MIN_BOARD));
const clamp = (w: number) => Math.round(Math.max(MIN_WIDTH, Math.min(maxWidth(), w)));

const read = (key: string) => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string | null) => {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Private windows: nothing is remembered.
  }
};

/** Opens the Quest pane, optionally scrolled to one quest. */
export function openQuestPanel(questId?: string) {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { questId } }));
}

/**
 * Whether the Quest pane is open and how wide, for the board to make room for it.
 * It stays open while people draw (nothing on the board closes it) and across
 * reloads of the same board, until its close button.
 */
export function useQuestPane(boardId: string, enabled: boolean) {
  const [open, setOpen] = useState(false);
  const [width, setWidth] = useState(DEFAULT_WIDTH);

  useEffect(() => {
    if (!enabled) return;
    const saved = Number(read(WIDTH_KEY));
    if (Number.isFinite(saved) && saved >= MIN_WIDTH) setWidth(clamp(saved));
    if (read(openKey(boardId)) === "1") setOpen(true);
    const onOpen = (e: Event) => {
      setOpen(true);
      write(openKey(boardId), "1");
      const questId = (e as CustomEvent<{ questId?: string }>).detail?.questId;
      if (questId) {
        // After the pane has rendered.
        setTimeout(() => document.getElementById(questSectionId(questId))?.scrollIntoView({ block: "start", behavior: "smooth" }), 80);
      }
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, [boardId, enabled]);

  const close = useCallback(() => {
    setOpen(false);
    write(openKey(boardId), null);
  }, [boardId]);
  const resize = useCallback((w: number, save: boolean) => {
    const next = clamp(w);
    setWidth(next);
    if (save) write(WIDTH_KEY, String(next));
  }, []);

  return { open: enabled && open, width, close, resize };
}

/** The pane's left edge: drag to resize, double-click for the default width. */
function ResizeEdge({ width, onResize }: { width: number; onResize: (w: number, save: boolean) => void }) {
  const [dragging, setDragging] = useState(false);
  const latest = useRef(width);
  latest.current = width;

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const edge = e.currentTarget;
    edge.setPointerCapture(e.pointerId);
    setDragging(true);
    const move = (ev: PointerEvent) => onResize(window.innerWidth - ev.clientX, false);
    const up = (ev: PointerEvent) => {
      edge.removeEventListener("pointermove", move);
      edge.removeEventListener("pointerup", up);
      edge.removeEventListener("pointercancel", up);
      setDragging(false);
      onResize(window.innerWidth - ev.clientX, true);
    };
    edge.addEventListener("pointermove", move);
    edge.addEventListener("pointerup", up);
    edge.addEventListener("pointercancel", up);
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="ลากเพื่อปรับความกว้าง"
      title="ลากเพื่อปรับความกว้าง · ดับเบิลคลิกเพื่อกลับขนาดเดิม"
      className={`wb-panel-edge ${dragging ? "wb-panel-edge--on" : ""}`}
      onPointerDown={onPointerDown}
      onDoubleClick={() => onResize(DEFAULT_WIDTH, true)}
    />
  );
}

/**
 * The Quest dashboard as a pane of its own beside the board, like the Claude
 * app's side panes: the board shrinks to make room (the room's right edge moves
 * in, see WhiteboardCanvas), so nothing is covered, and drawing never closes it.
 * For the board's owner, site admins and quest reviewers.
 */
export function QuestPane({
  api,
  width,
  onResize,
  onClose,
  people,
  nameOf,
  avatarOf,
}: {
  api: ExcalidrawImperativeAPI;
  width: number;
  onResize: (w: number, save: boolean) => void;
  onClose: () => void;
  people: Person[];
  nameOf: (id: string) => string;
  avatarOf: (id: string) => string | null;
}) {
  return (
    <aside
      aria-label="Quest Dashboard"
      className={`wb-theme wb-quest-pane fixed inset-y-0 right-0 z-[40] flex flex-col ${WB_FONT_VARS}`}
      style={{ width }}
    >
      <ResizeEdge width={width} onResize={onResize} />
      <header className="wb-quest-pane__head flex items-center gap-2 px-3 py-2.5">
        <Flag className="h-4 w-4 text-emerald-600" />
        <span className="flex-1 text-sm font-semibold">Quest Dashboard</span>
        <button type="button" onClick={onClose} className="wb-quest-option rounded-md p-1.5" aria-label="ปิด · Close">
          <X className="h-4 w-4" />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <QuestDashboard api={api} people={people} nameOf={nameOf} avatarOf={avatarOf} />
      </div>
    </aside>
  );
}
