"use client";

import type { ReactNode } from "react";
import { CalendarPlus, X } from "lucide-react";

import { INPUT } from "@/components/shift/form/ShiftQuestion";
import { INK } from "@/components/shift/poster/riso";
import {
  googleCalendarUrl,
  isWeeklySession,
  sessionDetails,
  timeRangeLabel,
  type AlumniDefaults,
  type AlumniSession,
} from "@/lib/content/shift-alumni";
import { formatThaiDate } from "@/lib/content/shift-cohort";

/** One session on /shift/alumni: a card to read, or fields to edit. */

const paper = (alpha: string) => `${INK.paper}${alpha}`;

/** What every session is for, until an admin gives it a topic. */
const DEFAULT_TOPIC = "ทำโปรเจกต์ต่อ แล้วอัปเดตกัน";
const TIME_TBD = "เวลาแจ้งในกลุ่ม";

type Patch = Partial<Omit<AlumniSession, "date">>;

function Badge({ children, color }: { children: string; color: string }) {
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-xs font-bold"
      style={{ backgroundColor: color, color: INK.black }}
    >
      {children}
    </span>
  );
}

function SessionBadge({ session, next, first }: { session: AlumniSession; next: boolean; first: boolean }) {
  if (session.cancelled) return <Badge color={paper("80")}>งดครั้งนี้</Badge>;
  if (first) return <Badge color={INK.yellow}>ครั้งแรก</Badge>;
  if (next) return <Badge color={INK.yellow}>ครั้งถัดไป</Badge>;
  return null;
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-16 shrink-0" style={{ color: paper("80") }}>
        {label}
      </dt>
      <dd style={{ color: paper("cc") }}>{value}</dd>
    </div>
  );
}

function SessionView({
  session,
  defaults,
  next,
}: {
  session: AlumniSession;
  defaults: AlumniDefaults;
  next: boolean;
}) {
  const { startTime, endTime, place } = sessionDetails(session, defaults);
  const calendarUrl = googleCalendarUrl(session, defaults);
  // Later cards only repeat time and place when they differ from the usual.
  const showTime = next || Boolean(session.startTime);
  const showPlace = Boolean(place) && (next || Boolean(session.place));
  return (
    <>
      <p
        className={`mt-1 font-kodchasan font-semibold leading-snug ${next ? "text-lg" : "text-base"} ${session.cancelled ? "line-through" : ""}`}
        style={session.cancelled ? { color: paper("80") } : undefined}
      >
        {session.topic || DEFAULT_TOPIC}
      </p>
      {!session.cancelled && (showTime || showPlace || session.host) && (
        <dl className="mt-3 grid gap-1.5 text-sm">
          {showTime && <Detail label="เวลา" value={timeRangeLabel(startTime, endTime) ?? TIME_TBD} />}
          {showPlace && <Detail label="ที่ไหน" value={place} />}
          {session.host && <Detail label="co-host" value={session.host} />}
        </dl>
      )}
      {session.note && (
        <p className="mt-3 text-sm leading-relaxed" style={{ color: paper("b3") }}>
          {session.note}
        </p>
      )}
      {calendarUrl && next && (
        <a
          href={calendarUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4"
          style={{ color: INK.yellow }}
        >
          <CalendarPlus className="h-4 w-4" aria-hidden="true" />
          เพิ่มลง Google Calendar
        </a>
      )}
    </>
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
  next = false,
  editing,
  onChange,
  onRemove,
  footer,
}: {
  session: AlumniSession;
  defaults: AlumniDefaults;
  /** The first upcoming session that is on: highlighted, with full details
   *  and the calendar link. */
  next?: boolean;
  editing: boolean;
  onChange: (patch: Patch) => void;
  onRemove: () => void;
  /** Shown under the details when reading, e.g. the RSVP button. */
  footer?: ReactNode;
}) {
  const weekly = isWeeklySession(session.date, defaults.firstDate);
  return (
    <article
      className={`rounded-xl ${next || editing ? "p-5" : "px-5 py-4"}`}
      style={{
        backgroundColor: next ? paper("12") : paper("0a"),
        boxShadow: `inset 0 0 0 1px ${next ? paper("40") : paper("1f")}`,
      }}
    >
      <div className="flex items-center gap-3">
        <p className={`font-kodchasan font-bold ${next ? "text-xl" : "text-lg"}`}>{formatThaiDate(session.date)}</p>
        <SessionBadge session={session} next={next} first={session.date === defaults.firstDate} />
        {!weekly && !editing && !session.cancelled && <Badge color={INK.orange}>นัดพิเศษ</Badge>}
        {editing && (
          <button
            type="button"
            onClick={onRemove}
            className="ml-auto inline-flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-white/10"
            style={{ color: paper("99") }}
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            {weekly ? "ล้าง" : "ลบนัดนี้"}
          </button>
        )}
      </div>
      {editing ? (
        <SessionEdit session={session} defaults={defaults} onChange={onChange} />
      ) : (
        <>
          <SessionView session={session} defaults={defaults} next={next} />
          {footer}
        </>
      )}
    </article>
  );
}
