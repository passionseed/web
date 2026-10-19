import { HABIT_TITLES, missionTitle, type Bilingual } from "@/lib/shift-round/certificate/missions";

import { hhmm, roundDate, roundDay } from "./format";
import type { EvidenceType, MissionConfig, MissionCounts, ShiftRound } from "./types";

/**
 * The SHIFT steps of one student, as the web admin shows them (v2 spec 3):
 * missions 1..n from the round config, then step n+1 "post every day"
 * (days/need) and step n+2 "join every session" (attended/held). With the
 * SHIFT default config that is the 9 steps. Pure: the clock is an argument.
 */

/** What the step and check rules need to know about a round. */
export type RoundClock = Pick<
  ShiftRound,
  "starts_at" | "closes_at" | "duration_days" | "session_days" | "session_start" | "session_end"
> &
  Partial<Pick<ShiftRound, "extended_days">>;

/** Last round day, extensions included (the server's `effective_days`). */
export function lastRoundDay(round: Pick<RoundClock, "duration_days" | "extended_days">): number {
  return round.duration_days + (round.extended_days ?? 0);
}

/** Bangkok wall-clock instant on round day `day` (`HH:MM`). */
function atRoundDay(round: Pick<ShiftRound, "starts_at">, day: number, time: string): Date {
  return new Date(`${roundDate(round, day)}T${hhmm(time) ?? "00:00"}:00+07:00`);
}

export function sessionStartAt(round: Pick<RoundClock, "starts_at" | "session_start">, day: number): Date {
  return atRoundDay(round, day, round.session_start);
}

export function sessionEndAt(round: Pick<RoundClock, "starts_at" | "session_end">, day: number): Date {
  return atRoundDay(round, day, round.session_end);
}

/** 00:00 Bangkok on round day `day`. */
export function dayStartAt(round: Pick<RoundClock, "starts_at">, day: number): Date {
  return atRoundDay(round, day, "00:00");
}

export function isClosed(round: Pick<RoundClock, "closes_at">, now: Date): boolean {
  return now.getTime() >= Date.parse(round.closes_at);
}

export type StepKind = "mission" | "daily" | "sessions";
/** done; partial = started and still possible; todo = nothing yet; missed = behind and needs action. */
export type StepState = "done" | "partial" | "todo" | "missed";

export interface StepCell {
  /** 1-based step number. */
  n: number;
  /** Mission key, or "daily" / "sessions". */
  key: string;
  kind: StepKind;
  title: Bilingual;
  state: StepState;
  done: boolean;
  have: number;
  need: number;
  /** Cell text: "✓", "2/3", days "3/7", sessions "attended/held". */
  text: string;
  /** Evidence types of the mission (empty for the habits). */
  types: EvidenceType[];
}

export interface StepClock {
  round: RoundClock;
  now: Date;
}

function dailyState(counts: NonNullable<MissionCounts["daily"]>, clock?: StepClock): StepState {
  const { days, need, today_logged } = counts;
  if (days >= need) return "done";
  if (clock) {
    // `need` is the last round day (one log per day 1..need counts, v2 spec 2.3). Round days
    // still ahead in which a log can count, today included until it has one:
    const d = roundDay(clock.round, clock.now);
    const remaining = d < 1 ? need : d > need ? 0 : need - d + (today_logged ? 0 : 1);
    if (days + remaining < need) return "missed";
  }
  return days > 0 ? "partial" : "todo";
}

function sessionsState(s: NonNullable<MissionCounts["sessions"]>): StepState {
  if (s.total === 0 || s.attended >= s.total) return "done";
  if (s.attended < s.held) return "missed";
  return s.attended > 0 ? "partial" : "todo";
}

