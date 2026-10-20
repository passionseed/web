import { z } from "zod";

import { ALUMNI_DEFAULT_DOC, timeRangeLabel, weekdayName } from "@/lib/content/shift-alumni";
import { bangkokToday, formatThaiDate } from "@/lib/content/shift-cohort";

/**
 * End-of-SHIFT feedback contract, shared by the /shift/feedback form and
 * /api/shift/feedback. Part 1 is the day-7 SDT check, part 2 is value and
 * price, part 3 is the alumni ask: pick one project to keep going, say which
 * days suit the weekly alumni session, whether to help run things, and a
 * real sign-up for the community at this batch's research price.
 * Messages are Thai because students see them as-is.
 */

export const FEEDBACK_MOTIVATIONS = [
  { value: "had_to", label: "เพราะต้องทำ" },
  { value: "portfolio", label: "เพื่อพอร์ต" },
  { value: "wanted_to", label: "เพราะอยากทำเอง" },
  { value: "care_for_users", label: "เพราะแคร์คนที่มันช่วย" },
] as const;

export const FEEDBACK_PRICE_FIT = [
  { value: "too_cheap", label: "ถูกไป" },
  { value: "about_right", label: "พอดี" },
  { value: "too_expensive", label: "แพงไป" },
] as const;

export const FEEDBACK_PAYERS = [
  { value: "self", label: "เราเอง" },
  { value: "parents", label: "ผู้ปกครอง" },
  { value: "both", label: "ช่วยกันจ่าย" },
  { value: "other", label: "คนอื่น" },
] as const;

/** The ask that ends the form: one project to keep going after day 7. */
export const FEEDBACK_CONTINUE_PROJECTS = [
  { value: "own", label: "ทำโปรเจกต์ของเราต่อ" },
  { value: "new", label: "เริ่มโปรเจกต์ใหม่" },
  { value: "join", label: "ไปช่วยโปรเจกต์ของเพื่อน" },
  { value: "not_now", label: "ยังไม่ตอนนี้" },
] as const;

/** Days that suit the weekly alumni session. `none` is exclusive. */
export const FEEDBACK_DAYS = [
  { value: "mon", label: "จ", name: "วันจันทร์" },
  { value: "tue", label: "อ", name: "วันอังคาร" },
  { value: "wed", label: "พ", name: "วันพุธ" },
  { value: "thu", label: "พฤ", name: "วันพฤหัสบดี" },
  { value: "fri", label: "ศ", name: "วันศุกร์" },
  { value: "sat", label: "ส", name: "วันเสาร์" },
  { value: "sun", label: "อา", name: "วันอาทิตย์" },
  { value: "none", label: "ยังไม่สะดวกสักวัน", name: "ยังไม่สะดวกสักวัน" },
] as const;

/** `not_now` is exclusive: the form clears the others when it is picked.
 *  Rows from before 2026-10-14 may also hold `project_club` or `new_project`. */
export const FEEDBACK_NEXT_STEPS = [
  { value: "help_run", label: "ช่วยรัน SHIFT รอบหน้า แบบมีค่าตอบแทน" },
  { value: "co_host", label: "ช่วย co-host AfterSHIFT" },
  { value: "not_now", label: "ยังไม่ตอนนี้" },
] as const;

/** Next steps the form offered before 2026-10-14, for reading old rows. */
export const FEEDBACK_NEXT_STEPS_RETIRED = [
  { value: "project_club", label: "ทำโปรเจกต์ต่อใน project club (ตัวเลือกเก่า)" },
  { value: "new_project", label: "เริ่มโปรเจกต์ใหม่ (ตัวเลือกเก่า)" },
] as const;

/** Hint for the day picker, from the calendar defaults in code. Names the
 *  first session until it has passed. */
export function alumniSessionHint(now: Date = new Date()): string {
  const { firstDate, startTime, endTime } = ALUMNI_DEFAULT_DOC.defaults;
  const when = [`ทุก${weekdayName(firstDate)}`, timeRangeLabel(startTime, endTime)].filter(Boolean).join(" ");
  const first = bangkokToday(now) <= firstDate ? ` รอบแรก ${formatThaiDate(firstDate)}` : "";
  return `ตอนนี้นัดกัน${when}${first} มาทำโปรเจกต์ต่อและอัปเดตกัน เลือกวันที่สะดวกได้หลายวัน`;
}

/** Existing cohort offer, with a SHIFT[2]-only test approved on 2026-10-20.
 *  Prices are monthly; this changes no SHIFT course fees. */
export const COMMUNITY_RESEARCH_PRICE = 690;
export const SHIFT_2_ALUMNI_TEST_PRICE = 300;

/** Stored answers do not record the quoted price, so admin labels must not
 *  assign today's offer to historical sign-ups. */
export const FEEDBACK_COMMUNITY_SIGNUP = [
  { value: "join", label: "สมัคร AfterSHIFT" },
  { value: "ask_parents", label: "ขอคุยกับผู้ปกครองก่อน" },
  { value: "not_now", label: "ยังไม่ตอนนี้" },
] as const;

