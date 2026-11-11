"use client";

import { Sidebar } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { Flag } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";

import { QuestDashboard, questSectionId, type Person } from "./QuestDashboard";

export const QUEST_SIDEBAR = "quest-dashboard";

/** Opens the Quest dashboard, optionally scrolled to one quest. */
export function openQuestPanel(api: ExcalidrawImperativeAPI, questId?: string) {
  api.toggleSidebar({ name: QUEST_SIDEBAR, force: true });
  if (questId) {
    requestAnimationFrame(() =>
      document.getElementById(questSectionId(questId))?.scrollIntoView({ block: "start", behavior: "smooth" }),
    );
  }
}

const WIDTH_KEY = "whiteboard-quest-panel-width";
const DOCK_KEY = "whiteboard-quest-panel-docked";
const MIN_WIDTH = 280;
const DEFAULT_WIDTH = 360;
const maxWidth = () => Math.max(MIN_WIDTH, Math.min(900, Math.round(window.innerWidth * 0.7)));

const read = (key: string) => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private windows: the width just isn't remembered.
  }
};

/** Sets the panel's width: Excalidraw's own sidebar variable (which a docked panel also moves the board UI by) and ours for the chrome. */
function applyWidth(width: number | null) {
  const board = document.querySelector<HTMLElement>(".whiteboard-room .excalidraw");
  const room = document.querySelector<HTMLElement>(".whiteboard-room");
  for (const [el, name] of [
    [board, "--right-sidebar-width"],
    [room, "--wb-sidebar-w"],
  ] as const) {
    if (!el) continue;
    if (width === null) el.style.removeProperty(name);
    else el.style.setProperty(name, `${width}px`);
  }
}

/**
 * The left edge of the open panel: drag it to make the panel wider or narrower, like
 * the Claude app's side panes. The width is kept per browser. Mounted only while the
 * panel is open, so closing it gives other panels their usual width back.
 */
function ResizeEdge() {
  const width = useRef(DEFAULT_WIDTH);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const saved = Number(read(WIDTH_KEY));
    width.current = Number.isFinite(saved) && saved >= MIN_WIDTH ? Math.min(saved, maxWidth()) : DEFAULT_WIDTH;
    applyWidth(width.current);
    return () => applyWidth(null);
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const edge = e.currentTarget;
    edge.setPointerCapture(e.pointerId);
    setDragging(true);
    const right = edge.closest(".sidebar")?.getBoundingClientRect().right ?? window.innerWidth;
    const move = (ev: PointerEvent) => {
      width.current = Math.round(Math.max(MIN_WIDTH, Math.min(maxWidth(), right - ev.clientX)));
      applyWidth(width.current);
    };
    const up = () => {
      edge.removeEventListener("pointermove", move);
      edge.removeEventListener("pointerup", up);
      edge.removeEventListener("pointercancel", up);
      setDragging(false);
      write(WIDTH_KEY, String(width.current));
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
      onDoubleClick={() => {
        width.current = DEFAULT_WIDTH;
        applyWidth(DEFAULT_WIDTH);
        write(WIDTH_KEY, String(DEFAULT_WIDTH));
      }}
    />
  );
}

/**
 * The Quest dashboard as a panel of its own (not a tab of the board kit), for
 * the board's owner, site admins and quest reviewers. Opened from the board
 * menu or a quest's card on the board. Drag its left edge to resize it, and dock it to
 * keep it beside the board.
 */
export const QuestSidebar = memo(function QuestSidebar({
  api,
  people,
  nameOf,
  avatarOf,
}: {
  api: ExcalidrawImperativeAPI;
  avatarOf: (id: string) => string | null;
  people: Person[];
  nameOf: (id: string) => string;
}) {
  // Docked, it sits beside the board instead of over it (Excalidraw's dock button in the header).
  const [docked, setDocked] = useState(() => typeof window !== "undefined" && read(DOCK_KEY) === "1");
  const dock = (on: boolean) => {
    setDocked(on);
    write(DOCK_KEY, on ? "1" : "0");
  };

  return (
    <Sidebar name={QUEST_SIDEBAR} className="whiteboard-kit wb-quest-sidebar" docked={docked} onDock={dock}>
      <ResizeEdge />
      <Sidebar.Header>
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          <Flag className="h-4 w-4 text-emerald-600" /> Quest Dashboard
        </span>
      </Sidebar.Header>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <QuestDashboard api={api} people={people} nameOf={nameOf} avatarOf={avatarOf} />
      </div>
    </Sidebar>
  );
});
