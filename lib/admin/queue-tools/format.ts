/**
 * Dates for admin tools, always on Bangkok time. Server components run in UTC
 * on Vercel, so a bare toLocaleString would show times seven hours early.
 */

const BANGKOK = "Asia/Bangkok";

export function formatBangkokDateTime(
  iso: string | null | undefined,
  { year = false, seconds = false }: { year?: boolean; seconds?: boolean } = {},
): string {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-GB", {
    timeZone: BANGKOK,
    day: "2-digit",
    month: "short",
    ...(year ? { year: "numeric" } : {}),
    hour: "2-digit",
    minute: "2-digit",
    ...(seconds ? { second: "2-digit" } : {}),
    hourCycle: "h23",
  });
}

/** Whole days between `iso` and `now`; 0 for anything in the last 24 hours. */
export function daysSince(iso: string, now: number = Date.now()): number {
  return Math.floor((now - new Date(iso).getTime()) / 86_400_000);
}
