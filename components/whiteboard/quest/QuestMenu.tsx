"use client";

import { CaptureUpdateAction, newElementWith } from "@excalidraw/excalidraw";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { Check, EyeOff, Eye, Flag, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { setQuestLabel, writeQuestTask } from "./labelEdits";

import { focusCanvas } from "../chrome/useActiveTool";
import { findQuests, mayRetag, newQuestTag, questName, questTagOf, withBoundText, type Quest } from "@/lib/whiteboard/quests";

type Props = {
  api: ExcalidrawImperativeAPI;
  meId: string;
  manager: boolean;
};

type Retag = { kind: "retag"; x: number; y: number; ids: string[]; quests: Quest[]; current: string | null | "mixed"; makeQuest: string | null };
type Settings = { kind: "settings"; x: number; y: number; quest: Quest; task: string };
type Open = Retag | Settings;

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
        const picked = Object.keys(appState.selectedElementIds);
        const one = picked.length === 1 ? elements.find((el) => el.id === picked[0]) : undefined;
        // To the left of the pointer, since Excalidraw's menu opens to its right.
        const x = Math.max(8, clientX - WIDTH - 12);

        // Mentors right-clicking a quest's label get its settings.
        const quest = one && quests.find((q) => q.id === one.id);
        if (quest) {
          if (!manager) return setOpen(null);
          const taskEl = quest.titleId ? elements.find((el) => el.id === quest.titleId) : undefined;
          const task = taskEl?.type === "text" ? taskEl.text : quest.title;
          return setOpen({ kind: "settings", x, y: Math.max(8, Math.min(clientY, window.innerHeight - 380)), quest, task });
        }

        // Mentors can make any other text a quest.
        const makeQuest = manager && one?.type === "text" && !one.containerId ? one.id : null;
        const selected = withBoundText(elements, new Set(picked));
        const mine = quests.length ? selected.filter((el) => mayRetag(el, meId, manager) && !quests.some((q) => q.id === el.id)) : [];
        if (mine.length === 0 && !makeQuest) return setOpen(null);
        const tags = new Set(mine.map((el) => questTagOf(el)?.id ?? null));
        const current = tags.size === 1 ? [...tags][0] : "mixed";
        const y = Math.min(clientY, window.innerHeight - 120 - quests.length * 36);
        setOpen({ kind: "retag", x, y: Math.max(8, y), ids: mine.map((el) => el.id), quests: mine.length ? quests : [], current, makeQuest });
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
    if (open?.kind !== "retag") return;
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
    focusCanvas();
  };

  if (!open) return null;
  if (open.kind === "settings") return <QuestSettings key={open.quest.id} api={api} open={open} onClose={close} />;

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
  const makeQuest = open.makeQuest;

  return (
    <div
      data-quest-menu
      role="menu"
      className="wb-quest-menu fixed z-[60] rounded-lg p-1.5"
      style={{ left: open.x, top: open.y, width: WIDTH }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {open.ids.length > 0 && (
        <>
          <div className="wb-quest-soft flex items-center gap-1.5 px-2 pb-1 pt-0.5 text-xs font-semibold">
            <Flag className="h-3.5 w-3.5 text-emerald-600" />
            แก้ Quest ที่ส่ง
            {open.ids.length > 1 && <span className="font-normal">· {open.ids.length} ชิ้น</span>}
          </div>
          {open.quests.map((q) => option(q.id, questName(q), open.current === q.id, () => assign(q.id)))}
          <div className="wb-rule my-1 border-t border-dashed" />
          {option("none", "ไม่นับเป็นงาน Quest", open.current === null, () => assign(null))}
        </>
      )}
      {makeQuest && (
        <>
          {open.ids.length > 0 && <div className="wb-rule my-1 border-t border-dashed" />}
          <button
            type="button"
            onClick={() => {
              setQuestLabel(api, makeQuest, { off: false });
              api.setToast({ message: "ทำเป็น Quest แล้ว คลิกขวาอีกครั้งเพื่อตั้งค่า", duration: 2000 });
              close();
              focusCanvas();
            }}
            className="wb-quest-option flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm"
          >
            <Plus className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
            ทำข้อความนี้เป็น Quest
          </button>
        </>
      )}
    </div>
  );
}

