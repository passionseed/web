/**
 * The one paid-program line on a Career Radar field page (spec 2.8, item 6).
 *
 * Checked against company-brain (glossary.md, history.md, shift.md, 2026-11-11):
 * TechSeed ran to #5 before the pivot to SHIFT, so the page names SHIFT and its
 * open round. No price on Radar: the line points at the round page, which owns
 * price and dates. When no round is open, the line is not shown.
 */
import {
  cohortDayCount,
  cohortPath,
  cohortStatus,
  SHIFT_COHORTS,
  type ShiftCohort,
} from "@/lib/content/shift-cohort";

export interface RadarProgramLine {
  /** Short heading above the line. */
  title: string;
  /** One sentence: what the program is. No price, no em dash. */
  body: string;
  /** Button label. */
  cta: string;
  href: string;
}

/** The first round open for applications on `today` (Bangkok), if any. */
export function openShiftRound(today?: string): ShiftCohort | null {
  return SHIFT_COHORTS.find((cohort) => cohortStatus(cohort, today) === "open") ?? null;
}

/**
 * The program line for a field page, or null when no SHIFT round is open.
 * `fieldSlug` tags the link so the round page can tell Radar traffic apart.
 */
export function radarProgramLine(
  fieldSlug?: string | null,
  today?: string
): RadarProgramLine | null {
  const round = openShiftRound(today);
  if (!round) return null;
  const from = fieldSlug ? `?from=radar-${encodeURIComponent(fieldSlug)}` : "?from=radar";
  return {
    title: "อยากลองทำจริง ไม่ใช่แค่อ่าน?",
    body: `${round.name} ${cohortDayCount(round)} วัน สร้างโปรเจกต์จริงที่คนนอกได้ใช้ แล้วเก็บเป็นพอร์ต TCAS 1`,
    cta: `ดู ${round.name} รอบที่เปิดรับอยู่`,
    href: `${cohortPath(round)}${from}`,
  };
}
