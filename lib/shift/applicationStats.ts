import type { ShiftApplicationRow } from "@/types/shift";

export interface SeatStats {
  paid: number;
  accepted: number;
  seats: number;
}

export interface SourceCount {
  source: string;
  count: number;
}

export const DIRECT_SOURCE = "direct";

export function seatStats(rows: ShiftApplicationRow[], seats: number): SeatStats {
  return {
    paid: rows.filter((r) => r.paid_at !== null).length,
    accepted: rows.filter((r) => r.status === "accepted").length,
    seats,
  };
}

/** Count per source, most common first. Missing source counts as "direct". */
export function sourceBreakdown(rows: ShiftApplicationRow[]): SourceCount[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const source = row.source?.trim() || DIRECT_SOURCE;
    counts.set(source, (counts.get(source) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count || a.source.localeCompare(b.source));
}

/** "28 Sep 14:05" in Bangkok time, the only clock the cohorts run on. */
export function formatBangkokDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function truncateText(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
