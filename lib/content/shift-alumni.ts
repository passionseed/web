import { z } from "zod";

import { bangkokToday } from "@/lib/content/shift-cohort";

/**
 * SHIFT alumni calendar (/shift/alumni). The weekly session runs every Friday,
 * online on Discord, from 16 October 2026 (Ref: company-brain alumni.md).
 * Fridays are generated here; admins fill in each one (topic, time, co-host),
 * cancel it, or add a one-off event on another day. The whole calendar is one
 * JSON document in the shift_alumni_calendar table.
 */

export const ALUMNI_FIRST_SESSION = "2026-10-16";
/** Upcoming Fridays listed, so students can plan a month or so ahead. */
export const ALUMNI_WEEKS_AHEAD = 6;
/** Past sessions kept on the page, newest first. */
export const ALUMNI_PAST_SHOWN = 4;
export const ALUMNI_PAGE_URL = "https://passionseed.org/shift/alumni";

const time = z.union([z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), z.literal("")]);
const text = (max: number) => z.string().trim().max(max);

const timeRangeOk = ({ startTime, endTime }: { startTime: string; endTime: string }) =>
  !startTime || !endTime || endTime > startTime;

const sessionSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
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

const docSchema = z.object({
  defaults: z
    .object({
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

export const ALUMNI_DEFAULT_DOC: AlumniCalendarDoc = {
  defaults: { startTime: "", endTime: "", place: "ออนไลน์ใน Discord" },
  sessions: [],
};

export function emptySession(date: string): AlumniSession {
  return { date, topic: "", startTime: "", endTime: "", place: "", host: "", note: "", cancelled: false };
}

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

/** Fridays from the first session until `count` of them fall on or after `today`. */
function weeklyFridays(today: string, count: number): string[] {
  const dates: string[] = [];
  let upcoming = 0;
  for (let date = ALUMNI_FIRST_SESSION; upcoming < count; date = addDays(date, 7)) {
    dates.push(date);
    if (date >= today) upcoming += 1;
  }
  return dates;
}

/** The Friday series merged with what admins saved, split around today. */
export function alumniCalendar(
  doc: AlumniCalendarDoc,
  today: string = bangkokToday(),
): { upcoming: AlumniSession[]; past: AlumniSession[] } {
  const byDate = new Map(weeklyFridays(today, ALUMNI_WEEKS_AHEAD).map((d) => [d, emptySession(d)]));
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

/** True for dates in the generated Friday series. */
export function isWeeklySession(date: string): boolean {
  if (date < ALUMNI_FIRST_SESSION) return false;
  const days = (Date.parse(date) - Date.parse(ALUMNI_FIRST_SESSION)) / 86_400_000;
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

/** Clears a Friday back to the defaults, or deletes a one-off event. */
export function removeSession(doc: AlumniCalendarDoc, date: string): AlumniCalendarDoc {
  return { ...doc, sessions: doc.sessions.filter((s) => s.date !== date) };
}
