import {
  SHIFT_COHORTS,
  bangkokToday,
  cohortStatus,
  getEffectiveCohort,
  getRunningCohort,
  type ShiftCohort,
} from "@/lib/content/shift-cohort";

import { daysBetween } from "./time";

/**
 * The SHIFT cohort the console is about right now: the one open for
 * applications, else the one running, else the cohort the apply form would
 * show. Same order as getOpenCohorts()[0], but takes `today` so it is testable.
 */
export function focusCohort(today: string = bangkokToday()): ShiftCohort {
  return (
    SHIFT_COHORTS.find((c) => cohortStatus(c, today) === "open") ??
    getRunningCohort(today) ??
    getEffectiveCohort()
  );
}

/** Whole Bangkok days until applications close: 0 on deadline day, null once closed. */
export function daysToDeadline(cohort: ShiftCohort, today: string = bangkokToday()): number | null {
  const days = daysBetween(today, cohort.applyDeadline);
  return days >= 0 ? days : null;
}

export type ApplicationsFilter = {
  status?: "new" | "accepted" | "waitlist" | "declined" | "all";
  paid?: "paid" | "unpaid" | "not_in_discord" | "all";
  id?: string;
};

/** Deep link into /admin/shift/applications, always scoped to one cohort. */
export function applicationsHref(cohortName: string, filter: ApplicationsFilter = {}): string {
  const params = new URLSearchParams({ cohort: cohortName });
  if (filter.status) params.set("status", filter.status);
  if (filter.paid) params.set("paid", filter.paid);
  if (filter.id) params.set("id", filter.id);
  return `/admin/shift/applications?${params.toString()}`;
}
