/**
 * Pure helpers for the guide components: source lists, dates, video
 * milestones and form copy. No React, no Supabase.
 */
import type { CareerRequestResult } from "@/lib/radar-guide/types";

/**
 * A cited source as the guide shows it. Structurally compatible with
 * `FieldSource` in RadarCards; `asOf` is the date the figure was checked
 * (`accessed_at`, else `published_at`), when the page selects it.
 */
export interface GuideSource {
  ref: number;
  title: string;
  publisher?: string | null;
  url: string;
  asOf?: string | null;
}

/** Every `source_refs` number of a set of cards, de-duplicated in first-seen order. */
export function collectSourceRefs(contents: ReadonlyArray<Record<string, unknown> | null | undefined>): number[] {
  const refs: number[] = [];
  for (const content of contents) {
    const list = content?.source_refs;
    if (!Array.isArray(list)) continue;
    for (const value of list) {
      const ref = typeof value === "number" ? value : Number(value);
      if (Number.isInteger(ref) && !refs.includes(ref)) refs.push(ref);
    }
  }
  return refs;
}

function validTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

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

/** "พ.ย. 2569" (Buddhist year, Bangkok time). Null for a bad date. Not Intl, so server and client agree. */
export function formatThaiMonthYear(iso: string | null | undefined): string | null {
  const time = validTime(iso);
  if (time === null) return null;
  const bangkok = new Date(time + 7 * 60 * 60 * 1000);
  return `${THAI_MONTHS_SHORT[bangkok.getUTCMonth()]} ${bangkok.getUTCFullYear() + 543}`;
}

/** Seconds as "0:42". */
export function formatClock(seconds: number): string {
  const total = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export const VIDEO_PROGRESS_MILESTONES = [25, 50, 75] as const;
export const VIDEO_COMPLETE_FRACTION = 0.9;

/**
 * Progress milestones (25, 50, 75) reached at `fraction` that are not in
 * `sent` yet. Seeking past several sends them all, in order.
 */
export function newProgressMilestones(fraction: number, sent: ReadonlySet<number>): number[] {
  if (!Number.isFinite(fraction)) return [];
  const percent = fraction * 100;
  return VIDEO_PROGRESS_MILESTONES.filter((m) => percent >= m && !sent.has(m));
}

export type CareerRequestFormState = "idle" | "submitting" | CareerRequestResult;

/** The message under the "อยากให้ทำอาชีพไหนต่อ?" form for each state. */
export function careerRequestMessage(state: CareerRequestFormState): string | null {
  switch (state) {
    case "ok":
      return "รับแล้ว ถ้ามีคนขอเยอะ เราจะทำเป็นตอนต่อไป";
    case "rate_limited":
      return "ส่งเยอะไปหน่อย ลองใหม่อีกชั่วโมงนะ";
    case "invalid":
      return "ขอแค่ชื่ออาชีพนะ ลองพิมพ์ใหม่อีกที";
    case "failed":
      return "ส่งไม่สำเร็จ ลองใหม่อีกครั้งนะ";
    default:
      return null;
  }
}
