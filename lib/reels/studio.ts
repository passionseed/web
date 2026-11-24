import type { Reel, ReelRow, ReelShot } from "@/lib/content/elemental-reels";

export type ReelStatus = "scripted" | "filmed" | "edited" | "posted";
export const STATUSES: readonly ReelStatus[] = ["scripted", "filmed", "edited", "posted"];
export const STATUS_LABEL: Record<ReelStatus, string> = {
  scripted: "มีสคริปต์",
  filmed: "ถ่ายแล้ว",
  edited: "ตัดต่อแล้ว",
  posted: "โพสต์แล้ว",
};

/** What the film screen shows: every row, FACE rows only, or every spoken line. */
export type FilmMode = "all" | "face" | "voice";
export const MODE_LABEL: Record<FilmMode, string> = {
  all: "ทั้งหมด",
  face: "พูดหน้ากล้อง",
  voice: "อ่านเสียง",
};

export const SHOT_LABEL: Record<ReelShot, string> = {
  FACE: "FACE พูดหน้ากล้อง",
  SCREEN: "SCREEN อัดหน้าจอ",
  CODE: "CODE ทำในตัดต่อ",
};

export interface IndexedRow extends ReelRow {
  /** Position in the video's own row list, the key for "take done". */
  index: number;
}

export function filterRows(rows: readonly ReelRow[], mode: FilmMode): IndexedRow[] {
  const indexed = rows.map((row, index) => ({ ...row, index }));
  if (mode === "face") return indexed.filter((r) => r.shot === "FACE");
  if (mode === "voice") return indexed.filter((r) => r.vo.trim() !== "");
  return indexed;
}

/** Today in Bangkok as YYYY-MM-DD, whatever the server's time zone. */
export function bangkokToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(now);
}

export interface DayGroup {
  day: string;
  reels: Reel[];
}

/**
 * Groups reels by posting day. The group for today (or the next day with a
 * post) comes first, then the later days, then the days already past.
 */
export function groupByDay(reels: readonly Reel[], today: string): DayGroup[] {
  const days = [...new Set(reels.map((r) => r.day))].sort();
  const pivot = days.findIndex((d) => d >= today);
  const ordered = pivot <= 0 ? days : [...days.slice(pivot), ...days.slice(0, pivot)];
  return ordered.map((day) => ({
    day,
    reels: reels
      .filter((r) => r.day === day)
      .sort((a, b) => Number(a.backup) - Number(b.backup) || Number(a.alt) - Number(b.alt)),
  }));
}

export function formatDay(day: string): string {
  // Noon UTC keeps the calendar date the same in every time zone.
  return new Intl.DateTimeFormat("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${day}T12:00:00Z`));
}

export function reelById(reels: readonly Reel[], id: string): Reel | undefined {
  return reels.find((r) => r.id === id);
}

/** The SCREEN and CODE rows a person has to prepare before editing. */
export function shotListRows(reel: Reel): IndexedRow[] {
  return reel.rows.map((row, index) => ({ ...row, index })).filter((r) => r.shot !== "FACE");
}
