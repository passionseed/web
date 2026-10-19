import { roundDay } from "./format";
import {
  dayStartAt,
  isClosed,
  lastRoundDay,
  sessionEndAt,
  studentSteps,
  type RoundClock,
  type StepCell,
} from "./steps";
import type { AdminStepsRow, EvidenceType, MissionCounts } from "./types";

/**
 * "ต้องดูแล": the curriculum's mentor checks, automated (v2 spec 3). Pure
 * functions of a steps row, the round and a clock, all in Bangkok days:
 *
 * - after the first session (day 1 in SHIFT) with no `ideas` log: ยังไม่เลือกไอเดีย
 * - from day 3 with no interview and no tester log: ยังไม่มีหลักฐานคุยกับคน
 * - 2 or more full round days with no log (or none since joining): เงียบ N วัน
 * - from day 6, the steps still missing: ขาดขั้น 4, 5
 *
 * The checks run while the round is open. After close the dashboard shows the
 * full checklist instead (closingChecklist).
 */

export type FlagCode = "no_idea" | "no_people" | "silent" | "missing_steps";

export interface MentorFlag {
  code: FlagCode;
  label: string;
  /** missing_steps: the step numbers. */
  steps?: number[];
  /** silent: full round days without a log. */
  days?: number;
}

export const FLAG_LABEL = {
  no_idea: "ยังไม่เลือกไอเดีย",
  no_people: "ยังไม่มีหลักฐานคุยกับคน",
  silent: (days: number) => `เงียบ ${days} วัน`,
  missing_steps: (steps: number[]) => `ขาดขั้น ${steps.join(", ")}`,
} as const;

/** Logs of `type` the counts know about, or null when no mission in this round uses the type. */
export function partHave(counts: MissionCounts, type: EvidenceType): number | null {
  let found = false;
  let have = 0;
  for (const m of counts.missions) {
    for (const p of m.parts) {
      if (p.type === type) {
        found = true;
        have += p.have;
      }
    }
  }
  return found ? have : null;
}

/** When the "pick an idea" check starts: the end of the first session, else the end of day 1. */
export function ideaDeadline(round: RoundClock): Date {
  const first = round.session_days.length ? Math.min(...round.session_days) : null;
  return first ? sessionEndAt(round, first) : dayStartAt(round, 2);
}

/**
 * Full round days (before today) with no log since the last one, or since
 * joining when there is none. Days before day 1 or before joining don't count.
 */
export function quietDays(
  row: Pick<AdminStepsRow, "last_log_at" | "joined_day" | "counts">,
  round: RoundClock,
  now: Date,
): number {
  const today = Math.min(roundDay(round, now), lastRoundDay(round) + 1);
  if (today < 1 || row.counts.daily?.today_logged) return 0;
  const lastDay = row.last_log_at
    ? Math.max(0, roundDay(round, new Date(row.last_log_at)))
    : Math.max(0, Math.max(row.joined_day, 1) - 1);
  return Math.max(0, today - 1 - lastDay);
}

/** A demo mission is due on the last round day (extensions included), not on day 6. */
function isDue(step: StepCell, today: number, round: RoundClock): boolean {
  return !(step.types.includes("demo_post") && today < lastRoundDay(round));
}

export function mentorFlags(row: AdminStepsRow, round: RoundClock, now: Date): MentorFlag[] {
  if (now.getTime() < Date.parse(round.starts_at) || isClosed(round, now)) return [];
  const today = roundDay(round, now);
  const flags: MentorFlag[] = [];

  const ideas = partHave(row.counts, "ideas");
  if (ideas === 0 && now.getTime() >= ideaDeadline(round).getTime()) {
    flags.push({ code: "no_idea", label: FLAG_LABEL.no_idea });
  }

  if (today >= 3) {
    const interviews = partHave(row.counts, "interview");
    const testers = partHave(row.counts, "tester");
    if ((interviews !== null || testers !== null) && (interviews ?? 0) + (testers ?? 0) === 0) {
      flags.push({ code: "no_people", label: FLAG_LABEL.no_people });
    }
  }

  const quiet = quietDays(row, round, now);
  if (quiet >= 2) flags.push({ code: "silent", label: FLAG_LABEL.silent(quiet), days: quiet });

  if (today >= 6) {
    const missing = studentSteps(row.counts, { round, now })
      .filter((s) => !s.done && (s.kind === "mission" ? isDue(s, today, round) : s.state === "missed"))
      .map((s) => s.n);
    if (missing.length) flags.push({ code: "missing_steps", label: FLAG_LABEL.missing_steps(missing), steps: missing });
  }
  return flags;
}

export interface ClosingChecklist {
  steps: StepCell[];
  done: number;
  total: number;
  missing: number[];
}

/** After close: every step done or not (habits included), for the checklist and CSV. */
export function closingChecklist(row: Pick<AdminStepsRow, "counts">, round: RoundClock, now: Date): ClosingChecklist {
  const steps = studentSteps(row.counts, { round, now });
  const missing = steps.filter((s) => !s.done).map((s) => s.n);
  return { steps, done: steps.length - missing.length, total: steps.length, missing };
}
