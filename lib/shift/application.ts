import { z } from "zod";

/**
 * SHIFT application contract, shared by the /shift/apply form (client-side
 * hints) and /api/shift/apply (the real gate). Messages are Thai because
 * they are shown to applicants as-is.
 */

export const SHIFT_GRADES = [
  { value: "m4", label: "ม.4" },
  { value: "m5", label: "ม.5" },
  { value: "m6", label: "ม.6" },
  { value: "other", label: "อื่นๆ" },
] as const;

export const SHIFT_AVAILABILITY = [
  { value: "all_days", label: "ว่างทุกวัน" },
  { value: "some_days", label: "ว่างบางวัน" },
] as const;

const trimmed = (min: number, max: number, message: string) =>
  z.string().trim().min(min, message).max(max, "ยาวเกินไปนิด ลองย่อหน่อยนะ");

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "ยาวเกินไปนิด ลองย่อหน่อยนะ")
    .optional()
    .transform((value) => (value ? value : null));

/** "@name", "instagram.com/name/" and " name " all become "name". */
export function cleanIgHandle(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .replace(/\/+$/, "");
}

export const shiftApplicationSchema = z.object({
  fullName: trimmed(2, 80, "ใส่ชื่อจริงด้วยนะ"),
  nickname: trimmed(1, 30, "ใส่ชื่อเล่นด้วยนะ"),
  grade: z.enum(["m4", "m5", "m6", "other"], { message: "เลือกชั้นเรียนด้วยนะ" }),
  targetTrack: optionalTrimmed(120),
  problem: trimmed(20, 800, "เล่าปัญหาอีกนิด อย่างน้อยสัก 1-2 ประโยค"),
  availability: z.enum(["all_days", "some_days"], { message: "บอกหน่อยว่าว่างแค่ไหน" }),
  igHandle: z
    .string()
    .transform(cleanIgHandle)
    .pipe(z.string().min(1, "ใส่ IG ไว้ให้เราทักกลับด้วยนะ").max(40, "IG ยาวเกินไป")),
  discordHandle: optionalTrimmed(40),
  parentContact: trimmed(5, 120, "ใส่ช่องทางติดต่อผู้ปกครองด้วยนะ"),
  consent: z.literal(true, { errorMap: () => ({ message: "ติ๊กยินยอมก่อนส่งนะ" }) }),
  source: optionalTrimmed(80),
  /** Honeypot. Humans never see it; bots fill it. */
  website: z.string().max(0).optional(),
});

export type ShiftApplicationInput = z.input<typeof shiftApplicationSchema>;
export type ShiftApplication = z.output<typeof shiftApplicationSchema>;

export type ShiftApplicationErrors = Partial<Record<keyof ShiftApplicationInput, string>>;

/** First message per field, in the shape the form renders. */
export function toFieldErrors(error: z.ZodError): ShiftApplicationErrors {
  const errors: ShiftApplicationErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as keyof ShiftApplicationInput | undefined;
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}
