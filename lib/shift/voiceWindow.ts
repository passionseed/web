/**
 * Which SHIFT rounds and time windows voice participation is measured over.
 * Shared by the Discord bot (bot/src/shift) and /admin/shift/voice.
 */

import { SHIFT_COHORTS, bangkokToday, type ShiftCohort } from "@/lib/content/shift-cohort";

/** The day the bot started recording. Earlier rounds have no voice data. */
export const VOICE_TRACKING_SINCE = "2026-11-09";

/**
 * Rounds whose 7 days include today (Bangkok). Not cohortStatus(): a round
 * whose applications close on Day 1 reads "open" that day, and Day 1 is a
 * session.
 */
export function roundsInSession(today: string = bangkokToday()): Set<string> {
  return new Set(
    SHIFT_COHORTS.filter((c) => !c.completed && c.startDate <= today && today <= c.endDate).map((c) => c.name),
  );
}

/** Rounds that can have voice data, oldest first. */
export function trackedCohorts(): ShiftCohort[] {
  return SHIFT_COHORTS.filter((c) => c.endDate >= VOICE_TRACKING_SINCE);
}

export type VoiceWindowMode = "session" | "day" | "round";

export interface VoiceWindow {
  from: Date;
  to: Date;
}

/** "19:00–21:00" to its two times. Falls back to 19:00–21:00, the usual slot. */
export function parseSessionTime(sessionTime: string): { start: string; end: string } {
  const match = /(\d{1,2}):(\d{2})\D+(\d{1,2}):(\d{2})/.exec(sessionTime);
  if (!match) return { start: "19:00", end: "21:00" };
  const pad = (h: string) => h.padStart(2, "0");
  return { start: `${pad(match[1])}:${match[2]}`, end: `${pad(match[3])}:${match[4]}` };
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Bangkok wall clock to an instant. Bangkok has no DST, so always +07:00. */
function bangkok(day: string, time = "00:00"): Date {
  return new Date(`${day}T${time}:00+07:00`);
}

export function voiceWindow(cohort: ShiftCohort, day: string, mode: VoiceWindowMode): VoiceWindow {
  if (mode === "round") {
    return { from: bangkok(cohort.startDate), to: bangkok(addDays(cohort.endDate, 1)) };
  }
  if (mode === "day") {
    return { from: bangkok(day), to: bangkok(addDays(day, 1)) };
  }
  const { start, end } = parseSessionTime(cohort.sessionTime);
  return { from: bangkok(day, start), to: bangkok(day, end) };
}

/** The round's days, for the day picker. */
export function cohortDays(cohort: ShiftCohort): string[] {
  if (cohort.schedule.length > 0) return cohort.schedule.map((d) => d.date);
  const days: string[] = [];
  for (let d = cohort.startDate; d <= cohort.endDate; d = addDays(d, 1)) days.push(d);
  return days;
}

/** Today when the round is running, else its last day so far, else Day 1. */
export function defaultVoiceDay(cohort: ShiftCohort, today: string = bangkokToday()): string {
  const days = cohortDays(cohort);
  if (days.includes(today)) return today;
  const past = days.filter((d) => d <= today);
  return past.at(-1) ?? days[0] ?? cohort.startDate;
}
