"use client";

import { sceneCoordsToViewportCoords } from "@excalidraw/excalidraw";
import type { AppState, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { Flag, LayoutList } from "lucide-react";
import type { CSSProperties } from "react";

import { findQuests, questName, questTagOf, questWork, type Quest, type QuestWork } from "@/lib/whiteboard/quests";

import { focusCanvas } from "../chrome/useActiveTool";
import { isBusy, useSceneMemo } from "../shift/sceneMemo";
import { useViewportTick } from "../useViewportTick";
import { WorkRow } from "./QuestDashboard";
import type { QuestSession } from "./useQuestSession";

/** Zoomed out further than this, the buttons would crowd the board. */
const MIN_ZOOM = 0.12;
/** Gap between a quest's label and its button, in scene units. */
const GAP = 24;
/** The button's text size in scene units, so it grows and shrinks with the board like the label. */
const INK_SIZE = 32;
const DEFAULT_INK = "#2f9e44";

type Props = {
  api: ExcalidrawImperativeAPI;
  meId: string;
  nameOf: (id: string) => string;
  /** For quest reviewers: opens the Quest dashboard at a quest. Others see only their own work. */
  onReview?: (questId: string) => void;
  session: QuestSession | null;
  onStart: (quest: Quest) => void;
  onEnd: () => void;
};

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
export function QuestLayer({ api, meId, nameOf, onReview, session, onStart, onEnd }: Props) {
  useViewportTick(api, { elements: true, selection: true });
  const quests = useSceneMemo(api, (elements) => findQuests(elements), []);
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
  const fontSize = Math.min(44, Math.max(12, INK_SIZE * zoom));

  return (
    <>
      {showButtons && (
        <div className="pointer-events-none absolute inset-0 z-[2] overflow-hidden">
          {quests.map((q) => {
            const pos = sceneCoordsToViewportCoords({ sceneX: q.x + q.width + GAP, sceneY: q.y + q.height / 2 }, appState);
            if (pos.x < -300 || pos.y < -60 || pos.x > appState.width || pos.y > appState.height + 60) return null;
            const running = q.id === session?.questId;
            return (
              <button
                key={q.id}
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => {
                  if (running) onEnd();
                  else onStart(q);
                  focusCanvas();
                }}
                title={running ? `จบ ${questName(q)}` : `เริ่ม ${questName(q)}`}
                className={`wb-quest-ink pointer-events-auto absolute ${running ? "wb-quest-ink--on" : ""}`}
                style={{ left: pos.x, top: pos.y, fontSize, "--ink": inkOf(q) } as CSSProperties}
              >
                <span className="wb-quest-ink__mark" aria-hidden>
                  {running ? "■" : "▶"}
                </span>
                {running ? "จบ Quest" : "เริ่ม Quest"}
              </button>
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
