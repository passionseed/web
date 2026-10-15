import { z } from "zod";

import { bangkokToday, formatThaiDate } from "@/lib/content/shift-cohort";

/**
 * SHIFT alumni calendar (/shift/alumni). The weekly session repeats every 7
 * days from a first date, online on Discord (Ref: company-brain alumni.md).
 * It moved from Friday to Saturday before it started: first session Sat
 * 17 October 2026, 19:00–21:00. Admins can move the first date (and so the
 * weekday), fill in each session (topic, time, co-host), cancel one, or add a
 * one-off event. The whole calendar is one JSON document in the
 * shift_alumni_calendar table.
 */

/** Upcoming sessions listed, so students can plan a month or so ahead. */
export const ALUMNI_WEEKS_AHEAD = 6;
/** Past sessions kept on the page, newest first. */
export const ALUMNI_PAST_SHOWN = 4;
export const ALUMNI_PAGE_URL = "https://passionseed.org/shift/alumni";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const time = z.union([z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), z.literal("")]);
const text = (max: number) => z.string().trim().max(max);

const timeRangeOk = ({ startTime, endTime }: { startTime: string; endTime: string }) =>
  !startTime || !endTime || endTime > startTime;

const sessionSchema = z
  .object({
    date: isoDate,
    topic: text(80).default(""),
    startTime: time.default(""),
    endTime: time.default(""),
    place: text(80).default(""),
    /** Co-host nickname. Shown publicly, so nickname only. */
    host: text(40).default(""),
    note: text(300).default(""),
    cancelled: z.boolean().default(false),
  })
  .refine(timeRangeOk);

const FIRST_DATE = "2026-10-17";

const docSchema = z.object({
  defaults: z
    .object({
      /** The weekly series starts here and repeats on the same weekday. */
      firstDate: isoDate.default(FIRST_DATE),
      startTime: time.default(""),
      endTime: time.default(""),
      place: text(80).default(""),
    })
    .refine(timeRangeOk),
  sessions: z.array(sessionSchema).max(200).default([]),
});

export type AlumniSession = z.output<typeof sessionSchema>;
export type AlumniCalendarDoc = z.output<typeof docSchema>;
export type AlumniDefaults = AlumniCalendarDoc["defaults"];

export function emptySession(date: string): AlumniSession {
  return { date, topic: "", startTime: "", endTime: "", place: "", host: "", note: "", cancelled: false };
}

export const ALUMNI_DEFAULT_DOC: AlumniCalendarDoc = {
  defaults: { firstDate: FIRST_DATE, startTime: "19:00", endTime: "21:00", place: "ออนไลน์ใน Discord" },
  sessions: [
    // Announced in the groups before the move, so it stays on the page as cancelled.
    {
      ...emptySession("2026-10-16"),
      topic: "นัดเดิมวันศุกร์",
      note: "ย้ายเป็นวันเสาร์แล้ว เจอกันเสาร์ 17 ต.ค. 19:00 น.",
      cancelled: true,
    },
  ],
};

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const WEEKDAY_NAMES = ["วันอาทิตย์", "วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์"];

const weekdayIndex = (iso: string) => new Date(`${iso}T00:00:00Z`).getUTCDay();

/** "sat": matches the day keys of the feedback form's day picker. */
export const weekdayKey = (iso: string) => WEEKDAY_KEYS[weekdayIndex(iso)];

/** "วันเสาร์" */
export const weekdayName = (iso: string) => WEEKDAY_NAMES[weekdayIndex(iso)];

/** Valid doc with one entry per date (the last one wins), or null. */
export function parseAlumniCalendarDoc(raw: unknown): AlumniCalendarDoc | null {
  const parsed = docSchema.safeParse(raw);
  if (!parsed.success) return null;
  const byDate = new Map(parsed.data.sessions.map((s) => [s.date, s]));
  return { ...parsed.data, sessions: sortByDate([...byDate.values()]) };
}

export function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

const sortByDate = (sessions: AlumniSession[]) =>
  [...sessions].sort((a, b) => a.date.localeCompare(b.date));

/** The weekly series from `firstDate` until `count` dates fall on or after `today`. */
function weeklyDates(firstDate: string, today: string, count: number): string[] {
  const dates: string[] = [];
  let upcoming = 0;
  for (let date = firstDate; upcoming < count; date = addDays(date, 7)) {
    dates.push(date);
    if (date >= today) upcoming += 1;
  }
  return dates;
}

