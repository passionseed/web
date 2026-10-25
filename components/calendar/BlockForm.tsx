"use client";

import "./calendar.css";

import { Loader2 } from "lucide-react";
import { useState } from "react";

import { BLOCK_KINDS, KIND_STYLE, bangkokParts, type BlockInput, type CalendarBlock } from "@/lib/calendar/core";
import { bangkokToday } from "@/lib/content/shift-cohort";

const field =
  "w-full rounded-lg border cal-line bg-transparent px-2.5 py-1.5 text-sm outline-none focus:border-orange-400/70";

const clockOf = (hour: number, endOfDay = false) => (endOfDay ? "23:59" : `${String(hour).padStart(2, "0")}:00`);

/** Add or edit a block. Times are Bangkok time. */
export function BlockForm({
  block,
  date,
  hour,
  attachBoard,
  onSubmit,
  onCancel,
}: {
  block?: CalendarBlock;
  /** Default date for a new block. */
  date?: string;
  /** Default start hour for a new block (clicked on the week grid). */
  hour?: number;
  /** Offer "attach this board" (only to the board owner). */
  attachBoard?: { id: string; title: string };
  onSubmit: (input: BlockInput) => Promise<boolean>;
  onCancel: () => void;
}) {
  const start = block ? bangkokParts(block.startsAt) : null;
  const [form, setForm] = useState({
    title: block?.title ?? "",
    kind: (block?.kind ?? "meetup") as BlockInput["kind"],
    date: start?.date ?? date ?? bangkokToday(),
    start: start?.time ?? (hour !== undefined ? clockOf(hour) : "19:00"),
    end: block ? bangkokParts(block.endsAt).time : hour !== undefined ? clockOf(Math.min(hour + 1, 23), hour >= 23) : "20:00",
    place: block?.place ?? "",
    note: block?.note ?? "",
  });
  const [attach, setAttach] = useState(Boolean(attachBoard && !block));
  const [busy, setBusy] = useState(false);
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <form
      className="space-y-2"
      onKeyDown={(e) => e.stopPropagation()}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const ok = await onSubmit({ ...form, ...(attachBoard ? { whiteboardId: attach ? attachBoard.id : null } : {}) });
        setBusy(false);
        if (ok) onCancel();
      }}
    >
      <input autoFocus required maxLength={120} value={form.title} onChange={set("title")} placeholder="ชื่อ เช่น นั่งทำโปรเจกต์ด้วยกัน" className={field} />
      <div className="flex flex-wrap gap-1">
        {BLOCK_KINDS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setForm((f) => ({ ...f, kind: k }))}
            className={`rounded-full border px-2.5 py-0.5 text-xs ${form.kind === k ? "border-transparent text-white" : "cal-line opacity-70"}`}
            style={form.kind === k ? { background: KIND_STYLE[k].color } : undefined}
          >
            {KIND_STYLE[k].label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-[1fr_auto_auto] gap-1.5">
        <input type="date" required value={form.date} onChange={set("date")} className={field} />
        <input type="time" required value={form.start} onChange={set("start")} className={field} />
        <input type="time" required value={form.end} onChange={set("end")} className={field} />
      </div>
      <input maxLength={200} value={form.place} onChange={set("place")} placeholder="ที่ไหน เช่น Discord ห้อง 2" className={field} />
      <textarea maxLength={1000} rows={2} value={form.note} onChange={set("note")} placeholder="รายละเอียด (ไม่ใส่ก็ได้)" className={field} />
      {attachBoard && (
        <label className="flex items-center gap-2 text-xs opacity-80">
          <input type="checkbox" checked={attach} onChange={(e) => setAttach(e.target.checked)} />
          แนบลิงก์บอร์ด &quot;{attachBoard.title}&quot; ให้ทุกคนกดเข้ามาได้
        </label>
      )}
      <p className="text-xs opacity-60">ทุกคนที่ล็อกอินเห็นนัดนี้และเห็นว่าใครจะมา</p>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg px-3 py-1.5 text-sm opacity-70 hover:opacity-100">
          ยกเลิก
        </button>
        <button type="submit" disabled={busy} className="rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : block ? "บันทึก" : "เพิ่ม"}
        </button>
      </div>
    </form>
  );
}
