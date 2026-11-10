import { z } from "zod";

import { parseBirthDate } from "@/lib/seedstack/consent";
import { applicantNeedsParent } from "@/lib/shift/parentConsent";

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

/** "Where did you find us", self-reported. `source` is the tracked link instead. */
export const SHIFT_FOUND_VIA = [
  { value: "friend", label: "เพื่อนแนะนำ" },
  { value: "camphub", label: "Camphub" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
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

const PARENT_EMAIL = z.string().email();

const applicationFields = z.object({
  fullName: trimmed(2, 80, "ใส่ชื่อจริงด้วยนะ"),
  nickname: trimmed(1, 30, "ใส่ชื่อเล่นด้วยนะ"),
  grade: z.enum(["m4", "m5", "m6", "other"], { message: "เลือกชั้นเรียนด้วยนะ" }),
  /** YYYY-MM-DD. Decides whether a parent must agree too (under 20, PDPA). */
  birthDate: z.string().transform((raw, ctx) => {
    const date = parseBirthDate(raw);
    if (!date) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "ใส่วันเกิดด้วยนะ" });
      return z.NEVER;
    }
    return date;
  }),
  targetTrack: optionalTrimmed(120),
  problem: trimmed(20, 800, "เล่าปัญหาอีกนิด อย่างน้อยสัก 1-2 ประโยค"),
  availability: z.enum(["all_days", "some_days"], { message: "บอกหน่อยว่าว่างแค่ไหน" }),
  igHandle: z
    .string()
    .transform(cleanIgHandle)
    .pipe(z.string().min(1, "ใส่ IG ไว้ให้เราทักกลับด้วยนะ").max(40, "IG ยาวเกินไป")),
  discordHandle: optionalTrimmed(40),
  /** Both parent fields are required under 20 and dropped at 20+. */
  parentEmail: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, "อีเมลยาวเกินไป")
    .optional()
    .transform((value) => (value ? value : null)),
  parentContact: optionalTrimmed(120),
  consent: z.literal(true, { errorMap: () => ({ message: "ติ๊กยินยอมก่อนส่งนะ" }) }),
  foundVia: z.enum(["friend", "camphub", "instagram", "facebook"], {
    message: "บอกหน่อยว่ารู้จักเราจากไหน",
  }),
  source: optionalTrimmed(80),
  /** Which SHIFT round this is for. Missing means the first round, which is
   *  what every form sent before rounds existed. */
  round: z.number().int().nonnegative().optional(),
  /** Honeypot. Humans never see it; bots fill it. */
  website: z.string().max(0).optional(),
});

export const shiftApplicationSchema = applicationFields
  .superRefine((app, ctx) => {
    if (!applicantNeedsParent(app.birthDate)) return;
    if (!app.parentEmail) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["parentEmail"], message: "ใส่อีเมลผู้ปกครองด้วยนะ" });
    } else if (!PARENT_EMAIL.safeParse(app.parentEmail).success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["parentEmail"], message: "อีเมลผู้ปกครองดูไม่ถูก ลองเช็กอีกทีนะ" });
    }
    if (!app.parentContact || app.parentContact.length < 5) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["parentContact"], message: "ใส่เบอร์หรือ LINE ผู้ปกครองด้วยนะ" });
    }
  })
  // 20+: no parent needed, so keep none of their details (PDPA data minimisation).
  .transform((app) =>
    applicantNeedsParent(app.birthDate) ? app : { ...app, parentEmail: null, parentContact: null },
  );

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
