import "server-only";

import type { AdminShiftSnapshot } from "@/lib/admin/console";
import { cohortStatus, type ShiftCohort } from "@/lib/content/shift-cohort";

import { daysToDeadline, focusCohort } from "./cohort";
import { headCount, lazyServiceDb, type ServiceDb } from "./db";
import { readCount, timeoutSignal } from "./query";
import { loadOverviewRounds, pickLiveRound, roundTitle, type OverviewRound } from "./rounds";
import { bangkokDayKey } from "./time";

type Funnel = NonNullable<AdminShiftSnapshot["funnel"]>;

export function cohortFacts(cohort: ShiftCohort, today: string): AdminShiftSnapshot["cohort"] {
  const status = cohortStatus(cohort, today);
  return {
    name: cohort.name,
    round: cohort.round,
    status,
    applyDeadline: cohort.applyDeadline,
    startDate: cohort.startDate,
    endDate: cohort.endDate,
    seats: cohort.seats,
    priceBaht: cohort.priceBaht,
    daysToDeadline: status === "open" ? daysToDeadline(cohort, today) : null,
  };
}

/** Head counts per funnel stage for one cohort. Any failure makes the funnel null. */
export async function loadShiftFunnel(db: ServiceDb, cohortName: string): Promise<Funnel | null> {
  const base = () => headCount(db, "shift_applications").eq("cohort", cohortName);
  const status = (value: string) => readCount(base().eq("status", value).abortSignal(timeoutSignal()));
  try {
    const [applied, newCount, accepted, waitlist, declined, paid, inDiscord] = await Promise.all([
      readCount(base().abortSignal(timeoutSignal())),
      status("new"),
      status("accepted"),
      status("waitlist"),
      status("declined"),
      readCount(base().not("paid_at", "is", null).abortSignal(timeoutSignal())),
      readCount(base().not("discord_joined_at", "is", null).abortSignal(timeoutSignal())),
    ]);
    return { applied, newCount, accepted, waitlist, declined, paid, inDiscord };
  } catch {
    return null;
  }
}

export function liveRoundFacts(
  rounds: readonly OverviewRound[],
  cohortName: string,
): AdminShiftSnapshot["liveRound"] {
  const round = pickLiveRound(rounds, cohortName);
  if (!round) return null;
  return {
    id: round.id,
    title: roundTitle(round),
    entrants: round.entrants ?? 0,
    pendingReview: round.pending_review ?? 0,
    certificatesIssued: round.certificates_issued ?? 0,
    href: `/admin/shift/rounds/${round.id}`,
  };
}

/**
 * The SHIFT cohort the team is selling or running now: static facts from
 * lib/content/shift-cohort.ts, the application funnel, and the live
 * shift_rounds row. Never throws; unreadable parts are null.
 */
export async function getAdminShiftSnapshot(): Promise<AdminShiftSnapshot | null> {
  try {
    const now = new Date();
    const today = bangkokDayKey(now) as string;
    const cohort = focusCohort(today);
    const db = lazyServiceDb();
    const [funnel, rounds] = await Promise.all([
      Promise.resolve()
        .then(() => loadShiftFunnel(db(), cohort.name))
        .catch(() => null),
      loadOverviewRounds().catch(() => null),
    ]);
    return {
      cohort: cohortFacts(cohort, today),
      funnel,
      liveRound: rounds ? liveRoundFacts(rounds, cohort.name) : null,
    };
  } catch {
    return null;
  }
}
