/**
 * Small formatting helpers for the guide shell. Pure and deterministic, so the
 * server render and the client agree (no Intl, no time zone surprises).
 */

const THAI_MONTHS_SHORT = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

/**
 * "2026-11-11" -> "11 พ.ย. 2569"; "2026-04" -> "เม.ย. 2569". Built from the
 * parts, never parsed as a timestamp. Null for anything else.
 */
export function formatThaiDay(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const match = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(iso);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!(month >= 1 && month <= 12)) return null;
  const monthYear = `${THAI_MONTHS_SHORT[month - 1]} ${year + 543}`;
  if (!match[3]) return monthYear;
  const day = Number(match[3]);
  if (!(day >= 1 && day <= 31)) return null;
  return `${day} ${monthYear}`;
}

/** "ข้อมูล ณ 11 พ.ย. 2569" */
export function asOfLabel(iso: string | null | undefined): string | null {
  const day = formatThaiDay(iso);
  return day ? `ข้อมูล ณ ${day}` : null;
}

/** Whole minutes for "เหลือราว N นาที": rounded up, at least 1 while anything is left. */
export function roundMinutes(minutes: number): number {
  if (!Number.isFinite(minutes) || minutes <= 0) return 0;
  return Math.max(1, Math.ceil(minutes));
}

/** "เหลือราว 6 นาที", or "ด่านสุดท้ายแล้ว" when under a minute is left on the last level. */
export function minutesLeftLabel(minutes: number): string {
  const n = roundMinutes(minutes);
  return n > 0 ? `เหลือราว ${n} นาที` : "ด่านสุดท้ายแล้ว";
}

/** "LV 3/11" (shell chrome, computed at runtime). */
export function levelLabel(order: number, total: number): string {
  return `LV ${order}/${total}`;
}
