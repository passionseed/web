/**
 * What the public site asks visitors to join right now. The home page hero,
 * its last call to action, the nav button and the About page all follow it,
 * so they never disagree and never sell a round whose deadline has passed.
 *
 * Order:
 * 1. An open SHIFT round: book a seat.
 * 2. Otherwise, the Elemental Hackathon while its sign-up is open.
 * 3. Otherwise, the next SHIFT round's free sign-up (/shift/next): people
 *    mark the weeks they are free and pay nothing until a date is set.
 *
 * SHIFT sales are paused to 31 December 2026 (company-brain decisions/log.md,
 * 2026-11-19), so no SHIFT round is open and the hackathon leads until its
 * sign-up closes (ELEMENTAL.registrationClosesOn).
 */

import { elementalRegistrationOpen } from "@/lib/hackathon/elemental/registration";
import { SHIFT_COHORTS, bangkokToday, cohortStatus, type ShiftCohort } from "@/lib/content/shift-cohort";
import { NEXT_ROUND_NAME } from "@/lib/content/shift-next";

export type HomeLead =
  | { kind: "shift"; cohort: ShiftCohort }
  | { kind: "hackathon" }
  | { kind: "shift-next" };

/** Picks the lead from what is open. Pure, so the order is testable. */
export function resolveHomeLead(openCohort: ShiftCohort | undefined, hackathonOpen: boolean): HomeLead {
  if (openCohort) return { kind: "shift", cohort: openCohort };
  if (hackathonOpen) return { kind: "hackathon" };
  return { kind: "shift-next" };
}

/** The lead at `now`, Bangkok time. */
export function getHomeLead(now: Date = new Date()): HomeLead {
  const today = bangkokToday(now);
  const openCohort = SHIFT_COHORTS.find((c) => cohortStatus(c, today) === "open");
  return resolveHomeLead(openCohort, elementalRegistrationOpen(now));
}

/** Plain data for a lead's button, safe to pass to client components. */
export interface LeadCta {
  kind: HomeLead["kind"];
  href: string;
  /** The full ask, for the hero and the last call to action. */
  label: string;
  /** Two or three words, for the nav bar. */
  short: string;
}

/**
 * Where a lead's button goes and what it says. `src` tags hackathon links
 * (?src=home) so the sign-up dashboard counts seats from this site.
 */
export function leadCta(lead: HomeLead, src: string): LeadCta {
  switch (lead.kind) {
    case "shift":
      return {
        kind: "shift",
        href: lead.cohort.applyUrl,
        label: `จองที่นั่ง ${lead.cohort.name}`,
        short: "สมัคร SHIFT",
      };
    case "hackathon":
      return {
        kind: "hackathon",
        href: `/hackathon/elemental?src=${encodeURIComponent(src)}`,
        label: "สมัคร Elemental Hackathon",
        short: "สมัคร Hackathon",
      };
    case "shift-next":
      return {
        kind: "shift-next",
        href: "/shift/next",
        label: `ลงชื่อรอ ${NEXT_ROUND_NAME}`,
        short: "ลงชื่อรอ SHIFT",
      };
  }
}
