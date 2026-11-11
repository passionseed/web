"use client";

import { sceneCoordsToViewportCoords } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { Flag, Play, Square } from "lucide-react";

import { findQuests, questName, questTagOf, questWork, type Quest } from "@/lib/whiteboard/quests";

import { focusCanvas } from "../chrome/useActiveTool";
import { isBusy, useSceneMemo } from "../shift/sceneMemo";
import { useViewportTick } from "../useViewportTick";
import type { QuestSession } from "./useQuestSession";

/** Zoomed out further than this, the buttons would crowd the board. */
const MIN_ZOOM = 0.12;
/** Gap between a quest's label and its button, in scene units. */
const GAP = 24;

type Props = {
  api: ExcalidrawImperativeAPI;
  /** For quest reviewers: opens the Quest dashboard at a quest. Others do not see the "N คน" chip. */
  onReview?: (questId: string) => void;
  session: QuestSession | null;
  onStart: (quest: Quest) => void;
  onEnd: () => void;
};

/**
 * Beside every quest drawn on the board, a button to start it (or end it, for
 * the one this person is doing), and while a quest runs, a pill at the top of
 * the board with its name, how much has gone into it, and an end button.
 */
export function QuestLayer({ api, onReview, session, onStart, onEnd }: Props) {
  useViewportTick(api, { elements: true });
  const quests = useSceneMemo(api, (elements) => findQuests(elements), []);
  // Per quest, how many people handed in work (for moderators), and what went into this session.
  const counts = useSceneMemo(
    api,
    (elements) => {
      const people = new Map(questWork(elements).map((w) => [w.questId, w.people.length]));
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
      return { people, mine };
    },
    [session?.session],
  );

  if (quests.length === 0) return null;
  const appState = api.getAppState();
  const active = session ? quests.find((q) => q.id === session.questId) : undefined;
  const showButtons = appState.zoom.value >= MIN_ZOOM && !appState.viewModeEnabled && !isBusy(appState);

  return (
    <>
      {showButtons && (
        <div className="pointer-events-none absolute inset-0 z-[2] overflow-hidden">
          {quests.map((q) => {
            const pos = sceneCoordsToViewportCoords({ sceneX: q.x + q.width + GAP, sceneY: q.y + q.height / 2 }, appState);
            if (pos.x < -200 || pos.y < -40 || pos.x > appState.width || pos.y > appState.height + 40) return null;
            const running = q.id === session?.questId;
            const handedIn = counts.people.get(q.id) ?? 0;
            return (
              <div
                key={q.id}
                className="pointer-events-auto absolute flex -translate-y-1/2 items-center gap-1.5"
                style={{ left: pos.x, top: pos.y }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (running) onEnd();
                    else onStart(q);
                    focusCanvas();
                  }}
                  title={running ? `จบ ${questName(q)}` : `เริ่ม ${questName(q)}`}
                  className={`wb-version-chip flex items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold ${
                    running ? "!border-emerald-600 !bg-emerald-600 !text-white" : ""
                  }`}
                >
                  {running ? <Square className="h-3 w-3 fill-current" /> : <Play className="h-3 w-3 fill-current" />}
                  {running ? "จบ Quest" : "เริ่ม Quest"}
                </button>
                {onReview && (
                  <button
                    type="button"
                    onClick={() => onReview(q.id)}
                    className="wb-version-chip rounded-md px-2 text-[11px]"
                    title="ดูงานของทุกคนใน Quest นี้"
                  >
                    {handedIn} คนส่งแล้ว
                  </button>
                )}
              </div>
            );
          })}
        </div>
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