/** The weekly series merged with what admins saved, split around today. */
export function alumniCalendar(
  doc: AlumniCalendarDoc,
  today: string = bangkokToday(),
): { upcoming: AlumniSession[]; past: AlumniSession[] } {
  const series = weeklyDates(doc.defaults.firstDate, today, ALUMNI_WEEKS_AHEAD);
  const byDate = new Map(series.map((d) => [d, emptySession(d)]));
  for (const session of doc.sessions) byDate.set(session.date, session);
  const all = sortByDate([...byDate.values()]);
  return {
    upcoming: all.filter((s) => s.date >= today),
    past: all.filter((s) => s.date < today).reverse().slice(0, ALUMNI_PAST_SHOWN),
  };
}

const isBlank = (s: AlumniSession) =>
  !s.cancelled && !s.topic && !s.startTime && !s.endTime && !s.place && !s.host && !s.note;

/** Drops sessions with nothing filled in, so the saved doc only holds edits. */
export function compactAlumniDoc(doc: AlumniCalendarDoc): AlumniCalendarDoc {
  return { ...doc, sessions: sortByDate(doc.sessions.filter((s) => !isBlank(s))) };
}

/** A session's time and place, falling back to the calendar defaults. */
export function sessionDetails(session: AlumniSession, defaults: AlumniDefaults) {
  const custom = Boolean(session.startTime);
  return {
    startTime: custom ? session.startTime : defaults.startTime,
    endTime: custom ? session.endTime : defaults.endTime,
    place: session.place || defaults.place,
  };
}

/** "19:00–21:00 น.", or null before a time is set. */
export function timeRangeLabel(startTime: string, endTime: string): string | null {
  if (!startTime) return null;
  return endTime ? `${startTime}–${endTime} น.` : `${startTime} น.`;
}

/** Google Calendar "add event" link, once the session has a start and end time. */
export function googleCalendarUrl(session: AlumniSession, defaults: AlumniDefaults): string | null {
  const { startTime, endTime, place } = sessionDetails(session, defaults);
  if (session.cancelled || !startTime || !endTime) return null;
  const stamp = (t: string) => `${session.date.replaceAll("-", "")}T${t.replace(":", "")}00`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `SHIFT Alumni${session.topic ? `: ${session.topic}` : ""}`,
    dates: `${stamp(startTime)}/${stamp(endTime)}`,
    ctz: "Asia/Bangkok",
    details: `session ศิษย์เก่า SHIFT ลิงก์เข้าห้องอยู่ในกลุ่มของรุ่น\n${ALUMNI_PAGE_URL}`,
    location: place,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** True for dates in the generated weekly series. */
export function isWeeklySession(date: string, firstDate: string): boolean {
  if (date < firstDate) return false;
  const days = (Date.parse(date) - Date.parse(firstDate)) / 86_400_000;
  return days % 7 === 0;
}

/** Applies an edit to one session, adding it to the doc if it was only generated. */
export function patchSession(
  doc: AlumniCalendarDoc,
  date: string,
  patch: Partial<Omit<AlumniSession, "date">>,
): AlumniCalendarDoc {
  const current = doc.sessions.find((s) => s.date === date) ?? emptySession(date);
  const rest = doc.sessions.filter((s) => s.date !== date);
  return { ...doc, sessions: sortByDate([...rest, { ...current, ...patch }]) };
}

/** Clears a weekly session back to the defaults, or deletes a one-off event. */
export function removeSession(doc: AlumniCalendarDoc, date: string): AlumniCalendarDoc {
  return { ...doc, sessions: doc.sessions.filter((s) => s.date !== date) };
}

/** "เสาร์ 17 ต.ค.": the headline date for a session. */
export function longThaiDate(iso: string): string {
  return `${weekdayName(iso).replace(/^วัน/, "")} ${formatThaiDate(iso, false)}`;
}

/** A topic written as "a · b · c" is the session's run of parts. One part,
 *  or none, means it is just a topic. */
export function sessionSteps(topic: string): string[] {
  return topic
    .split("·")
    .map((part) => part.trim())
    .filter(Boolean);
}
