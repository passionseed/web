/**
 * Copy for the SHIFT High section on the landing pages (/ and /shift): the
 * community a student joins after the seven days. Three parts, in the order a
 * student asks about them: who is there, what they aim for, what they earn.
 *
 * Every claim traces to the company brain (alumni.md, community.md and the
 * decision log of 2026-10-25 and 2026-10-30). Nothing here is a price, and
 * nothing is a promise of an outcome: the destinations are what we aim for.
 * The weekly day and time are not written here: they come from the alumni
 * calendar, so moving the session only edits the calendar.
 *
 * Thai reviewed by Codex, Antigravity and Cursor on 2026-11-11; lines two or
 * more of them flagged were rewritten.
 */

import type { RisoIconName } from "@/components/shift/poster/RisoIcons";
import { timeRangeLabel, weekdayName, type AlumniDefaults } from "@/lib/content/shift-alumni";

export const SHIFT_HIGH_PATH = "/shift/alumni";

export const SHIFT_HIGH = {
  eyebrow: "SHIFT HIGH",
  heading: "จบ 7 วันแล้ว ไม่ต้องสร้างต่อคนเดียว",
  lede: "ทุกคนที่จบ SHIFT ได้เข้า SHIFT High คอมมูนิตี้ของคนที่อยากปั้นโปรเจกต์ต่อ ให้มีคนใช้มากขึ้น",
  cta: "ดูตารางนัด SHIFT High",
  note: "เป้าเป็นของเราเอง ไม่มีใครสั่ง",
} as const;

export interface ShiftHighPoint {
  icon: RisoIconName;
  title: string;
  body: string;
}

/** Who is there. The first point's body is the live session line. */
export const SHIFT_HIGH_COMMUNITY = {
  label: "Community",
  title: "เพื่อนที่กำลังสร้างของจริงเหมือนกัน",
  points: [
    { icon: "calendar", title: "นัดกันทุกสัปดาห์", body: "" },
    {
      icon: "people",
      title: "ทีมเล็ก 3-4 คน",
      body: "อัปเดตกันสั้น ๆ ว่าทำอะไรไปแล้ว จะทำอะไรต่อ และติดตรงไหน",
    },
    {
      icon: "mic",
      // Months, not "เทอม 2": the meetups follow the university semester
      // (January to May 2027), which is not a school term.
      title: "นัดเจอตัวจริง",
      body: "ช่วง ม.ค.-พ.ค. 2570 มีนัดเจอกันแบบออนไซต์ เข้าฟรี มาสร้างต่อด้วยกัน แล้วโชว์งานใน demo day",
    },
  ] satisfies ShiftHighPoint[],
} as const;

/** One line of the goal card, as it appears on the alumni board. */
export interface GoalCardRow {
  label: string;
  /** An example answer, shown as handwriting. */
  example: string;
}

/** What they aim for: the goal card every member fills in. */
export const SHIFT_HIGH_GOALS = {
  label: "Goals",
  title: "ตั้งเป้าเอง แล้วกลับมาเช็กกันทุกสัปดาห์",
  body: "ทุกคนมีการ์ดเป้าหมายของตัวเอง เขียนเอง เลือกเอง นัดถัดไปค่อยมาดูกันว่าทำได้หรือยัง",
  cardName: "Goal card",
  cardTag: "ตัวอย่าง",
  rows: [
    { label: "เป้าใหญ่", example: "แอปที่เพื่อนทั้งห้องใช้จริง" },
    { label: "อีก 1 เดือน", example: "มีผู้ใช้จริง 5 คน" },
    { label: "สัปดาห์นี้", example: "ให้เพื่อน 3 คนลองใช้ แล้วจดว่าติดตรงไหน" },
    { label: "เสร็จเมื่อ", example: "ได้ฟีดแบ็กครบ 3 คน" },
    { label: "ก้าวแรก ไม่เกิน 10 นาที", example: "ส่งลิงก์ให้เพื่อนคนแรก" },
  ] satisfies GoalCardRow[],
  checkIn: "เช็กกันนัดหน้า",
} as const;

/** What they earn. Things a student carries away, not certificates. */
export const SHIFT_HIGH_PRIZES = {
  label: "Prizes",
  title: "รางวัลที่นี่ไม่ใช่ใบเซอร์",
  points: [
    {
      icon: "trophy",
      title: "เวที demo day",
      body: "ขึ้นเล่าว่าโปรเจกต์ไปถึงไหนแล้ว ให้เพื่อนในคอมมูนิตี้ฟัง",
    },
    {
      icon: "rocket",
      title: "ได้นำวงเอง",
      body: "คนใน SHIFT High ผลัดกันเป็น co-host ของนัดประจำสัปดาห์",
    },
    {
      icon: "target",
      title: "ทางไปต่อหลังโปรเจกต์",
      body: "เป้าของเราคือช่วยให้พร้อมรับงานจริง ไปฝึกงาน หรือกลับไปเปิดวงสร้างของที่โรงเรียนตัวเอง",
    },
  ] satisfies ShiftHighPoint[],
} as const;

/** "ทุกวันเสาร์ 19:00–21:00 น. ออนไลน์ใน Discord", from the alumni calendar. */
export function shiftHighSessionLine(defaults: AlumniDefaults): string {
  const time = timeRangeLabel(defaults.startTime, defaults.endTime);
  return [`ทุก${weekdayName(defaults.firstDate)}`, time, defaults.place].filter(Boolean).join(" ");
}
