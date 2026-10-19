import { roundDate } from "./format";
import { sessionEndAt, sessionStartAt, type RoundClock } from "./steps";
import type { AdminStepsRow, AttendanceStatus } from "./types";

/**
 * Session attendance (v2 spec 2.4, 3). A cell cycles unset -> present ->
 * makeup -> absent -> unset; null means "not marked" and deletes the row.
 */

export type Mark = AttendanceStatus | null;

export const ATTENDANCE_CYCLE: readonly Mark[] = [null, "present", "makeup", "absent"];

export function nextAttendance(current: Mark): Mark {
  const i = ATTENDANCE_CYCLE.indexOf(current ?? null);
  return ATTENDANCE_CYCLE[(i + 1) % ATTENDANCE_CYCLE.length];
}

export const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = {
  present: "มา",
  makeup: "ชดเชย",
  absent: "ขาด",
};

export function markLabel(mark: Mark): string {
  return mark ? ATTENDANCE_LABEL[mark] : "ยังไม่เช็ก";
}

export const cellKey = (entryId: string, day: number) => `${entryId}:${day}`;

/** Marks keyed by `cellKey`; unset cells are absent from the map. */
export function marksFromRows(rows: Pick<AdminStepsRow, "entry_id" | "attendance">[]): Record<string, AttendanceStatus> {
  const marks: Record<string, AttendanceStatus> = {};
  for (const row of rows) for (const a of row.attendance) marks[cellKey(row.entry_id, a.day)] = a.status;
  return marks;
}

export type SessionPhase = "done" | "live" | "upcoming";

export interface SessionColumn {
  day: number;
  /** ICT date, YYYY-MM-DD */
  date: string;
  phase: SessionPhase;
}

/** One column per session day, in day order, with where `now` is relative to it. */
export function sessionColumns(round: RoundClock, now: Date): SessionColumn[] {
  return [...new Set(round.session_days)]
    .filter((d) => Number.isInteger(d) && d >= 1)
    .sort((a, b) => a - b)
    .map((day) => {
      const t = now.getTime();
      const phase: SessionPhase =
        t >= sessionEndAt(round, day).getTime() ? "done" : t >= sessionStartAt(round, day).getTime() ? "live" : "upcoming";
      return { day, date: roundDate(round, day), phase };
    });
}

/** "Mark all present" for a day: every student not marked yet becomes present. Marked cells stay. */
export function allPresentWrites(
  entryIds: string[],
  day: number,
  marks: Record<string, Mark | undefined>,
): { entry_id: string; status: AttendanceStatus }[] {
  return entryIds.filter((id) => !marks[cellKey(id, day)]).map((id) => ({ entry_id: id, status: "present" }));
}

export function tallyDay(entryIds: string[], day: number, marks: Record<string, Mark | undefined>) {
  const tally = { present: 0, makeup: 0, absent: 0, unset: 0 };
  for (const id of entryIds) {
    const mark = marks[cellKey(id, day)];
    tally[mark ?? "unset"] += 1;
  }
  return tally;
}
