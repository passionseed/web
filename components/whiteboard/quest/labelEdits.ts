"use client";

import { CaptureUpdateAction, convertToExcalidrawElements, newElementWith } from "@excalidraw/excalidraw";
import type { ExcalidrawElement, ExcalidrawTextElement } from "@excalidraw/excalidraw/element/types";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import { questLabelOf, type Quest, type QuestLabelData } from "@/lib/whiteboard/quests";

/** How far under its label a restored task text goes, in scene units (as on SHIFT[3] Day 2). */
const TASK_BELOW = 110;

/**
 * Changes a quest label's settings (customData.questLabel). It is an edit of the
 * label like any other, so it saves, syncs and undoes with the board.
 */
export function setQuestLabel(
  api: ExcalidrawImperativeAPI,
  labelId: string,
  patch: Partial<QuestLabelData> | null,
  /** False for bookkeeping the person did not do themselves, which stays out of undo. */
  undoable = true,
) {
  api.updateScene({
    elements: api.getSceneElementsIncludingDeleted().map((el) => {
      if (el.id !== labelId) return el;
      const rest: Record<string, unknown> = { ...el.customData };
      delete rest.questLabel;
      const next = patch === null ? null : { ...questLabelOf(el), ...patch };
      return newElementWith(el as ExcalidrawElement, { customData: next ? { ...rest, questLabel: next } : rest });
    }),
    captureUpdate: undoable ? CaptureUpdateAction.IMMEDIATELY : CaptureUpdateAction.NEVER,
  });
}

/**
 * Writes a quest's task under its label: replaces the task text on the board (a
 * new text element, so Excalidraw measures it) or, when it was deleted, puts a
 * new one back. Also saved on the label, so it can be put back again.
 */
export function writeQuestTask(api: ExcalidrawImperativeAPI, quest: Quest, task: string) {
  const all = api.getSceneElementsIncludingDeleted();
  const label = all.find((el) => el.id === quest.id) as ExcalidrawTextElement | undefined;
  if (!label) return;
  const old = quest.titleId ? (all.find((el) => el.id === quest.titleId) as ExcalidrawTextElement | undefined) : undefined;
  const text = task.trim();

  const [fresh] = text
    ? convertToExcalidrawElements([
        {
          type: "text",
          x: old?.x ?? label.x,
          y: old?.y ?? label.y + TASK_BELOW,
          text,
          fontSize: old?.fontSize ?? Math.round(label.fontSize * 0.75),
          fontFamily: old?.fontFamily ?? label.fontFamily,
          strokeColor: old?.strokeColor ?? label.strokeColor,
        },
      ])
    : [];

  api.updateScene({
    elements: [
      ...all.map((el) => {
        if (el.id === old?.id) return newElementWith(el as ExcalidrawElement, { isDeleted: true });
        if (el.id !== label.id) return el;
        return newElementWith(el as ExcalidrawElement, {
          customData: { ...el.customData, questLabel: { ...questLabelOf(el), backup: text || undefined } },
        });
      }),
      ...(fresh ? [fresh] : []),
    ],
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });
}