/**
 * A quest's settings, for mentors, from right-clicking its label: the task text
 * (edited here and written back on the board, or put back if it was deleted),
 * whether the start button shows, and where it sits.
 */
function QuestSettings({ api, open, onClose }: { api: ExcalidrawImperativeAPI; open: Settings; onClose: () => void }) {
  const { quest } = open;
  const [task, setTask] = useState(open.task);
  const lost = !quest.titleId;
  const done = (message: string) => {
    api.setToast({ message, duration: 1500 });
    onClose();
    focusCanvas();
  };
  const row = "wb-quest-option flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm";

  return (
    <div
      data-quest-menu
      role="dialog"
      aria-label={`ตั้งค่า ${questName(quest)}`}
      className="wb-quest-menu fixed z-[60] space-y-1 rounded-lg p-2"
      style={{ left: open.x, top: open.y, width: WIDTH + 40 }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="wb-quest-soft flex items-center gap-1.5 px-1 text-xs font-semibold">
        <Flag className="h-3.5 w-3.5 text-emerald-600" />
        ตั้งค่า Quest {quest.number}
      </div>

      <label className="block px-1 pt-1 text-xs font-semibold" htmlFor="quest-task">
        คำอธิบาย Quest
      </label>
      {lost && open.task && <p className="wb-quest-soft px-1 text-xs">ข้อความบนบอร์ดหายไป นี่คือที่บันทึกไว้ล่าสุด</p>}
      <textarea
        id="quest-task"
        value={task}
        onChange={(e) => setTask(e.target.value)}
        rows={3}
        placeholder="เช่น หา reference คนที่เขาแก้ปัญหาแบบเดียวกับเรา"
        className="wb-input w-full resize-y rounded-md px-2 py-1.5 text-sm"
      />
      <button
        type="button"
        disabled={!task.trim() || (!lost && task === open.task)}
        onClick={() => {
          writeQuestTask(api, quest, task);
          done(lost ? "วางคำอธิบายบนบอร์ดแล้ว" : "แก้คำอธิบายแล้ว");
        }}
        className="w-full rounded-md bg-emerald-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
      >
        {lost ? "วางคำอธิบายกลับบนบอร์ด" : "บันทึกคำอธิบายบนบอร์ด"}
      </button>

      <div className="wb-rule my-1 border-t border-dashed" />
      <button
        type="button"
        className={row}
        onClick={() => {
          setQuestLabel(api, quest.id, { hidden: !quest.hidden });
          done(quest.hidden ? "แสดงปุ่มเริ่ม Quest แล้ว" : "ลบปุ่มเริ่ม Quest แล้ว");
        }}
      >
        {quest.hidden ? <Eye className="h-3.5 w-3.5 shrink-0" /> : <EyeOff className="h-3.5 w-3.5 shrink-0" />}
        {quest.hidden ? "สร้างปุ่มเริ่ม Quest" : "ลบปุ่มเริ่ม Quest"}
      </button>
      {!quest.hidden && (quest.dx !== 0 || quest.dy !== 0) && (
        <button
          type="button"
          className={row}
          onClick={() => {
            setQuestLabel(api, quest.id, { dx: 0, dy: 0 });
            done("ย้ายปุ่มกลับที่เดิมแล้ว");
          }}
        >
          <RotateCcw className="h-3.5 w-3.5 shrink-0" /> ย้ายปุ่มกลับข้างคำว่า Quest
        </button>
      )}
      <button
        type="button"
        className={`${row} text-red-600`}
        onClick={() => {
          setQuestLabel(api, quest.id, { off: true });
          done("เลิกเป็น Quest แล้ว งานที่ส่งไว้ยังอยู่");
        }}
      >
        <Trash2 className="h-3.5 w-3.5 shrink-0" /> เลิกเป็น Quest
      </button>
    </div>
  );
}
