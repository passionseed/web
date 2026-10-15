"use client";

import { X } from "lucide-react";

import { INPUT } from "@/components/shift/form/ShiftQuestion";
import { INK } from "@/components/shift/poster/riso";
import {
  isWeeklySession,
  type AlumniDefaults,
  type AlumniSession,
} from "@/lib/content/shift-alumni";
import { formatThaiDate } from "@/lib/content/shift-cohort";

/** One session in the admin editor on /shift/alumni. Reading is
 *  NextSessionFeature and AlumniSessionRows. */

const paper = (alpha: string) => `${INK.paper}${alpha}`;

/** What every session is for, until an admin gives it a topic. */
export const DEFAULT_TOPIC = "ทำโปรเจกต์ต่อ แล้วอัปเดตกัน";
export const TIME_TBD = "เวลาแจ้งในกลุ่ม";

type Patch = Partial<Omit<AlumniSession, "date">>;

export function Badge({ children, color }: { children: string; color: string }) {
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-xs font-bold"
      style={{ backgroundColor: color, color: INK.black }}
    >
      {children}
    </span>
  );
}

const fieldStyle = { borderColor: paper("33"), color: INK.paper };

export function EditField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "time";
  maxLength?: number;
}) {
  return (
    <label className="block text-xs" style={{ color: paper("80") }}>
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className={`${INPUT} py-2 [color-scheme:dark]`}
        style={fieldStyle}
      />
    </label>
  );
}

function SessionEdit({
  session,
  defaults,
  onChange,
}: {
  session: AlumniSession;
  defaults: AlumniDefaults;
  onChange: (patch: Patch) => void;
}) {
  return (
    <div className="mt-3 grid gap-3">
      <EditField label="หัวข้อ" value={session.topic} onChange={(topic) => onChange({ topic })} placeholder={DEFAULT_TOPIC} maxLength={80} />
      <div className="grid grid-cols-2 gap-3">
        <EditField label={`เริ่ม (ว่าง = ${defaults.startTime || "ยังไม่ตั้ง"})`} type="time" value={session.startTime} onChange={(startTime) => onChange({ startTime })} />
        <EditField label={`เลิก (ว่าง = ${defaults.endTime || "ยังไม่ตั้ง"})`} type="time" value={session.endTime} onChange={(endTime) => onChange({ endTime })} />
      </div>
      <EditField label="ที่ไหน" value={session.place} onChange={(place) => onChange({ place })} placeholder={defaults.place} maxLength={80} />
      <EditField label="co-host (ชื่อเล่นเท่านั้น ขึ้นหน้าเว็บ)" value={session.host} onChange={(host) => onChange({ host })} maxLength={40} />
      <EditField label="โน้ต" value={session.note} onChange={(note) => onChange({ note })} maxLength={300} />
      <label className="flex items-center gap-2 text-sm" style={{ color: paper("b3") }}>
        <input
          type="checkbox"
          checked={session.cancelled}
          onChange={(e) => onChange({ cancelled: e.target.checked })}
          className="h-4 w-4 accent-[#ff6c2f]"
        />
        งดครั้งนี้
      </label>
    </div>
  );
}

export function AlumniSessionCard({
  session,
  defaults,
  onChange,
  onRemove,
}: {
  session: AlumniSession;
  defaults: AlumniDefaults;
  onChange: (patch: Patch) => void;
  onRemove: () => void;
}) {
  const weekly = isWeeklySession(session.date, defaults.firstDate);
  return (
    <article className="rounded-xl p-5" style={{ backgroundColor: paper("0a"), boxShadow: `inset 0 0 0 1px ${paper("1f")}` }}>
      <div className="flex items-center gap-3">
        <p className="font-kodchasan text-lg font-bold">{formatThaiDate(session.date)}</p>
        {session.date === defaults.firstDate && <Badge color={INK.yellow}>ครั้งแรก</Badge>}
        {!weekly && <Badge color={INK.orange}>นัดพิเศษ</Badge>}
        <button
          type="button"
          onClick={onRemove}
          className="ml-auto inline-flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-white/10"
          style={{ color: paper("99") }}
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          {weekly ? "ล้าง" : "ลบนัดนี้"}
        </button>
      </div>
      <SessionEdit session={session} defaults={defaults} onChange={onChange} />
    </article>
  );
}
