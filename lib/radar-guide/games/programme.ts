/**
 * ProgrammeFilter: grade gate, filters, fit order and deadline countdowns.
 * Pure. Countdowns never go negative: a passed deadline reads "ปิดแล้ว".
 */
import type { FitOutcome, GradeKey, GuideState, ProgrammeCard, ProgrammeFilterData } from "../guide-types";

export const CLOSED_TH = "ปิดแล้ว";

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;

/** guide-lint rule 6: every deadline carries an explicit offset ("+07:00" or "Z"). */
export function hasExplicitOffset(at: string): boolean {
  return /(?:Z|[+-]\d{2}:\d{2})$/.test(at);
}

/**
 * "อีก N วัน" / "อีก N ชั่วโมง" / "อีก N นาที", or "ปิดแล้ว" once `now` reaches
 * the deadline. An unparsable date reads "ปิดแล้ว" rather than a wrong number.
 */
export function countdownLabel(at: string, now: Date | number = Date.now()): string {
  const deadline = Date.parse(at);
  const t = typeof now === "number" ? now : now.getTime();
  if (!Number.isFinite(deadline)) return CLOSED_TH;
  const left = deadline - t;
  if (left <= 0) return CLOSED_TH;
  if (left >= DAY_MS) return `อีก ${Math.floor(left / DAY_MS)} วัน`;
  if (left >= HOUR_MS) return `อีก ${Math.floor(left / HOUR_MS)} ชั่วโมง`;
  return `อีก ${Math.max(1, Math.floor(left / MINUTE_MS))} นาที`;
}

export function isClosed(at: string, now: Date | number = Date.now()): boolean {
  return countdownLabel(at, now) === CLOSED_TH;
}

/** Live countdowns only for ม.6. ม.4 and ม.5 see the date as an example round. */
export function showsCountdown(grade: GradeKey | undefined): boolean {
  return grade === "m6";
}

export function gradeValue(grade: GradeKey): number {
  return grade === "m4" ? 4 : grade === "m5" ? 5 : 6;
}

export type RoundFilter = "portfolio" | "all";
export type TrackFilter = "all" | "thai" | "intl";

/**
 * Round "portfolio" keeps programmes with a รอบ 1 Portfolio. Track "thai"
 * keeps Thai-language programmes, regular and special; "intl" keeps
 * international ones.
 */
export function filterProgrammes(
  list: readonly ProgrammeCard[],
  filters: { round: RoundFilter; track: TrackFilter }
): ProgrammeCard[] {
  return list.filter((p) => {
    if (filters.round === "portfolio" && !p.rounds.includes("portfolio")) return false;
    if (filters.track === "thai" && p.track === "intl") return false;
    if (filters.track === "intl" && p.track !== "intl") return false;
    return true;
  });
}

export type FitOrder = ProgrammeFilterData["fitOrder"][FitOutcome];

/** The order for a fit result; no result or a split result reads "both". */
export function fitOrderFor(fit: GuideState["fit"], fitOrder: ProgrammeFilterData["fitOrder"]): FitOrder {
  if (!fit) return "both";
  const orders = new Set(fit.split("").map((o) => fitOrder[o as FitOutcome]));
  return orders.size === 1 ? [...orders][0] : "both";
}

/**
 * Applies the fit order. "cyberFirst" moves programmes with ไซเบอร์ in the name
 * to the top (stable); "broadFirst" shows the wide doors before the list;
 * "both" keeps the list as authored.
 */
export function orderProgrammes(
  list: readonly ProgrammeCard[],
  order: FitOrder
): { programmes: ProgrammeCard[]; broadFirst: boolean } {
  if (order === "cyberFirst") {
    const cyber = list.filter((p) => p.cyberInName);
    const rest = list.filter((p) => !p.cyberInName);
    return { programmes: [...cyber, ...rest], broadFirst: false };
  }
  return { programmes: [...list], broadFirst: order === "broadFirst" };
}

/** GPAX greys a card out when its known minimum is higher. It never hides it. */
export function gpaxGreyed(card: ProgrammeCard, gpax: number | undefined): boolean {
  return gpax !== undefined && card.minGpax !== undefined && gpax < card.minGpax;
}

export function clampGpax(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(Math.min(4, Math.max(0, value)) * 100) / 100;
}