/** Missions in config order, then the daily and session habits. */
export function studentSteps(counts: MissionCounts, clock?: StepClock): StepCell[] {
  const missions = [...counts.missions].sort((a, b) => a.n - b.n);
  const cells: StepCell[] = missions.map((m, i) => {
    const have = m.parts.reduce((sum, p) => sum + Math.min(p.have, p.need), 0);
    const need = m.parts.reduce((sum, p) => sum + p.need, 0);
    const state: StepState = m.complete ? "done" : have > 0 ? "partial" : "todo";
    return {
      n: i + 1,
      key: m.key,
      kind: "mission",
      title: missionTitle(m),
      state,
      done: m.complete,
      have,
      need,
      text: m.complete ? "✓" : `${have}/${need}`,
      types: m.parts.map((p) => p.type),
    };
  });

  const daily = counts.daily;
  const dState = daily ? dailyState(daily, clock) : "todo";
  cells.push({
    n: cells.length + 1,
    key: "daily",
    kind: "daily",
    title: HABIT_TITLES.daily,
    state: dState,
    done: dState === "done",
    have: daily?.days ?? 0,
    need: daily?.need ?? 0,
    text: daily ? `${daily.days}/${daily.need}` : "—",
    types: [],
  });

  const sessions = counts.sessions;
  const sState = sessions ? sessionsState(sessions) : "todo";
  cells.push({
    n: cells.length + 1,
    key: "sessions",
    kind: "sessions",
    title: HABIT_TITLES.sessions,
    state: sState,
    done: sState === "done",
    have: sessions?.attended ?? 0,
    need: sessions?.total ?? 0,
    text: !sessions ? "—" : sessions.total === 0 ? "—" : `${sessions.attended}/${sessions.held}`,
    types: [],
  });
  return cells;
}

/** Zero counts for a missions config: the step list (titles, numbers) before anyone logs. */
export function emptyCountsFor(config: MissionConfig[]): MissionCounts {
  return {
    missions: config.map((m, i) => ({
      key: m.key,
      n: i + 1,
      complete: false,
      title_th: m.title_th ?? null,
      title_en: m.title_en ?? null,
      parts: m.parts.map((p) => ({ type: p.type, have: 0, need: p.need })),
    })),
    missions_complete: 0,
    missions_total: config.length,
    people_talked_to: 0,
    eligible: false,
    daily: null,
    sessions: null,
  };
}

export function stepsDone(cells: StepCell[]): number {
  return cells.filter((c) => c.done).length;
}

/** Sort key for "sorted by risk": open flags first, then missed habits, fewest steps done, longest quiet. */
export interface RiskInfo {
  flags: number;
  missed: number;
  done: number;
  quietDays: number;
  handle: string;
}

export function compareRisk(a: RiskInfo, b: RiskInfo): number {
  return (
    b.flags - a.flags ||
    b.missed - a.missed ||
    a.done - b.done ||
    b.quietDays - a.quietDays ||
    a.handle.localeCompare(b.handle, "th")
  );
}

// ---- CSV export (handles only: no names, emails or user ids) ----------------

export interface StepsCsvRow {
  handle: string;
  squad_name: string | null;
  steps: StepCell[];
  counts: MissionCounts;
}

/** Quotes when needed and defuses spreadsheet formulas (handles are student-written). */
export function csvCell(value: string | number | boolean | null | undefined): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** One row per student; every step as 1/0 plus the raw habit numbers. UTF-8 BOM for Excel. */
export function stepsCsv(rows: StepsCsvRow[]): string {
  const template = rows.reduce<StepCell[]>((longest, r) => (r.steps.length > longest.length ? r.steps : longest), []);
  const header = [
    "handle",
    "squad",
    ...template.map((s) => `step_${s.n}_${s.key}`),
    "steps_done",
    "steps_total",
    "missions_complete",
    "missions_total",
    "daily_days",
    "daily_need",
    "sessions_attended",
    "sessions_held",
    "sessions_total",
    "eligible",
  ];
  const lines = rows.map((r) => {
    const byN = new Map(r.steps.map((s) => [s.n, s]));
    return [
      r.handle,
      r.squad_name ?? "",
      ...template.map((s) => (byN.get(s.n)?.done ? 1 : 0)),
      stepsDone(r.steps),
      r.steps.length,
      r.counts.missions_complete,
      r.counts.missions_total ?? r.counts.missions.length,
      r.counts.daily?.days ?? "",
      r.counts.daily?.need ?? "",
      r.counts.sessions?.attended ?? "",
      r.counts.sessions?.held ?? "",
      r.counts.sessions?.total ?? "",
      r.counts.eligible ? 1 : 0,
    ]
      .map(csvCell)
      .join(",");
  });
  return `﻿${[header.map(csvCell).join(","), ...lines].join("\r\n")}\r\n`;
}
