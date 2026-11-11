import { SHIFT_COHORTS, bangkokToday, cohortStatus, type ShiftCohort } from "@/lib/content/shift-cohort";
import { NEXT_ROUND_NAME, PITCH } from "@/lib/content/shift-next";

/**
 * What the home page sells today. While a round takes applications it is
 * that round, with its dates, price and seats. Once the newest round has
 * closed, it is the sign-up list for the round after, so the page never
 * asks anyone to book a week whose deadline has passed.
 */
export interface HomeOffer {
  /** The round on the wordmark and the buttons, e.g. "SHIFT[4]". */
  name: string;
  href: string;
  cta: string;
  /** The round taking applications; null while the next one collects names. */
  cohort: ShiftCohort | null;
  /** Shown in place of dates and price when there is no open round. */
  note: string | null;
}

export function getHomeOffer(today: string = bangkokToday()): HomeOffer {
  const cohort = SHIFT_COHORTS.find((c) => cohortStatus(c, today) === "open");
  if (cohort) {
    return { name: cohort.name, href: "/shift/apply", cta: `จองที่นั่ง ${cohort.name}`, cohort, note: null };
  }
  return {
    name: NEXT_ROUND_NAME,
    href: "/shift/next",
    cta: `ลงชื่อ ${NEXT_ROUND_NAME}`,
    cohort: null,
    note: PITCH.preorder,
  };
}
