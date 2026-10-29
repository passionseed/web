import {
  SEEDSTACK_ADULT_AGE,
  needsParent,
  parseBirthDate,
  type SeedstackNoticeRow,
} from "@/lib/seedstack/consent";
import type { ShiftApplicationRow } from "@/types/shift";

/**
 * PDPA parent consent for SHIFT applicants. Under 20 (Thai age of majority,
 * PDPA s.20) a parent must agree before the paid seat is confirmed. The
 * student still applies alone and may join Discord meanwhile: applying is a
 * step taken at their own request (s.24(3)), the paid contract is not.
 *
 * Bump SHIFT_NOTICE_VERSION whenever SHIFT_NOTICE changes in substance.
 */

export const SHIFT_NOTICE_VERSION = "2026-10-29";
export const SHIFT_ADULT_AGE = SEEDSTACK_ADULT_AGE;
export const PARENT_RELATIONSHIPS = ["พ่อ", "แม่", "ผู้ปกครอง"] as const;

/**
 * True unless the birth date is valid and 20+. Unknown counts as a minor.
 * Takes anything because zod hands refinements a non-string after a failed
 * birth date transform.
 */
export function applicantNeedsParent(birthDate: unknown, now = Date.now()): boolean {
  return needsParent(parseBirthDate(typeof birthDate === "string" ? birthDate : null, now), now);
}

export type ParentConsentState =
  | "not_needed"
  | "legacy"
  | "waiting"
  | "agreed"
  | "declined"
  | "withdrawn";

export type ParentConsentRow = Pick<
  ShiftApplicationRow,
  | "birth_date"
  | "consent_notice_version"
  | "parent_consented_at"
  | "parent_declined_at"
  | "parent_withdrawn_at"
>;

/**
 * The parent's answer wins over everything, so a legacy row whose parent
 * answered from a link an admin sent still shows that answer. Rows from
 * before the notice existed are "legacy" and never gated.
 */
export function parentConsentState(row: ParentConsentRow, now = Date.now()): ParentConsentState {
  if (row.parent_withdrawn_at) return "withdrawn";
  if (row.parent_consented_at) return "agreed";
  if (row.parent_declined_at) return "declined";
  if (!row.consent_notice_version) return "legacy";
  if (row.birth_date && !needsParent(row.birth_date, now)) return "not_needed";
  return "waiting";
}

/** Whether an admin may mark the applicant paid, which admits them to the round. */
export function blocksPaidAdmission(state: ParentConsentState): boolean {
  return state === "waiting" || state === "declined" || state === "withdrawn";
}