export function communitySignupOffer(round: number) {
  const price = round === 2 ? SHIFT_2_ALUMNI_TEST_PRICE : COMMUNITY_RESEARCH_PRICE;
  const audience = round === 2 ? "ราคาทดลองสำหรับศิษย์เก่า SHIFT[2]" : "ราคาทดลอง";
  return {
    price,
    options: FEEDBACK_COMMUNITY_SIGNUP.map((option) => ({
      ...option,
      label: option.value === "join" ? `สมัคร AfterSHIFT ${audience} เดือนละ ${price} บาท` : option.label,
    })),
    hint:
      "AfterSHIFT ช่วยต่อยอดโปรเจกต์หลังจบ 7 วัน ผ่านการลงมือทำกับเพื่อนและพี่เมนเทอร์ " +
      `${audience} เดือนละ ${price} บาท เป็นการทดสอบรูปแบบและราคา ` +
      "สมัครไว้ก่อนได้ พี่จะส่งรายละเอียดกับวิธีจ่ายในกลุ่ม ยังไม่ต้องจ่ายตอนนี้ และตอบฟีดแบ็กได้เหมือนเดิมแม้ไม่เข้าร่วม",
  };
}

/** How a student lets us quote them. "named" credits them with a name they
 *  type themselves, never the nickname they answered with. */
export const FEEDBACK_QUOTE_MODES = [
  { value: "named", label: "ได้ ใส่ชื่อที่เราเลือกเอง" },
  { value: "anonymous", label: "ได้ แต่ไม่ใส่ชื่อ" },
  { value: "no", label: "ไม่ได้" },
] as const;

/** PDPA notice shown above the consent box. Bump the version when the
 *  substance changes, so stored rows say which text they agreed to. */
/** Numbered questions on the form, shown in the page header. */
export const FEEDBACK_QUESTION_COUNT = 15;

export const FEEDBACK_NOTICE_VERSION = "2026-10-20";
export const FEEDBACK_RETENTION_YEARS = 1;

const values = <T extends readonly { value: string }[]>(options: T) =>
  options.map((o) => o.value) as unknown as [T[number]["value"], ...T[number]["value"][]];

const answer = (message: string) =>
  z.string().trim().min(2, message).max(1000, "ยาวเกินไปนิด ลองย่อหน่อยนะ");

/** Tick-all list where one option (e.g. "not now") stands alone. */
const exclusiveList = <T extends [string, ...string[]]>(options: T, alone: T[number], message: string) =>
  z
    .array(z.enum(options))
    .min(1, "เลือกอย่างน้อยหนึ่งข้อนะ")
    .refine((picked) => !picked.includes(alone) || picked.length === 1, { message });

const scale = (min: number, max: number) =>
  z.number({ message: "เลือกคะแนนด้วยนะ" }).int().min(min).max(max);

export const shiftFeedbackSchema = z.object({
  round: z.number().int().nonnegative(),
  nickname: z.string().trim().min(1, "ใส่ชื่อเล่นด้วยนะ").max(30, "ชื่อยาวเกินไป"),
  satisfaction: scale(1, 5),
  canDoNow: answer("เล่าสั้นๆ ก็ได้นะ"),
  confidence: scale(1, 5),
  ownership: scale(1, 5),
  ownDecision: answer("นึกถึงสักครั้งก็ได้ เล็กๆ ก็นับ"),
  motivation: z.enum(values(FEEDBACK_MOTIVATIONS), { message: "เลือกข้อที่ตรงที่สุดนะ" }),
  mostValuable: answer("บอกหน่อยว่าส่วนไหน"),
  changeNext: answer("ไม่มีก็พิมพ์ว่า ไม่มี ได้"),
  priceFit: z.enum(values(FEEDBACK_PRICE_FIT), { message: "เลือกหนึ่งข้อนะ" }),
  payer: z.enum(values(FEEDBACK_PAYERS), { message: "เลือกหนึ่งข้อนะ" }),
  recommend: scale(0, 10),
  continueProject: z.enum(values(FEEDBACK_CONTINUE_PROJECTS), { message: "เลือกหนึ่งข้อนะ" }),
  continueProjectNote: z
    .string()
    .trim()
    .max(200, "ยาวเกินไปนิด ลองย่อหน่อยนะ")
    .optional()
    .transform((value) => (value ? value : null)),
  availableDays: exclusiveList(values(FEEDBACK_DAYS), "none", "ยังไม่สะดวก เลือกคู่กับวันอื่นไม่ได้นะ"),
  nextSteps: exclusiveList(values(FEEDBACK_NEXT_STEPS), "not_now", "ยังไม่ตอนนี้ เลือกคู่กับข้ออื่นไม่ได้นะ"),
  communitySignup: z.enum(values(FEEDBACK_COMMUNITY_SIGNUP), { message: "เลือกหนึ่งข้อนะ" }),
  quoteMode: z.enum(values(FEEDBACK_QUOTE_MODES), { message: "บอกหน่อยว่าให้ยกไปใช้ได้ไหม" }),
  quoteName: z
    .string()
    .trim()
    .max(40, "ชื่อยาวเกินไป")
    .optional()
    .transform((value) => (value ? value : null)),
  consent: z.literal(true, { errorMap: () => ({ message: "ติ๊กยินยอมก่อนส่งนะ" }) }),
  /** Honeypot. Humans never see it; bots fill it. */
  website: z.string().max(0).optional(),
}).superRefine((feedback, ctx) => {
  if (feedback.quoteMode === "named" && !feedback.quoteName) {
    ctx.addIssue({ code: "custom", path: ["quoteName"], message: "ใส่ชื่อที่อยากให้ขึ้นด้วยนะ" });
  }
});

export type ShiftFeedbackInput = z.input<typeof shiftFeedbackSchema>;
export type ShiftFeedback = z.output<typeof shiftFeedbackSchema>;
export type ShiftFeedbackErrors = Partial<Record<keyof ShiftFeedbackInput, string>>;

/** First message per field, in the shape the form renders. */
export function toFeedbackErrors(error: z.ZodError): ShiftFeedbackErrors {
  const errors: ShiftFeedbackErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as keyof ShiftFeedbackInput | undefined;
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}
