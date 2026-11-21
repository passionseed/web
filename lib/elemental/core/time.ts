/**
 * Bangkok time for Elemental: days, wall-clock times and the per-guild
 * schedule (elemental_settings.schedule).
 *
 * Bangkok is UTC+7 all year (no daylight saving), so this is plain arithmetic
 * with no Intl or time-zone data: the same answer on a laptop, in jest and in
 * the bot container. Pure and dependency-free: the bot imports this file.
 */

export const BANGKOK_OFFSET_MINUTES = 7 * 60;
const OFFSET_MS = BANGKOK_OFFSET_MINUTES * 60_000;
const DAY_MS = 24 * 60 * 60_000;

/** A Bangkok calendar day, "YYYY-MM-DD". */
export type BangkokDay = string;

/** A Bangkok wall-clock time, "HH:MM" (24-hour). */
export type BangkokTime = string;

/** One day of elemental_settings.schedule; every time is Bangkok "HH:MM". */
export interface ScheduleDay {
  opening_at?: BangkokTime;
  call_at: BangkokTime;
  card_at: BangkokTime;
}

/** elemental_settings.schedule: Bangkok day "YYYY-MM-DD" to that day's posts. */
export type ElementalSchedule = Record<BangkokDay, ScheduleDay>;

export type SchedulePost = keyof ScheduleDay;

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function toMs(at: Date | number): number {
  const ms = typeof at === "number" ? at : at.getTime();
  if (!Number.isFinite(ms)) throw new RangeError("elemental time: invalid instant");
  return ms;
}

function pad(n: number, width = 2): string {
  return String(n).padStart(width, "0");
}

/** True for a real calendar day written "YYYY-MM-DD" (so "2026-02-30" is false). */
export function isBangkokDay(value: unknown): value is BangkokDay {
  if (typeof value !== "string") return false;
  const m = DAY_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const probe = new Date(Date.UTC(y, mo - 1, d));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === mo - 1 && probe.getUTCDate() === d;
}

/** True for "HH:MM" from "00:00" to "23:59". */
export function isBangkokTime(value: unknown): value is BangkokTime {
  return typeof value === "string" && TIME_RE.test(value);
}

/** The Bangkok calendar day of an instant: 2026-12-04T16:59Z is "2026-12-04", 17:01Z is "2026-12-05". */
export function bangkokDay(at: Date | number = Date.now()): BangkokDay {
  const shifted = new Date(toMs(at) + OFFSET_MS);
  return `${pad(shifted.getUTCFullYear(), 4)}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

/** The Bangkok wall-clock time of an instant, "HH:MM". */
export function bangkokTime(at: Date | number = Date.now()): BangkokTime {
  const shifted = new Date(toMs(at) + OFFSET_MS);
  return `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`;
}

/** The instant of a Bangkok day and time: atBangkok("2026-12-04", "20:30") is 2026-12-04T13:30:00Z. Throws on a malformed day or time. */
export function atBangkok(day: BangkokDay, time: BangkokTime): Date {
  if (!isBangkokDay(day)) throw new RangeError(`elemental time: bad day "${day}"`);
  const t = TIME_RE.exec(time);
  if (!t) throw new RangeError(`elemental time: bad time "${time}"`);
  const [y, mo, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d, Number(t[1]), Number(t[2])) - OFFSET_MS);
}

/** The Bangkok day n days after (or before, for negative n) the given one. */
export function addBangkokDays(day: BangkokDay, n: number): BangkokDay {
  if (!isBangkokDay(day)) throw new RangeError(`elemental time: bad day "${day}"`);
  const [y, mo, d] = day.split("-").map(Number);
  return bangkokDay(Date.UTC(y, mo - 1, d) - OFFSET_MS + n * DAY_MS);
}

/** That day's entry in a schedule read from the database, or null when there is none or it is not an object. */
export function scheduleDay(
  schedule: ElementalSchedule | null | undefined,
  day: BangkokDay,
): ScheduleDay | null {
  if (!schedule || typeof schedule !== "object") return null;
  if (!Object.prototype.hasOwnProperty.call(schedule, day)) return null;
  const entry = (schedule as Record<string, unknown>)[day];
  return entry && typeof entry === "object" && !Array.isArray(entry) ? (entry as ScheduleDay) : null;
}

/** True when the Bangkok day of `at` (default now) has an entry in the schedule. */
export function isEventDay(
  schedule: ElementalSchedule | null | undefined,
  at: Date | number = Date.now(),
): boolean {
  return scheduleDay(schedule, bangkokDay(at)) !== null;
}

/**
 * When a scheduled post is due: the instant of that day's opening_at, call_at
 * or card_at, or null when the day or the time is missing or malformed.
 */
export function scheduledAt(
  schedule: ElementalSchedule | null | undefined,
  day: BangkokDay,
  post: SchedulePost,
): Date | null {
  const entry = scheduleDay(schedule, day);
  const time = entry?.[post];
  return isBangkokDay(day) && isBangkokTime(time) ? atBangkok(day, time) : null;
}
