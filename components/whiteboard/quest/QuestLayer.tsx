"use client";

import { sceneCoordsToViewportCoords } from "@excalidraw/excalidraw";
import type { AppState, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { Flag, LayoutList } from "lucide-react";
import { type CSSProperties, useEffect, useRef } from "react";

import { findQuests, questLabelOf, questName, questTagOf, questWork, type Quest, type QuestWork } from "@/lib/whiteboard/quests";

import { focusCanvas } from "../chrome/useActiveTool";
import { isBusy, useSceneMemo } from "../shift/sceneMemo";
import { useViewportTick } from "../useViewportTick";
import { setQuestLabel } from "./labelEdits";
import { WorkRow } from "./QuestDashboard";
import type { QuestSession } from "./useQuestSession";

/** Zoomed out further than this, the buttons would crowd the board. */
const MIN_ZOOM = 0.12;
/** Gap between a quest's label and its button, in scene units. */
const GAP = 24;
/** The button's text size against its label's height, in scene units, so it matches however big the label was written. */
const INK_RATIO = 0.5;
const inkSize = (q: Quest) => Math.min(200, Math.max(10, q.height * INK_RATIO));
const DEFAULT_INK = "#2f9e44";

type Props = {
  api: ExcalidrawImperativeAPI;
  meId: string;
  /** Mentors (the board's owner and moderators) may drag the buttons; their place is saved on the label. */
  manager: boolean;
  nameOf: (id: string) => string;
  /** For quest reviewers: opens the Quest dashboard at a quest. Others see only their own work. */
  onReview?: (questId: string) => void;
  session: QuestSession | null;
  onStart: (quest: Quest) => void;
  onEnd: () => void;
};

type Viewport = { scrollX: number; scrollY: number; zoom: number };

/** Where a quest's button goes on screen: right of its label, centred on it, scaled with the board. */
function buttonTransform(q: Quest, v: Viewport): string {
  const x = (q.x + q.width + GAP + q.dx + v.scrollX) * v.zoom;
  const y = (q.y + q.height / 2 + q.dy + v.scrollY) * v.zoom;
  return `translate(${x}px, ${y}px) scale(${v.zoom})`;
}

/**
 * Keeps the buttons glued to the board while it pans and zooms. Their place is written straight
 * to the DOM inside Excalidraw's scroll callback, the same commit that redraws the canvas, so they
 * move in the same frame as the strokes. Going through a React render instead lands a frame or two
 * late, and the buttons visibly shake against the drawing.
 */
function useGluedButtons(api: ExcalidrawImperativeAPI, quests: Quest[]) {
  const nodes = useRef(new Map<string, HTMLDivElement>());
  const latest = useRef(quests);
  latest.current = quests;
  useEffect(
    () =>
      api.onScrollChange((scrollX, scrollY, zoom) => {
        const v = { scrollX, scrollY, zoom: zoom.value };
        for (const q of latest.current) {
          const node = nodes.current.get(q.id);
          if (node) node.style.transform = buttonTransform(q, v);
        }
      }),
    [api],
  );
  return (id: string) => (node: HTMLDivElement | null) => {
    if (node) nodes.current.set(id, node);
    else nodes.current.delete(id);
  };
}

/** Pointer travel, in screen pixels, after which pressing the button is a drag rather than a click. */
const DRAG_FROM = 4;

/**
 * Mentors drag a quest's button to move it: it follows the pointer, and on release the offset is
 * saved on the label. A press that barely moves is a click, which starts or ends the quest.
 */
function dragButton(api: ExcalidrawImperativeAPI, q: Quest, e: React.PointerEvent<HTMLButtonElement>, onClick: () => void) {
  const button = e.currentTarget;
  const wrapper = button.parentElement as HTMLElement;
  const start = { x: e.clientX, y: e.clientY };
  let moved = false;
  let offset = { dx: q.dx, dy: q.dy };
  button.setPointerCapture(e.pointerId);
  const move = (ev: PointerEvent) => {
    const zoom = api.getAppState().zoom.value;
    if (!moved && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < DRAG_FROM) return;
    moved = true;
    button.classList.add("wb-quest-ink--drag");
    offset = { dx: q.dx + (ev.clientX - start.x) / zoom, dy: q.dy + (ev.clientY - start.y) / zoom };
    const s = api.getAppState();
    wrapper.style.transform = buttonTransform({ ...q, ...offset }, { scrollX: s.scrollX, scrollY: s.scrollY, zoom: s.zoom.value });
  };
  const up = () => {
    button.removeEventListener("pointermove", move);
    button.removeEventListener("pointerup", up);
    button.removeEventListener("pointercancel", up);
    button.classList.remove("wb-quest-ink--drag");
    if (moved) setQuestLabel(api, q.id, { dx: Math.round(offset.dx), dy: Math.round(offset.dy) });
    else onClick();
    focusCanvas();
  };
  button.addEventListener("pointermove", move);
  button.addEventListener("pointerup", up);
  button.addEventListener("pointercancel", up);
}

/**
 * Mentors' boards keep each quest's task text saved on its label, so the quest
 * still knows its task if the text is deleted (and the settings can put it back).
 */
function useTaskBackup(api: ExcalidrawImperativeAPI, quests: Quest[], on: boolean) {
  useEffect(() => {
    if (!on || api.getAppState().editingTextElement) return;
    const byId = new Map(api.getSceneElements().map((el) => [el.id, el]));
    for (const q of quests) {
      const task = q.titleId ? byId.get(q.titleId) : undefined;
      const label = byId.get(q.id);
      if (!task || !label || task.type !== "text") continue;
      const saved = questLabelOf(label);
      if (saved?.backup !== task.text || saved?.taskId !== task.id) setQuestLabel(api, q.id, { backup: task.text, taskId: task.id }, false);
    }
  }, [api, quests, on]);
}

/** A colour Excalidraw stores ("transparent", "#1e1e1e", ...) that reads as ink on paper. */
const inkOf = (q: Quest) => (q.color && q.color !== "transparent" ? q.color : DEFAULT_INK);

/** The quest whose label is the only thing selected (and not being typed in), if any. */
function selectedQuest(quests: Quest[], appState: AppState): Quest | undefined {
  if (appState.editingTextElement) return undefined;
  const ids = Object.keys(appState.selectedElementIds);
  return ids.length === 1 ? quests.find((q) => q.id === ids[0]) : undefined;
}

/**
 * Beside every quest drawn on the board, a button drawn in the label's own ink
 * to start it (or end it, for the one this person is doing). Clicking the word
 * "Quest" opens a card with who handed in what. While a quest runs, a pill at
 * the top of the board shows its name, how much has gone into it, and an end button.
 */
export function QuestLayer({ api, meId, manager, nameOf, onReview, session, onStart, onEnd }: Props) {
  useViewportTick(api, { elements: true, selection: true });
  const quests = useSceneMemo(api, (elements) => findQuests(elements), []);
  const glue = useGluedButtons(api, quests);
  useTaskBackup(api, quests, manager);
  // Who handed in what, per quest, and what went into this person's running session.
  const counts = useSceneMemo(
    api,
    (elements) => {
      const work = new Map(questWork(elements).map((w) => [w.questId, w]));
      let mine = 0;
      if (session) {
        const byId = new Map(elements.map((el) => [el.id, el]));
        for (const el of elements) {
          if (questTagOf(el)?.session !== session.session) continue;
          // A note and its words count once.
          const container = el.type === "text" && el.containerId ? byId.get(el.containerId) : undefined;
          if (container && questTagOf(container)?.session === session.session) continue;
          mine++;
        }
      }
      return { work, mine };
    },
    [session?.session],
  );

  if (quests.length === 0) return null;
  const appState = api.getAppState();
  const zoom = appState.zoom.value;
  const active = session ? quests.find((q) => q.id === session.questId) : undefined;
  const showButtons = zoom >= MIN_ZOOM && !appState.viewModeEnabled && !isBusy(appState);
  const open = showButtons ? selectedQuest(quests, appState) : undefined;

  return (
    <>
      {showButtons && (
        <div className="pointer-events-none absolute inset-0 z-[2] overflow-hidden">
          {quests.map((q) => {
            if (q.hidden) return null;
            const pos = sceneCoordsToViewportCoords({ sceneX: q.x + q.width + GAP + q.dx, sceneY: q.y + q.height / 2 + q.dy }, appState);
            // Culled by its size on the board, which grows with the zoom.
            const reach = inkSize(q) * 12 * zoom;
            if (pos.x < -reach || pos.y < -reach || pos.x > appState.width || pos.y > appState.height + reach) return null;
            const running = q.id === session?.questId;
            // Laid out at board size and scaled by the zoom as a whole, so it moves and sizes
            // exactly like the label beside it. useGluedButtons moves it between renders.
            return (
              <div
                key={q.id}
                ref={glue(q.id)}
                className="absolute left-0 top-0 origin-top-left"
                style={{ transform: buttonTransform(q, { scrollX: appState.scrollX, scrollY: appState.scrollY, zoom }) }}
              >
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    if (!manager || e.button !== 0) return;
                    // Mentors: a drag moves it; the click is handled when the press ends.
                    e.preventDefault();
                    dragButton(api, q, e, () => (running ? onEnd() : onStart(q)));
                  }}
                  onClick={(e) => {
                    // Keyboard presses, and everyone who cannot drag. A mentor's mouse click was handled on release.
                    if (manager && e.detail > 0) return;
                    if (running) onEnd();
                    else onStart(q);
                    focusCanvas();
                  }}
                  title={`${running ? "จบ" : "เริ่ม"} ${questName(q)}${manager ? " · ลากเพื่อย้ายปุ่ม" : ""}`}
                  className={`wb-quest-ink pointer-events-auto absolute left-0 top-0 ${running ? "wb-quest-ink--on" : ""}`}
                  style={{ fontSize: inkSize(q), "--ink": inkOf(q) } as CSSProperties}
                >
                  <span className="wb-quest-ink__mark" aria-hidden>
                    {running ? "■" : "▶"}
                  </span>
                  {running ? "จบ Quest" : "เริ่ม Quest"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {open && (
        <QuestCard
          quest={open}
          work={counts.work.get(open.id)}
          appState={appState}
          meId={meId}
          nameOf={nameOf}
          api={api}
          onReview={onReview}
        />
      )}

      {session && (
        <div className="pointer-events-none fixed inset-x-0 top-16 z-[5] flex justify-center px-4">
          <div
            role="status"
            className="wb-quest-pill pointer-events-auto flex max-w-[min(640px,100%)] items-center gap-2 rounded-full py-1.5 pl-3 pr-1.5 text-sm"
          >
            <Flag className="h-4 w-4 shrink-0 text-emerald-600" />
            <span className="min-w-0 truncate">
              กำลังทำ <b>{active ? questName(active) : "Quest ที่ถูกลบไปแล้ว"}</b>
            </span>
            <span className="wb-quest-soft shrink-0 font-mono text-xs">{counts.mine} ชิ้น</span>
            <button
              type="button"
              onClick={() => {
                onEnd();
                focusCanvas();
              }}
              className="shrink-0 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              จบ Quest
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const CARD_W = 300;

/**
 * What a quest has collected, under its label while the label is selected:
 * everyone's work for reviewers, your own for everyone else. The label stays
 * selected underneath, so it can still be moved, restyled or double-clicked to edit.
 */
function QuestCard({
  api,
  quest,
  work,
  appState,
  meId,
  nameOf,
  onReview,
}: {
  api: ExcalidrawImperativeAPI;
  quest: Quest;
  work: QuestWork | undefined;
  appState: AppState;
  meId: string;
  nameOf: (id: string) => string;
  onReview?: (questId: string) => void;
}) {
  const below = sceneCoordsToViewportCoords({ sceneX: quest.x, sceneY: quest.y + quest.height }, appState);
  const left = Math.max(8, Math.min(below.x, appState.width - CARD_W - 8));
  const top = Math.max(8, Math.min(below.y + 12, appState.height - 160));
  const people = work?.people ?? [];
  const shown = onReview ? people : people.filter((p) => p.userId === meId);

  return (
    <div
      className="wb-quest-menu absolute z-[3] max-h-[50vh] space-y-2 overflow-y-auto rounded-xl p-3 text-sm"
      style={{ left, top, width: CARD_W }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <p role="heading" aria-level={3} className="font-semibold leading-snug">
        {questName(quest)}
      </p>
      <p className="wb-quest-soft text-xs">
        {onReview
          ? people.length > 0
            ? `ส่งแล้ว ${people.length} คน`
            : "ยังไม่มีใครส่งงาน"
          : shown.length > 0
            ? "งานของคุณใน Quest นี้"
            : "คุณยังไม่ได้ส่งงานใน Quest นี้"}
      </p>
      {shown.map((p) => (
        <WorkRow key={p.userId} api={api} label={onReview ? nameOf(p.userId) : "งานของคุณ"} work={p} />
      ))}
      {onReview && (
        <div className="wb-rule flex justify-end border-t pt-2">
          <button
            type="button"
            onClick={() => onReview(quest.id)}
            className="wb-quest-option inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-xs"
          >
            <LayoutList className="h-3.5 w-3.5" /> เปิดใน Dashboard
          </button>
        </div>
      )}
    </div>
  );
}
