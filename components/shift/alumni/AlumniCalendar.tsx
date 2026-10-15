"use client";

import { useEffect, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { saveAlumniCalendar } from "@/app/shift/alumni/actions";
import { INK } from "@/components/shift/poster/riso";
import {
  alumniCalendar,
  patchSession,
  removeSession,
  weekdayName,
  type AlumniCalendarDoc,
  type AlumniDefaults,
} from "@/lib/content/shift-alumni";

import { AlumniSessionCard, EditField } from "./AlumniSessionCard";

/**
 * The calendar on /shift/alumni. Everyone sees upcoming and recent sessions;
 * admins get an edit bar that turns each card into fields, and Save writes
 * the whole calendar to shift_alumni_calendar.
 */

const paper = (alpha: string) => `${INK.paper}${alpha}`;

function SectionHeading({ children }: { children: string }) {
  return (
    <h2
      className="mb-4 mt-12 font-kodchasan text-base font-semibold"
      style={{ color: INK.yellow }}
    >
      {children}
    </h2>
  );
}

function EditBar({
  editing,
  dirty,
  pending,
  updatedAt,
  onEdit,
  onCancel,
  onSave,
}: {
  editing: boolean;
  dirty: boolean;
  pending: boolean;
  updatedAt: string | null;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const button = "rounded px-3 py-1 text-sm font-semibold disabled:opacity-50";
  return (
    <div
      className="sticky top-0 z-10 -mx-5 mb-6 flex flex-wrap items-center gap-3 px-5 py-3 backdrop-blur sm:-mx-8 sm:px-8"
      style={{ backgroundColor: `${INK.black}e6`, borderBottom: `1px solid ${paper("1f")}` }}
    >
      <span className="text-sm font-semibold">แอดมิน</span>
      {updatedAt && (
        <span className="text-xs" style={{ color: paper("80") }}>
          แก้ล่าสุด {new Date(updatedAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}
        </span>
      )}
      <div className="ml-auto flex gap-2">
        {!editing && (
          <button type="button" onClick={onEdit} className={`${button} bg-white/10 hover:bg-white/20`}>
            แก้ไข
          </button>
        )}
        {editing && (
          <>
            <button type="button" onClick={onCancel} disabled={pending} className={`${button} bg-white/10 hover:bg-white/20`}>
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={pending || !dirty}
              className={button}
              style={{ backgroundColor: INK.yellow, color: INK.black }}
            >
              {pending ? "กำลังบันทึก…" : "บันทึก"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function DefaultsEditor({
  defaults,
  onChange,
}: {
  defaults: AlumniDefaults;
  onChange: (patch: Partial<AlumniDefaults>) => void;
}) {
  return (
    <section className="rounded-xl p-5" style={{ boxShadow: `inset 0 0 0 1px ${INK.yellow}66` }}>
      <p className="font-kodchasan font-semibold">ค่าตั้งต้นของทุกครั้ง</p>
      <p className="mt-1 text-xs" style={{ color: paper("80") }}>
        นัดซ้ำทุกสัปดาห์ วันเดียวกับครั้งแรก เปลี่ยนวันครั้งแรกเพื่อย้ายวันนัดทั้งชุด เวลาใช้กับทุกครั้งที่ไม่ได้ตั้งเวลาเอง ว่างไว้ หน้าเว็บจะขึ้นว่า เวลาแจ้งในกลุ่ม
      </p>
      <label className="mt-3 block text-xs" style={{ color: paper("80") }}>
        ครั้งแรก ({weekdayName(defaults.firstDate)})
        <input
          type="date"
          value={defaults.firstDate}
          onChange={(e) => e.target.value && onChange({ firstDate: e.target.value })}
          className="mt-1 block rounded border bg-transparent px-2 py-1.5 text-sm [color-scheme:dark]"
          style={{ borderColor: paper("33"), color: INK.paper }}
        />
      </label>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <EditField label="เริ่ม" type="time" value={defaults.startTime} onChange={(startTime) => onChange({ startTime })} />
        <EditField label="เลิก" type="time" value={defaults.endTime} onChange={(endTime) => onChange({ endTime })} />
      </div>
      <div className="mt-3">
        <EditField label="ที่ไหน" value={defaults.place} onChange={(place) => onChange({ place })} maxLength={80} />
      </div>
    </section>
  );
}

function AddEvent({ today, onAdd }: { today: string; onAdd: (date: string) => void }) {
  const [date, setDate] = useState("");
  return (
    <div className="mt-4 flex flex-wrap items-end gap-3">
      <label className="text-xs" style={{ color: paper("80") }}>
        เพิ่มนัดพิเศษวันอื่น
        <input
          type="date"
          min={today}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mt-1 block rounded border bg-transparent px-2 py-1.5 text-sm [color-scheme:dark]"
          style={{ borderColor: paper("33"), color: INK.paper }}
        />
      </label>
      <button
        type="button"
        disabled={!date}
        onClick={() => {
          onAdd(date);
          setDate("");
        }}
        className="inline-flex items-center gap-1 rounded bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/20 disabled:opacity-50"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        เพิ่ม
      </button>
    </div>
  );
}

export function AlumniCalendar({
  initial,
  updatedAt: initialUpdatedAt,
  canEdit,
  today,
}: {
  initial: AlumniCalendarDoc;
  updatedAt: string | null;
  canEdit: boolean;
  /** Bangkok date from the server, so the split matches on hydration. */
  today: string;
}) {
  const [saved, setSaved] = useState(initial);
  const [doc, setDoc] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt);
  const [pending, startTransition] = useTransition();
  const dirty = doc !== saved;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const { upcoming, past } = alumniCalendar(doc, today);
  const next = upcoming.find((s) => !s.cancelled)?.date;

  const save = () =>
    startTransition(async () => {
      const res = await saveAlumniCalendar(doc);
      if (!res.ok) {
        toast.error(`บันทึกไม่ได้: ${res.error}`);
        return;
      }
      setSaved(doc);
      setUpdatedAt(res.updatedAt);
      setEditing(false);
      toast.success("บันทึกแล้ว");
    });

  const cancel = () => {
    if (dirty && !window.confirm("ทิ้งสิ่งที่แก้?")) return;
    setDoc(saved);
    setEditing(false);
  };

  const card = (session: (typeof upcoming)[number], extra: { next?: boolean } = {}) => (
    <AlumniSessionCard
      key={session.date}
      session={session}
      defaults={doc.defaults}
      editing={editing}
      onChange={(patch) => setDoc((d) => patchSession(d, session.date, patch))}
      onRemove={() => setDoc((d) => removeSession(d, session.date))}
      {...extra}
    />
  );

  return (
    <div>
      {canEdit && (
        <EditBar
          editing={editing}
          dirty={dirty}
          pending={pending}
          updatedAt={updatedAt}
          onEdit={() => setEditing(true)}
          onCancel={cancel}
          onSave={save}
        />
      )}

      {editing && (
        <DefaultsEditor
          defaults={doc.defaults}
          onChange={(patch) => setDoc((d) => ({ ...d, defaults: { ...d.defaults, ...patch } }))}
        />
      )}

      <SectionHeading>นัดต่อไป</SectionHeading>
      <div className="grid gap-4">{upcoming.map((session) => card(session, { next: session.date === next }))}</div>
      {editing && (
        <AddEvent
          today={today}
          onAdd={(date) => setDoc((d) => patchSession(d, date, { topic: "นัดพิเศษ" }))}
        />
      )}

      {past.length > 0 && (
        <>
          <SectionHeading>ที่ผ่านมา</SectionHeading>
          <div className="grid gap-4 opacity-70">{past.map((session) => card(session))}</div>
        </>
      )}
    </div>
  );
}
