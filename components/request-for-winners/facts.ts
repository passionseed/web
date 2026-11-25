import { formatThaiDate } from "@/lib/content/shift-cohort";

/**
 * Facts the Request for Winners page prints. Source: passionseed/company-brain
 * (private/hackathon-and-request-for-winners.md and hackathon-csii-proposal.md).
 *
 * Known:
 * - A 4-week incubation that turns a contest project into a real business,
 *   ending in a demo day (Big, 2026-11-19).
 * - Any student who has won a contest qualifies, not only Elemental's winners
 *   (Angpao, 2026-11-18 and 2026-11-19).
 * - Opens Friday 11 December 2026 (Angpao, 2026-11-19).
 * - Teams build on the PassionSeed whiteboard (Big, 2026-11-19) with weekly
 *   check-ins (CSII proposal).
 * - What we ask back: testimonials and help promoting PassionSeed
 *   (Angpao, 2026-11-18).
 * - Who pays for it: sponsor money (Big, 2026-11-19; sponsors also fund the
 *   prize pool) and all of the Elemental entry fees left after the
 *   hackathon's own costs (Big, 2026-11-22: "we want money to host this",
 *   then "all of it"). PassionSeed keeps no profit from Elemental.
 * - Made public by Big, 2026-11-22.
 *
 * Every `null` is still "(fill in)" in the brain. The page shows it as
 * "announced soon" until someone sets it here. Never guess one.
 * Change a fact here, never in the page.
 */
export const RFW = {
  name: "Request for Winners",
  weeks: 4,
  opensOn: "2026-12-11",
  /** Last day to apply. (fill in) */
  closesOn: null as string | null,
  /** First day of the 4 weeks. (fill in) */
  startsOn: null as string | null,
  /** Demo day date. (fill in) */
  demoDayOn: null as string | null,
  /** Price for students, in baht; 0 means free. (fill in) */
  priceBaht: null as number | null,
  /** Which contests count, in Thai. (fill in) */
  whichContestsTh: null as string | null,
  /** What proof of a win we ask for, in Thai. (fill in) */
  proofTh: null as string | null,
  /** Online, onsite or both, in Thai. (fill in) */
  formatTh: null as string | null,
  /** What happens in each of the 4 weeks, in Thai. (fill in) */
  weeksTh: null as readonly string[] | null,
  /** Where students apply. Null until the form exists. (fill in) */
  applyUrl: null as string | null,
} as const;

/** Shown wherever a fact is still unknown. */
export const SOON_TH = "ประกาศเร็ว ๆ นี้";

/** "ศุกร์ 11 ธ.ค. 2569": weekday, day, month and Buddhist-era year. */
export function thaiDateWithYear(iso: string): string {
  const year = Number(iso.slice(0, 4)) + 543;
  return `${formatThaiDate(iso)} ${year}`;
}

/** A date line, or null when the date is still unknown. */
export function maybeThaiDate(iso: string | null): string | null {
  return iso ? thaiDateWithYear(iso) : null;
}

/** "ฟรี", "฿1,500", or null when the price is still unknown. */
export function priceLine(priceBaht: number | null): string | null {
  if (priceBaht === null) return null;
  if (priceBaht === 0) return "ฟรี";
  return `฿${priceBaht.toLocaleString("en-US")}`;
}

/** One line per week from the brain's plan; null where a week isn't planned yet. */
export function weekLines(
  weeks: number,
  weeksTh: readonly string[] | null,
): (string | null)[] {
  return Array.from({ length: weeks }, (_, i) => weeksTh?.[i] ?? null);
}
