"use client";

import { CaptureUpdateAction, newElementWith } from "@excalidraw/excalidraw";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { Check, Flag } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { findQuests, mayRetag, newQuestTag, questName, questTagOf, withBoundText, type Quest } from "@/lib/whiteboard/quests";

type Props = {
  api: ExcalidrawImperativeAPI;
  meId: string;
  manager: boolean;
};

type Open = { x: number; y: number; ids: string[]; quests: Quest[]; current: string | null | "mixed" };

const WIDTH = 260;

/**
 * "แก้ Quest ที่ส่ง": right-click something on the board and, if this person
 * may change it, a small card beside Excalidraw's own menu says which quest it
 * counts for and lets them move it to another quest or out of quests.
 * Excalidraw 0.18 has no way to add items to its menu, so this is our own card,
 * opened from the same right-click (Excalidraw selects what was clicked first).
 */
export function QuestMenu({ api, meId, manager }: Props) {
  const [open, setOpen] = useState<Open | null>(null);
  const close = useCallback(() => setOpen(null), []);

  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest(".excalidraw") || target.tagName !== "CANVAS") return;
      const { clientX, clientY } = e;
      // Excalidraw selects what was right-clicked while handling this event; read it after.
      requestAnimationFrame(() => {
        const appState = api.getAppState();
        if (appState.viewModeEnabled) return;
        const elements = api.getSceneElements();
        const quests = findQuests(elements);
        if (quests.length === 0) return;
        const selected = withBoundText(elements, new Set(Object.keys(appState.selectedElementIds)));
        const mine = selected.filter((el) => mayRetag(el, meId, manager) && !quests.some((q) => q.id === el.id));
        if (mine.length === 0) return setOpen(null);
        const tags = new Set(mine.map((el) => questTagOf(el)?.id ?? null));
        const current = tags.size === 1 ? [...tags][0] : "mixed";
        // To the left of the pointer, since Excalidraw's menu opens to its right.
        const x = Math.max(8, clientX - WIDTH - 12);
        const y = Math.min(clientY, window.innerHeight - 80 - quests.length * 36);
        setOpen({ x, y: Math.max(8, y), ids: mine.map((el) => el.id), quests, current });
      });
    };
    // Capture: Excalidraw may stop the event before it bubbles up.
    document.addEventListener("contextmenu", onContextMenu, true);
    return () => document.removeEventListener("contextmenu", onContextMenu, true);
  }, [api, meId, manager]);

  // Any other click, a key, or scrolling closes it, like Excalidraw's own menu.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!(e.target as HTMLElement | null)?.closest("[data-quest-menu]")) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    const offScroll = api.onScrollChange(close);
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("keydown", onKey);
    return () => {
      offScroll();
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [api, close, open]);

  const assign = (questId: string | null) => {
    if (!open) return;
    const ids = new Set(open.ids);
    const session = `retag-${crypto.randomUUID()}`;
    api.updateScene({
      elements: api.getSceneElementsIncludingDeleted().map((el) => {
        if (!ids.has(el.id)) return el;
        const rest: Record<string, unknown> = { ...el.customData };
        delete rest.quest;
        const old = questTagOf(el);
        // The work stays whoever made it; only the quest changes.
        const tag = questId ? { ...newQuestTag(questId, old?.session ?? session, old?.by ?? meId), at: old?.at ?? new Date().toISOString() } : null;
        return newElementWith(el as ExcalidrawElement, { customData: tag ? { ...rest, quest: tag } : rest });
      }),
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });
    api.setToast({ message: questId ? "ย้ายงานไป Quest แล้ว" : "ไม่นับเป็นงาน Quest แล้ว", duration: 1500 });
    close();
    document.querySelector<HTMLElement>(".whiteboard-root .excalidraw")?.focus({ preventScroll: true });
  };

  if (!open) return null;
  const option = (key: string, label: string, chosen: boolean, onClick: () => void) => (
    <button
      key={key}
      type="button"
      onClick={onClick}
      className="wb-quest-option flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm"
    >
      <Check className={`h-3.5 w-3.5 shrink-0 ${chosen ? "text-emerald-600" : "invisible"}`} />
      <span className="min-w-0 truncate">{label}</span>
    </button>
  );

  return (
    <div
      data-quest-menu
      role="menu"
      className="wb-quest-menu fixed z-[60] rounded-lg p-1.5"
      style={{ left: open.x, top: open.y, width: WIDTH }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="wb-quest-soft flex items-center gap-1.5 px-2 pb-1 pt-0.5 text-xs font-semibold">
        <Flag className="h-3.5 w-3.5 text-emerald-600" />
        แก้ Quest ที่ส่ง
        {open.ids.length > 1 && <span className="font-normal">· {open.ids.length} ชิ้น</span>}
      </div>
      {open.quests.map((q) => option(q.id, questName(q), open.current === q.id, () => assign(q.id)))}
      <div className="wb-rule my-1 border-t border-dashed" />
      {option("none", "ไม่นับเป็นงาน Quest", open.current === null, () => assign(null))}
    </div>
  );
}
