/**
 * The questions a student or parent still has after reading the home page,
 * each answered in one breath. Every answer restates a fact that already
 * lives elsewhere (the day schedule, the cohort's team size, the refund
 * rule), so nothing here is a new promise.
 *
 * Thai reviewed by Codex, Antigravity and Cursor on 2026-11-11.
 */

import { type ShiftCohort } from "@/lib/content/shift-cohort";

export interface HomeFaq {
  q: string;
  a: string;
}

export const HOME_FAQ_HEADING = "คำถามที่เจอบ่อย";

export function homeFaqs(cohort: ShiftCohort): HomeFaq[] {
  return [
    {
      q: "เขียนโค้ดไม่เป็น ลงได้ไหม",
      a: "ได้ ของที่สร้างจะเป็นเว็บ ฟอร์ม ฮาร์ดแวร์ หรือกระดาษก็ได้ ขอแค่คนนอกลองใช้ได้จริง",
    },
    {
      q: "ยังไม่มีไอเดีย ลงได้ไหม",
      a: "ได้ วันแรกเราช่วยกันหาโจทย์ แล้วตัดให้เหลือโจทย์เดียวที่ทำจบได้ใน 7 วัน",
    },
    {
      q: "ต้องใช้เวลาวันละเท่าไหร่",
      a: "ประมาณวันละ 1-2 ชั่วโมง เจอกันใน Discord ไม่ต้องลาเรียน",
    },
    {
      q: "ต้องมีทีมไหม",
      a: `ไม่ต้อง ทำคนเดียวก็ได้ หรือรวมทีมกับเพื่อน ทีมละไม่เกิน ${cohort.teamSize.max} คน`,
    },
    {
      q: "ถ้าทำแล้วพัง หรือไม่มีคนใช้ล่ะ",
      a: "ไม่เป็นไร จดไว้ว่าอะไรพัง หรือทำไมยังไม่มีคนใช้ แล้วเราแก้ยังไง บันทึกนี้ใส่พอร์ตได้",
    },
    {
      q: "ถ้าลงแล้วรู้สึกว่าไม่คุ้มล่ะ",
      a: "ถ้าทำครบทุกขั้นตอนทั้ง 7 วันแล้วยังรู้สึกว่าไม่คุ้ม เราคืนเงินให้เต็มจำนวน",
    },
  ];
}
