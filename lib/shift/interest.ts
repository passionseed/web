import { z } from "zod";

import { cleanIgHandle } from "@/lib/shift/application";

/**
 * SHIFT pre-order (interest) contract, shared by the /shift/next form and
 * /api/shift/interest. Nobody pays here: people mark the date ranges they
 * are free, and a round opens on the first 7-day window enough of them share.
 * Dates are Bangkok calendar days as "YYYY-MM-DD", compared as strings.
 */

/** A round is 7 evenings in a row, so a usable window is 7 days. */
export const SHIFT_WINDOW_DAYS = 7;
/** Earliest pickable day, so a round has time to fill before it starts. */
export const PICK_LEAD_DAYS = 7;
/** Latest pickable day: further out than this, nobody really knows. */
export const PICK_HORIZON_DAYS = 150;
export const MAX_RANGES = 6;

export const SHIFT_INTEREST_STAGES = [
  { value: "m4", label: "ม.4" },
  { value: "m5", label: "ม.5" },
  { value: "m6", label: "ม.6" },
  { value: "university", label: "มหาวิทยาลัย" },
  { value: "working", label: "ทำงานแล้ว" },
  { value: "other", label: "อื่นๆ" },
] as const;

export type ShiftInterestStage = (typeof SHIFT_INTEREST_STAGES)[number]["value"];

export interface DateRange {
  start: string;
  end: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** Whole days from `a` to `b` (positive when b is later). */
export function daysBetween(a: string, b: string): number {
  const toUtc = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
}

function isRealDate(iso: string): boolean {
  return ISO_DATE.test(iso) && addDays(iso, 0) === iso;
}

/** The first and last day someone may pick, given today in Bangkok. */
export function pickBounds(today: string): DateRange {
  return { start: addDays(today, PICK_LEAD_DAYS), end: addDays(today, PICK_HORIZON_DAYS) };
}

/** Sorted, with overlapping or touching ranges joined into one. */
export function mergeRanges(ranges: readonly DateRange[]): DateRange[] {
  const sorted = ranges
    .map((r) => (r.start <= r.end ? r : { start: r.end, end: r.start }))
    .sort((a, b) => a.start.localeCompare(b.start));
  const merged: DateRange[] = [];
  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (last && range.start <= addDays(last.end, 1)) {
      if (range.end > last.end) last.end = range.end;
    } else {
      merged.push({ ...range });
    }
  }
  return merged;
}

export function rangeLength(range: DateRange): number {
  return daysBetween(range.start, range.end) + 1;
}

/** True when the ranges hold every day from `start` for a whole window. */
export function coversWindow(ranges: readonly DateRange[], start: string): boolean {
  const end = addDays(start, SHIFT_WINDOW_DAYS - 1);
  return ranges.some((r) => r.start <= start && r.end >= end);
}

const dateRangeSchema = z.object({
  start: z.string().refine(isRealDate, "วันที่ไม่ถูกต้อง"),
  end: z.string().refine(isRealDate, "วันที่ไม่ถูกต้อง"),
});

/**
 * The ranges a person is free. `today` pins the pickable bounds. The server
 * passes `graceDays: 1` so a form opened before Bangkok midnight still fits.
 */
export function freeRangesSchema(today: string, graceDays = 0) {
  const bounds = pickBounds(today);
  bounds.start = addDays(bounds.start, -graceDays);
  return z
    .array(dateRangeSchema)
    .min(1, "เลือกช่วงที่ว่างอย่างน้อย 1 ช่วงนะ")
    .max(MAX_RANGES * 2, "เลือกได้ไม่เกิน 6 ช่วง")
    .transform((ranges) => mergeRanges(ranges))
    .refine((ranges) => ranges.length <= MAX_RANGES, "เลือกได้ไม่เกิน 6 ช่วง")
    .refine(
      (ranges) => ranges.every((r) => r.start >= bounds.start && r.end <= bounds.end),
      "มีวันที่อยู่นอกช่วงที่เลือกได้",
    )
    .refine(
      (ranges) => ranges.some((r) => rangeLength(r) >= SHIFT_WINDOW_DAYS),
      "ต้องมีอย่างน้อย 1 ช่วงที่ว่างติดกัน 7 วัน",
    );
}