export const SHIFT_NOTICE: { title: string; rows: readonly SeedstackNoticeRow[] } = {
  title: "ข้อมูลในใบสมัครไปไหนบ้าง",
  rows: [
    {
      emoji: "🧭",
      lead: "ใช้ทำอะไร",
      short: "คัดเลือก ติดต่อกลับ ยืนยันที่นั่ง และดูแลระหว่าง SHIFT เท่านั้น",
      text: "ใช้คัดเลือก ติดต่อกลับ ยืนยันที่นั่งและการชำระเงิน จัดกลุ่ม และดูแลระหว่าง SHIFT เท่านั้น เป็นขั้นตอนที่ผู้สมัครขอเองและจำเป็นต่อการเข้าร่วม (PDPA มาตรา 24(3)) ไม่ขาย และไม่ส่งข้อมูลในใบสมัครไปใช้ยิงโฆษณา",
    },
    {
      emoji: "📍",
      lead: "เก็บอะไรบ้าง",
      short: "คำตอบในใบสมัคร วันเกิด และช่องทางติดต่อผู้ปกครอง",
      items: [
        "ชื่อ ชื่อเล่น ชั้นเรียน และวันเกิด",
        "สายที่สนใจ ปัญหาที่อยากแก้ เวลาว่าง และรู้จัก SHIFT จากไหน",
        "IG และ Discord",
        "อายุไม่ถึง 20 ปี: อีเมล และเบอร์หรือ LINE ของผู้ปกครอง",
        "ถ้าเชื่อม Discord: Discord ID ชื่อผู้ใช้ และอีเมลของบัญชีนั้น",
        "ตอนผู้ปกครองกดยินยอม: ชื่อที่พิมพ์ เวลา IP และเบราว์เซอร์ เก็บเป็นหลักฐานการลงชื่ออิเล็กทรอนิกส์",
      ],
    },
    {
      emoji: "👀",
      lead: "ใครเห็นบ้าง",
      short: "ทีม SHIFT และผู้ให้บริการที่ช่วยเราทำงาน ไม่ขายให้ใคร",
      items: [
        "ทีม SHIFT ของ PassionSeed",
        "Supabase และ Vercel: เก็บข้อมูลและรันเว็บ",
        "Discord: ห้องเรียน SHIFT และแจ้งทีมเมื่อมีใบสมัครใหม่ (ส่งแค่ชื่อเล่น ชั้น สายที่สนใจ และปัญหา)",
        "Resend: ส่งอีเมลถึงผู้ปกครอง",
        "LINE: คุยเรื่องการโอนเงินและสลิป",
      ],
    },
    {
      emoji: "🌏",
      lead: "ข้อมูลอยู่ที่ไหน",
      short: "เซิร์ฟเวอร์ของผู้ให้บริการบางรายอยู่นอกประเทศไทย",
      text: "เซิร์ฟเวอร์ของผู้ให้บริการด้านบนบางรายอยู่นอกประเทศไทย เราส่งไปเท่าที่จำเป็นต่อการจัด SHIFT และใช้ผู้ให้บริการที่มีมาตรการคุ้มครองข้อมูล",
    },
    {
      emoji: "🗓️",
      lead: "เก็บนานแค่ไหน",
      short: "ไม่ได้เข้าร่วม ลบภายใน 1 ปีหลังรอบจบ",
      text: "ไม่ได้เข้าร่วม: ลบภายใน 1 ปีหลังรอบที่สมัครจบ เข้าร่วมแล้ว: เก็บไว้ตลอดที่ยังอยู่ในชุมชน SHIFT และลบเมื่อขอ ยกเว้นหลักฐานการชำระเงินที่กฎหมายให้เก็บ",
    },
    {
      emoji: "👪",
      lead: `อายุยังไม่ถึง ${SHIFT_ADULT_AGE} ปี`,
      short: "ผู้ปกครองกดยินยอมผ่านลิงก์ในอีเมล ก่อนยืนยันที่นั่ง",
      text: "ตามกฎหมาย PDPA ผู้ปกครองต้องยินยอมด้วย เราส่งลิงก์ไปที่อีเมลผู้ปกครอง ให้อ่านรายละเอียดแล้วพิมพ์ชื่อเพื่อยืนยัน ระหว่างรอ สมัครและเข้า Discord ได้ตามปกติ แต่ยืนยันที่นั่งได้หลังผู้ปกครองยินยอมแล้ว",
    },
    {
      emoji: "🤖",
      lead: "AI ช่วยติดตามความคืบหน้า (เลือกได้)",
      short: "ยินยอมแยกจากการสมัคร ไม่ยินยอมก็เรียน SHIFT ได้ครบ",
      text: "ใน SHIFT มีเครื่องมือ AI (SeedStack) ส่งความคืบหน้าสั้นๆ ให้พี่ mentor เห็นว่าทำถึงไหน ติดตรงไหน เพื่อเข้าไปช่วยได้ทัน AI ไม่ได้ตัดสินแทนคน พี่ mentor เป็นคนดูเอง ผู้ให้บริการ AI บางรายอยู่นอกประเทศไทย ส่วนนี้ยินยอมแยกจากการสมัคร ไม่ยินยอมก็เรียน SHIFT ได้ครบทุกอย่าง",
    },
    {
      emoji: "🍪",
      lead: "คุกกี้",
      short: "Meta Pixel ทำงานเฉพาะเมื่อกดยอมรับคุกกี้",
      text: "หน้า SHIFT ใช้ Meta Pixel วัดผลโฆษณา เฉพาะเมื่อกดยอมรับคุกกี้ ไม่ยอมรับก็สมัครได้ตามปกติ",
    },
    {
      emoji: "💬",
      lead: "สิทธิและช่องทางติดต่อ",
      short: "ขอดู แก้ ลบ หรือถอนความยินยอมได้ ทักพี่ใน LINE ของ SHIFT",
      text: "ผู้สมัครและผู้ปกครองขอดู ขอสำเนา แก้ ลบ คัดค้าน หรือถอนความยินยอมได้ทุกเมื่อ ทักพี่ใน LINE ของ SHIFT ผู้ควบคุมข้อมูลคือ PassionSeed Company Limited, 135/4 Patak Street, Karon, Phuket 83100 และร้องเรียนต่อสำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล (สคส.) ได้",
    },
  ],
};
