import {
  SHIFT_COHORT_3,
  cohortDayCount,
  cohortPath,
  formatThaiDate,
  pairPriceBaht,
  priceLabel,
  teamSizeLabel,
  type ShiftCohort,
} from "@/lib/content/shift-cohort";

/**
 * Every fact the SHIFT[3] posters print, derived from the cohort record so a
 * date, price or seat change is one edit in lib/content/shift-cohort.ts.
 * Nothing here is a literal date, price or count.
 */

const C = SHIFT_COHORT_3;

function parts(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month, day };
}

/** "จ. 9 ถึง อา. 15 พ.ย.": the month is said once when both ends share it. */
export function compactThaiRange(startIso: string, endIso: string): string {
  const start = formatThaiDate(startIso);
  const end = formatThaiDate(endIso);
  const month = formatThaiDate(endIso, false).split(" ").slice(1).join(" ");
  const sameMonth = parts(startIso).month === parts(endIso).month;
  return sameMonth ? `${start.replace(` ${month}`, "")} ถึง ${end}` : `${start} ถึง ${end}`;
}

/** "9 ถึง 15 พ.ย. 2569": day numbers, month once, Buddhist-era year. */
export function thaiDayRangeWithYear(startIso: string, endIso: string): string {
  const s = parts(startIso);
  const e = parts(endIso);
  const start = s.month === e.month ? String(s.day) : formatThaiDate(startIso, false);
  return `${start} ถึง ${formatThaiDate(endIso, false)} ${e.year + 543}`;
}

const EN_MONTH = (iso: string) => {
  const { year, month, day } = parts(iso);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
};

/** "Nov 9 to 15, 2026". */
export function englishDayRange(startIso: string, endIso: string): string {
  const s = parts(startIso);
  const e = parts(endIso);
  const end = s.month === e.month ? `${e.day}` : `${EN_MONTH(endIso)} ${e.day}`;
  return `${EN_MONTH(startIso)} ${s.day} to ${end}, ${e.year}`;
}

/** Thai weekday initial for each evening of the round, e.g. ["จ", "อ", ...]. */
function weekdayInitials(cohort: ShiftCohort): string[] {
  return cohort.schedule.map((d) => formatThaiDate(d.date).split(" ")[0].replace(/\.$/, ""));
}

function bahtLabel(baht: number) {
  return `฿${baht.toLocaleString("en-US")}`;
}

const demo = C.schedule[C.schedule.length - 1];
const pair = pairPriceBaht(C);

export const SHIFT3 = {
  cohort: C,
  name: C.name,
  round: C.round,
  /** "03", for the mission tag. */
  roundCode: String(C.round).padStart(2, "0"),
  days: cohortDayCount(C),
  dates: compactThaiRange(C.startDate, C.endDate),
  datesWithYear: thaiDayRangeWithYear(C.startDate, C.endDate),
  datesEn: englishDayRange(C.startDate, C.endDate),
  weekdays: weekdayInitials(C),
  /** "19:00–21:00" (en dash). */
  time: C.sessionTime,
  price: priceLabel(C),
  priceBaht: C.priceBaht,
  pairPrice: pair === null ? null : bahtLabel(pair),
  seats: C.seats,
  team: teamSizeLabel(C),
  deadline: formatThaiDate(C.applyDeadline),
  demoLabel: demo.label,
  demoDate: formatThaiDate(demo.date),
  demoDay: demo.day,
  /** Display link, no scheme: "passionseed.org/shift/3". */
  link: `passionseed.org${cohortPath(C)}`,
  /** Instagram comment keyword that triggers the apply-link DM. */
  keyword: "SHIFT",
} as const;