const trimmed = (min: number, max: number, message: string) =>
  z.string().trim().min(min, message).max(max, "ยาวเกินไปนิด ลองย่อหน่อยนะ");

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "ยาวเกินไปนิด ลองย่อหน่อยนะ")
    .optional()
    .transform((value) => (value ? value : null));

export function shiftInterestSchema(today: string, graceDays = 0) {
  return z.object({
    freeRanges: freeRangesSchema(today, graceDays),
    nickname: trimmed(1, 30, "ใส่ชื่อเล่นด้วยนะ"),
    stage: z.enum(
      SHIFT_INTEREST_STAGES.map((s) => s.value) as [ShiftInterestStage, ...ShiftInterestStage[]],
      { message: "บอกหน่อยว่าตอนนี้อยู่ไหน" },
    ),
    igHandle: z
      .string()
      .transform((raw) => cleanIgHandle(raw).toLowerCase())
      .pipe(
        z
          .string()
          .min(1, "ใส่ IG ไว้ให้เราทักกลับด้วยนะ")
          .max(40, "IG ยาวเกินไป")
          .regex(/^[a-z0-9._]+$/, "IG ใช้ได้แค่ a-z, 0-9, จุด และขีดล่าง"),
      ),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .max(120)
      .optional()
      .transform((value) => (value ? value : null))
      .pipe(z.string().email("อีเมลดูไม่ถูกต้อง").nullable()),
    problem: optionalTrimmed(500),
    committed: z.literal(true, { errorMap: () => ({ message: "อ่านแล้วติ๊กก่อนนะ ว่าพร้อมลงแรงแบบนี้" }) }),
    consent: z.literal(true, { errorMap: () => ({ message: "ติ๊กยินยอมก่อนส่งนะ" }) }),
    source: optionalTrimmed(80),
    /** Honeypot. Humans never see it; bots fill it. */
    website: z.string().max(0).optional(),
  });
}

export type ShiftInterestInput = z.input<ReturnType<typeof shiftInterestSchema>>;
export type ShiftInterest = z.output<ReturnType<typeof shiftInterestSchema>>;
export type ShiftInterestErrors = Partial<Record<keyof ShiftInterestInput, string>>;

export function toInterestErrors(error: z.ZodError): ShiftInterestErrors {
  const errors: ShiftInterestErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as keyof ShiftInterestInput | undefined;
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}

export interface WindowDemand {
  /** First day of the 7-day window. */
  start: string;
  end: string;
  /** People free for every day of it. */
  count: number;
}

/**
 * How many people could make each 7-day window inside `bounds`, busiest
 * first (earliest first on ties). This is what staff read to pick dates.
 */
export function windowDemand(
  people: readonly (readonly DateRange[])[],
  bounds: DateRange,
): WindowDemand[] {
  const windows: WindowDemand[] = [];
  const lastStart = addDays(bounds.end, -(SHIFT_WINDOW_DAYS - 1));
  for (let start = bounds.start; start <= lastStart; start = addDays(start, 1)) {
    const count = people.filter((ranges) => coversWindow(ranges, start)).length;
    if (count > 0) windows.push({ start, end: addDays(start, SHIFT_WINDOW_DAYS - 1), count });
  }
  return windows.sort((a, b) => b.count - a.count || a.start.localeCompare(b.start));
}

/**
 * Busiest windows that do not overlap each other, so staff see distinct
 * options instead of seven near-copies of the same week.
 */
export function distinctWindows(demand: readonly WindowDemand[], limit = 5): WindowDemand[] {
  const picked: WindowDemand[] = [];
  for (const window of demand) {
    if (picked.length >= limit) break;
    const overlaps = picked.some((p) => window.start <= p.end && window.end >= p.start);
    if (!overlaps) picked.push(window);
  }
  return picked;
}
