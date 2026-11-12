"use client";

import { ArrowLeft, Check, Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import type { GroupInput, MentorGroup } from "@/lib/whiteboard/groups";

import { Face } from "../chrome/Face";

type Who = { userId: string; name: string; avatarUrl: string | null };

type Props = {
  groups: MentorGroup[];
  /** Staff on the board, who can mentor a group. */
  staff: Who[];
  /** Students on the board, who can be put in a group. */
  students: Who[];
  meId: string;
  save: (input: GroupInput, id?: string) => Promise<MentorGroup>;
  remove: (id: string) => Promise<void>;
  onBack: () => void;
};

/** Staff make and change mentor groups: a name, its mentors and its students. */
export function MentorGroups({ groups, staff, students, meId, save, remove, onBack }: Props) {
  // null: the list; "new": a new group; otherwise the id of the group being changed.
  const [editing, setEditing] = useState<string | null>(null);
  const nameOf = (id: string) => [...staff, ...students].find((p) => p.userId === id)?.name ?? "ไม่ได้อยู่ในบอร์ดแล้ว";

  if (editing) {
    const group = groups.find((g) => g.id === editing);
    return (
      <GroupEditor
        key={editing}
        group={group}
        groups={groups}
        staff={staff}
        students={students}
        meId={meId}
        onDone={() => setEditing(null)}
        onSave={async (input) => {
          await save(input, group?.id);
          setEditing(null);
        }}
        onDelete={
          group
            ? async () => {
                await remove(group.id);
                setEditing(null);
              }
            : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      <BackTo label="ภาพรวม" onClick={onBack} />
      <div className="flex items-center gap-2">
        <p role="heading" aria-level={3} className="flex-1 text-sm font-semibold">
          กลุ่มของ Mentor
        </p>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="wb-btn wb-btn--sm inline-flex items-center gap-1 px-2.5 text-xs"
        >
          <Plus className="h-3.5 w-3.5" /> สร้างกลุ่ม
        </button>
      </div>
      {groups.length === 0 && (
        <p className="wb-soft text-xs leading-relaxed">
          ยังไม่มีกลุ่ม แบ่งนักเรียนเป็นกลุ่มแล้วใส่ mentor ของแต่ละกลุ่ม เมื่อ mentor เปิด Dashboard จะเห็นงานของกลุ่มตัวเองก่อน
        </p>
      )}
      <ul className="space-y-1.5">
        {groups.map((g) => (
          <li key={g.id} className="wb-quest-card space-y-1 rounded-lg p-2.5">
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{g.name}</span>
              {g.mentorIds.includes(meId) && <span className="wb-version-chip wb-version-chip--on rounded-md px-1.5 text-[0.7rem]">กลุ่มของฉัน</span>}
              <button
                type="button"
                onClick={() => setEditing(g.id)}
                aria-label={`แก้กลุ่ม ${g.name}`}
                className="wb-quest-option rounded-md p-1.5"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="wb-soft truncate text-xs">Mentor: {g.mentorIds.map(nameOf).join(", ") || "ยังไม่มี"}</p>
            <p className="wb-soft flex items-center gap-1 text-xs">
              <Users className="h-3 w-3" /> นักเรียน {g.studentIds.length} คน
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function GroupEditor({
  group,
  groups,
  staff,
  students,
  meId,
  onDone,
  onSave,
  onDelete,
}: {
  group: MentorGroup | undefined;
  groups: MentorGroup[];
  staff: Who[];
  students: Who[];
  meId: string;
  onDone: () => void;
  onSave: (input: GroupInput) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [name, setName] = useState(group?.name ?? `กลุ่ม ${groups.length + 1}`);
  // A new group starts with whoever makes it as its mentor.
  const [mentorIds, setMentorIds] = useState<string[]>(group?.mentorIds ?? [meId]);
  const [studentIds, setStudentIds] = useState<string[]>(group?.studentIds ?? []);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);

  // Which other group each student is already in, to avoid putting them in two by accident.
  const otherGroup = new Map<string, string>();
  for (const g of groups) if (g.id !== group?.id) for (const id of g.studentIds) otherGroup.set(id, g.name);

  const toggle = (list: string[], set: (v: string[]) => void, id: string) =>
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const q = query.trim().toLowerCase();
  const shown = students
    .filter((s) => !q || s.name.toLowerCase().includes(q))
    .sort((a, b) => Number(Boolean(otherGroup.get(a.userId))) - Number(Boolean(otherGroup.get(b.userId))) || a.name.localeCompare(b.name, "th"));

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        void run(() => onSave({ name: name.trim(), mentorIds, studentIds }));
      }}
    >
      <BackTo label="กลุ่มทั้งหมด" onClick={onDone} />
      <label className="block space-y-1">
        <span className="wb-label">ชื่อกลุ่ม</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required className="wb-input w-full px-3 py-2 text-sm" />
      </label>

      <fieldset className="space-y-1">
        <legend className="wb-label">Mentor ({mentorIds.length})</legend>
        <div className="flex flex-wrap gap-1">
          {staff.map((p) => {
            const on = mentorIds.includes(p.userId);
            return (
              <button
                key={p.userId}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(mentorIds, setMentorIds, p.userId)}
                className={`wb-qd-chip wb-quest-option inline-flex max-w-full items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2 text-xs ${on ? "wb-qd-chip--on" : ""}`}
              >
                <Face person={p} size={20} />
                <span className="max-w-[8rem] truncate">{p.name}</span>
                {on && <Check className="h-3 w-3" />}
              </button>
            );
          })}
        </div>
        {staff.length <= 1 && <p className="wb-soft text-[0.7rem]">ตั้งคนเป็น Staff ได้ที่ปุ่มแชร์ เพื่อให้เป็น mentor ของกลุ่มได้</p>}
      </fieldset>

      <fieldset className="space-y-1.5">
        <legend className="wb-label">นักเรียน ({studentIds.length})</legend>
        <label className="wb-input flex items-center gap-2 px-2.5 py-1.5">
          <Search className="wb-soft h-3.5 w-3.5 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาชื่อ"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </label>
        <ul className="max-h-72 space-y-0.5 overflow-y-auto">
          {shown.map((s) => {
            const on = studentIds.includes(s.userId);
            const other = otherGroup.get(s.userId);
            return (
              <li key={s.userId}>
                <label className="wb-quest-option flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1">
                  <input type="checkbox" checked={on} onChange={() => toggle(studentIds, setStudentIds, s.userId)} className="h-4 w-4 shrink-0" />
                  <Face person={s} size={24} />
                  <span className="min-w-0 flex-1 truncate text-sm">{s.name}</span>
                  {other && <span className="wb-soft max-w-[6rem] shrink-0 truncate text-[0.7rem]">อยู่ {other}</span>}
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <div className="flex items-center gap-2">
        {onDelete && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (window.confirm(`ลบกลุ่ม "${group?.name}"? งานของนักเรียนบนบอร์ดยังอยู่ครบ`)) void run(onDelete);
            }}
            className="wb-soft wb-danger inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs"
          >
            <Trash2 className="h-3.5 w-3.5" /> ลบกลุ่ม
          </button>
        )}
        <span className="flex-1" />
        <button type="button" onClick={onDone} disabled={busy} className="wb-btn wb-btn--quiet wb-btn--sm px-3 text-xs">
          ยกเลิก
        </button>
        <button type="submit" disabled={busy || !name.trim()} className="wb-btn wb-btn--primary wb-btn--sm px-3 text-xs disabled:opacity-40">
          บันทึก
        </button>
      </div>
    </form>
  );
}

function BackTo({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="wb-quest-option wb-soft -ml-1 inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs">
      <ArrowLeft className="h-3.5 w-3.5" /> {label}
    </button>
  );
}
