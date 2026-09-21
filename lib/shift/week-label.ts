import { SHIFT_COHORT } from "@/lib/content/shift-cohort";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * "Week N" counted from the cohort start date (Week 1 starts on startDate).
 * Dates before the cohort start clamp to Week 1.
 */
export function getShiftWeekLabel(date: Date = new Date()): string {
  const start = new Date(`${SHIFT_COHORT.startDate}T00:00:00`);
  const days = Math.floor((date.getTime() - start.getTime()) / DAY_MS);
  const week = Math.max(1, Math.floor(days / 7) + 1);
  return `Week ${week}`;
}
