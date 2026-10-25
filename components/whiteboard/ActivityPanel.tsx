"use client";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { format, formatDistanceToNow } from "date-fns";
import { Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import type { BoardActivity } from "@/lib/supabase/whiteboards";
import { describeCounts, type ChangeAction, type ChangeItem } from "@/lib/whiteboard/activity";

import { boardApi } from "./useWhiteboardSync";

type Props = {
  api: ExcalidrawImperativeAPI;
  boardId: string;
  showAuthors: boolean;
  onShowAuthors: (show: boolean) => void;
  /** Hands the names it loads to the author overlay. */
  onPeople: (people: Record<string, string>) => void;
};

const ACTION: Record<ChangeAction, { label: string; className: string }> = {
  added: { label: "เพิ่ม", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  edited: { label: "แก้", className: "bg-amber-500/20 text-amber-800 dark:text-amber-200" },
  changed: { label: "ปรับ", className: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  deleted: { label: "ลบ", className: "bg-red-500/15 text-red-700 dark:text-red-300" },
};

const TYPE: Record<string, string> = {
  text: "ข้อความ",
  rectangle: "กล่อง",
  ellipse: "วงกลม",
  diamond: "สี่เหลี่ยมขนมเปียกปูน",
  arrow: "ลูกศร",
  line: "เส้น",
  freedraw: "ลายมือ",
  image: "รูป",
  frame: "เฟรม",
};

function itemLabel(item: ChangeItem): string {
  if (item.text) return `"${item.text}"`;
  return item.container ? "ข้อความในโน้ต" : (TYPE[item.type] ?? item.type);
}

/** Admin view: who added, edited, moved or deleted what on this board, and when. */
export function ActivityPanel({ api, boardId, showAuthors, onShowAuthors, onPeople }: Props) {
  const [activity, setActivity] = useState<BoardActivity | null>(null);
  const [loading, setLoading] = useState(false);
  const [person, setPerson] = useState("all");
  const [open, setOpen] = useState<number | null>(0);
  const [showMoves, setShowMoves] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await boardApi<BoardActivity>(`/api/whiteboards/${boardId}/activity`);
      setActivity(data);
      onPeople(data.people);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load activity");
    } finally {
      setLoading(false);
    }
  }, [boardId, onPeople]);

  useEffect(() => void load(), [load]);

  const name = (id: string | null) => (id ? (activity?.people[id] ?? "Someone") : "ไม่ทราบ");
  const sessions = useMemo(
    () =>
      (activity?.sessions ?? [])
        .filter((s) => person === "all" || s.userId === person)
        .map((s) => ({ ...s, shown: showMoves ? s.items : s.items.filter((i) => i.action !== "changed") }))
        .filter((s) => s.shown.length > 0),
    [activity, person, showMoves],
  );
  const everyone = useMemo(
    () => [...new Set((activity?.sessions ?? []).flatMap((s) => (s.userId ? [s.userId] : [])))],
    [activity],
  );

  const reveal = (item: ChangeItem) => {
    const target = api.getSceneElements().find((el) => el.id === (item.container ?? item.id));
    if (!target) return toast("ชิ้นนี้ถูกลบไปแล้ว · Already deleted");
    api.scrollToContent(target, { animate: true });
    api.updateScene({ appState: { selectedElementIds: { [target.id]: true } } });
  };

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={showAuthors} onChange={(e) => onShowAuthors(e.target.checked)} />
        แสดงชื่อคนเขียนบนบอร์ด · Show who wrote what
      </label>
      <div className="flex items-center gap-1.5">
        <select
          value={person}
          onChange={(e) => setPerson(e.target.value)}
          className="min-w-0 flex-1 rounded-md border border-black/10 bg-transparent px-2 py-1 text-xs dark:border-white/10"
        >
          <option value="all">ทุกคน · Everyone</option>
          {everyone.map((id) => (
            <option key={id} value={id}>
              {name(id)}
            </option>
          ))}
        </select>
        <button
          type="button"
          title="Refresh"
          onClick={() => void load()}
          className="rounded-md p-1.5 opacity-70 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </button>
      </div>
      <label className="flex items-center gap-2 text-xs opacity-70">
        <input type="checkbox" checked={showMoves} onChange={(e) => setShowMoves(e.target.checked)} />
        รวมการย้าย/ปรับขนาด · Include moves
      </label>
      <p className="text-xs opacity-60">เห็นเฉพาะแอดมิน บันทึกตั้งแต่ 25 ต.ค. 2026</p>

      {activity === null ? (
        <Loader2 className="mx-auto h-5 w-5 animate-spin opacity-50" />
      ) : sessions.length === 0 ? (
        <p className="py-6 text-center text-sm opacity-60">ยังไม่มีการเปลี่ยนแปลง</p>
      ) : (
        <ul className="space-y-2">
          {sessions.map((s, i) => (
            <li key={`${s.userId}-${s.from}`} className="wb-tile overflow-hidden">
              <button type="button" onClick={() => setOpen(open === i ? null : i)} className="w-full p-2.5 text-left">
                <p className="text-xs">
                  <span className="font-semibold">{name(s.userId)}</span>{" "}
                  <span className="opacity-60" title={`${format(new Date(s.from), "PPp")} to ${format(new Date(s.to), "p")}`}>
                    {formatDistanceToNow(new Date(s.to), { addSuffix: true })}
                  </span>
                </p>
                <p className="text-xs opacity-70">{describeCounts(s.counts)}</p>
              </button>
              {open === i && (
                <ul className="space-y-0.5 border-t border-black/5 p-1.5 dark:border-white/10">
                  {s.shown.slice(0, 200).map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => reveal(item)}
                        className="flex w-full items-start gap-1.5 rounded px-1 py-0.5 text-left text-xs hover:bg-black/5 dark:hover:bg-white/10"
                      >
                        <span className={`shrink-0 rounded px-1 ${ACTION[item.action].className}`}>{ACTION[item.action].label}</span>
                        <span className="min-w-0 break-words">
                          {item.action === "edited" && item.before ? (
                            <>
                              <span className="line-through opacity-50">{item.before}</span> → {itemLabel(item)}
                            </>
                          ) : (
                            itemLabel(item)
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
                  {s.shown.length > 200 && <li className="px-1 text-xs opacity-60">และอีก {s.shown.length - 200} ชิ้น</li>}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
