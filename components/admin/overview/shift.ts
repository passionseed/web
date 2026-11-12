import type { AdminShiftSnapshot } from "@/lib/admin/console";
import { applicationsHref } from "@/lib/admin/overview/cohort";

import { daysBetween, formatDayKey, percentOf } from "./format";

export { applicationsHref };

/** The SHIFT panel model: status, countdown, funnel links. Pure. */

type ShiftCohortSnapshot = AdminShiftSnapshot["cohort"];
type ShiftStatus = ShiftCohortSnapshot["status"];

export const SHIFT_STATUS_LABEL: Record<ShiftStatus, string> = {
  open: "Applications open",
  closed: "Applications closed",
  running: "Running",
  done: "Finished",
};

function dayWord(days: number): string {
  return days === 1 ? "1 day" : `${days} days`;
}

export interface ShiftCountdown {
  /** The big figure, e.g. "12 days" or "Today". */
  value: string;
  /** What it counts down to, e.g. "until applications close, Sat 7 Nov". */
  caption: string;
}

/** The headline figure for where the cohort is in its life. */
export function shiftCountdown(cohort: ShiftCohortSnapshot, today: string): ShiftCountdown | null {
  switch (cohort.status) {
    case "open": {
      const days = cohort.daysToDeadline ?? daysBetween(today, cohort.applyDeadline);
      const deadline = formatDayKey(cohort.applyDeadline);
      if (days <= 0) return { value: "Today", caption: `Applications close today, ${deadline}` };
      return { value: dayWord(days), caption: `until applications close, ${deadline}` };
    }
    case "closed": {
      const days = daysBetween(today, cohort.startDate);
      const start = formatDayKey(cohort.startDate);
      if (days <= 0) return { value: "Today", caption: `The round starts today, ${start}` };
      return { value: dayWord(days), caption: `until the round starts, ${start}` };
    }
    case "running": {
      const total = daysBetween(cohort.startDate, cohort.endDate) + 1;
      const day = Math.min(total, Math.max(1, daysBetween(cohort.startDate, today) + 1));
      return { value: `Day ${day}`, caption: `of ${total}, ends ${formatDayKey(cohort.endDate)}` };
    }
    case "done":
      return { value: "Done", caption: `Finished ${formatDayKey(cohort.endDate)}` };
  }
}

/** The SHIFT half of the header summary, or null when there is nothing to say. */
export function shiftHeadline(snapshot: AdminShiftSnapshot | null, today: string): string | null {
  if (!snapshot) return null;
  const { cohort } = snapshot;
  if (cohort.status === "open") {
    const days = cohort.daysToDeadline ?? daysBetween(today, cohort.applyDeadline);
    if (days <= 0) return `${cohort.name} applications close today.`;
    if (days === 1) return `${cohort.name} applications close tomorrow.`;
    return `${cohort.name} applications close in ${days} days.`;
  }
  if (cohort.status === "closed") {
    const days = daysBetween(today, cohort.startDate);
    if (days <= 0) return `${cohort.name} starts today.`;
    if (days === 1) return `${cohort.name} starts tomorrow.`;
    return `${cohort.name} starts in ${days} days.`;
  }
  if (cohort.status === "running") return `${cohort.name} is running.`;
  return null;
}

export interface FunnelStep {
  key: string;
  label: string;
  count: number;
  href: string;
  /** Bar width and share of everyone who applied, 0-100. */
  share: number;
}

export interface ShiftFunnelModel {
  steps: FunnelStep[];
  /** Side counts that are not a step forward: new and waitlist. */
  secondary: FunnelStep[];
}

export function shiftFunnel(snapshot: AdminShiftSnapshot): ShiftFunnelModel | null {
  const { funnel, cohort } = snapshot;
  if (!funnel) return null;
  const name = cohort.name;
  const step = (key: string, label: string, count: number, href: string): FunnelStep => ({
    key,
    label,
    count,
    href,
    share: percentOf(count, funnel.applied),
  });
  return {
    steps: [
      step("applied", "Applied", funnel.applied, applicationsHref(name)),
      step("accepted", "Accepted", funnel.accepted, applicationsHref(name, { status: "accepted" })),
      step("paid", "Paid", funnel.paid, applicationsHref(name, { paid: "paid" })),
      step("discord", "In Discord", funnel.inDiscord, applicationsHref(name, { paid: "paid" })),
    ],
    secondary: [
      step("new", "New", funnel.newCount, applicationsHref(name, { status: "new" })),
      step("waitlist", "Waitlist", funnel.waitlist, applicationsHref(name, { status: "waitlist" })),
    ],
  };
}
