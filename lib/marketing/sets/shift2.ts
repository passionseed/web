import {
  SHIFT_COHORT_2,
  SHIFT_PAYMENT,
  formatThaiDate,
  pairPriceBaht,
  priceLabel,
} from "@/lib/content/shift-cohort";

import type { StudioSet } from "../types";

/**
 * SHIFT[2] posts. Dates, price and seats come from the cohort record, so
 * captions follow a date move without a rewrite.
 */

const C = SHIFT_COHORT_2;
const start = formatThaiDate(C.startDate);
const end = formatThaiDate(C.endDate);
const deadline = formatThaiDate(C.applyDeadline);
const pair = pairPriceBaht(C);
const COHORT_SOURCE = "lib/content/shift-cohort.ts (SHIFT_COHORT_2)";

/** Slides 2-4 of the new-date carousel; slide 1 is the hand-made poster
 *  (/shift/poster/2/moved, #shift-moved-feed). */
export const SHIFT2_NEW_DATE: StudioSet = {
  slug: "shift2-new-date",
  title: "SHIFT[2] new start date (carousel slides 2-4)",
  channel: "instagram",
  format: "ig-portrait",
  theme: "night",
  audience: "student",
  shiftRound: 2,
  pageOffset: 1,
  angle: `SHIFT[2] moved to ${C.startDate}: same 7 days, new schedule, offer, how to apply.`,
  sources: [COHORT_SOURCE, "lib/content/shift-cohort.ts SHIFT_SKILL_CARDS"],
  caption: [
    `${C.name} เลื่อนวันเริ่มเป็น ${start}`,
    "",
    `ครบ 7 วันเท่าเดิม เรียนออนไลน์บน Discord ทุกเย็น ${C.sessionTime} น. จบด้วย Demo Day ${end}`,
    "",
    "7 วันนี้ เราเลือกปัญหาเอง ไปคุยกับคนที่เจอปัญหานั้นจริง สร้างต้นแบบที่คนนอกลองใช้ได้ แล้วสรุปทุกอย่างเป็นพอร์ต 1 หน้า ไม่ต้องมีพื้นฐานเขียนโค้ด ใช้ AI ช่วยสร้าง",
    "",
    `${priceLabel(C)} ต่อคน${pair !== null ? ` มากับเพื่อน จ่ายคนละ ฿${pair}` : ""}`,
    `รับ ${C.seats} คน สมัครได้ถึง ${deadline} ก่อนคลาสแรก`,
    "",
    "คอมเมนต์ \"SHIFT\" แล้วรับลิงก์สมัครทาง DM",
    `สมัครไว้แล้วและมีคำถามเรื่องวันใหม่ ทัก LINE ${SHIFT_PAYMENT.lineId}`,
  ].join("\n"),
  hashtags: ["PassionSeed", "SHIFT", "พอร์ตTCAS", "ทำพอร์ต"],
  created: "2026-10-11",
  slides: [
    { kind: "schedule", tag: "7 วัน 7 เย็น", title: "ตารางใหม่ ครบ 7 วันเท่าเดิม", round: 2 },
    {
      kind: "points",
      tag: "What you ship",
      title: "จบ 7 วัน มีอะไรติดมือ",
      points: [
        { title: "ต้นแบบที่คนนอกลองใช้ได้", body: "ใช้ AI ช่วยสร้าง ไม่ต้องมีพื้นฐาน ไม่ต้องสวย" },
        { title: "หลักฐานจากคนลองใช้จริง", body: "คำพูดของคนใช้ และจุดที่พังแล้วเราแก้ยังไง" },
        { title: "พอร์ต 1 หน้า", body: "สรุปทั้งหมดใน 1 หน้า ใส่พอร์ตและใช้เล่าตอนสัมภาษณ์" },
      ],
      footnote: "ทำเดี่ยวหรือทีม 1-3 คน ทุกเย็นทั้งห้องโชว์ว่าอะไรใช้ได้ อะไรพัง และเรียนอะไรมา",
    },
    { kind: "offer", tag: "Price", title: "ราคาและวิธีสมัคร", round: 2 },
  ],
};

export const SHIFT2_PARENTS: StudioSet = {
  slug: "shift2-parents",
  title: "SHIFT[2] for parents",
  channel: "instagram",
  format: "ig-portrait",
  theme: "night",
  audience: "parent",
  shiftRound: 2,
  angle: "Parents: what you can actually open and check after 7 days, how the week is supervised, the refund line.",
  sources: [
    COHORT_SOURCE,
    "components/shift/poster/risoGrid/slidesOffer.tsx (PARENT_POINTS, refund condition)",
    "lib/content/shift-voices.ts potterSelfTaught (consent 2026-10-07)",
  ],
  caption: [
    "สำหรับผู้ปกครอง: 7 วันนี้ได้อะไรที่เปิดดูได้จริง",
    "",
    "จบ SHIFT นักเรียนมีลิงก์ต้นแบบที่กดใช้ได้ คำพูดจริงของคนที่ลองใช้ และพอร์ต 1 หน้าที่สรุปว่าเลือกปัญหาอะไร คุยกับใคร อะไรพัง แล้วแก้ยังไง",
    "",
    `เรียนออนไลน์จากบ้านบน Discord ทุกเย็น ${C.sessionTime} น. มี mentor อยู่ในห้องทุกเย็น`,
    "ไม่ได้ชิ้นงาน คืนเงินเต็ม: ถ้าจบวันที่ 7 แล้วไม่มีชิ้นงานในมือ",
    "",
    `${C.name} เริ่ม ${start} ถึง ${end} · ${priceLabel(C)} ต่อคน · รับ ${C.seats} คน`,
    `ผู้ปกครองสอบถามได้ที่ LINE ${SHIFT_PAYMENT.lineId}`,
  ].join("\n"),
  hashtags: ["PassionSeed", "SHIFT", "TCAS", "ผู้ปกครอง"],
  created: "2026-10-11",
  slides: [
    {
      kind: "cover",
      kicker: "For parents",
      icon: "live",
      title: ["ไม่ใช่ใบเซอร์อีกใบ", "แต่เป็นงาน", "ที่เปิดดูได้จริง"],
      sub: `${C.name} · ${start} ถึง ${end} · ออนไลน์จากบ้าน`,
      sky: true,
    },
    {
      kind: "points",
      tag: "What you can check",
      title: "จบ 7 วัน เปิดดูอะไรได้บ้าง",
      numbered: true,
      points: [
        { title: "ลิงก์ต้นแบบที่กดใช้ได้", body: "ไม่ใช่แค่สไลด์ ลองกดใช้เองได้เลย" },
        { title: "คำพูดจริงของคนที่ลองใช้", body: "จดเป็นคำต่อคำ ไม่ใช่สรุปให้ดูดี" },
        { title: "พอร์ต 1 หน้า", body: "ปัญหาที่เลือก คนที่ไปคุยด้วย จุดที่พัง และวิธีแก้" },
      ],
    },
    {
      kind: "points",
      tag: "How the week runs",
      title: "ดูแลกันยังไง",
      points: [
        { title: `mentor อยู่ในห้องทุกเย็น ${C.sessionTime} น.`, body: "คุยงานกันในห้อง Discord ของทีม ที่ทีมงานเห็น" },
        { title: "เรียนจากบ้าน", body: "ออนไลน์ทั้งหมด ไม่ต้องเดินทาง ไม่ต้องค้างคืน" },
        { title: "ไม่ต้องมีพื้นฐานเขียนโค้ด", body: "ใช้ AI ช่วยสร้าง แต่นักเรียนเป็นคนตัดสินใจเอง" },
        { title: "==ไม่ได้ชิ้นงาน คืนเงินเต็ม==", body: "ถ้าจบวันที่ 7 แล้วไม่มีชิ้นงานในมือ" },
      ],
    },
    {
      kind: "quote",
      tag: "From SHIFT[0]",
      voice: "potterSelfTaught",
      context: "นักเรียนรุ่นทดลอง เล่าหลังจบ 7 วัน",
    },
    { kind: "offer", tag: "Price", title: "ราคาและวิธีสมัคร", round: 2 },
  ],
};

export const SHIFT2_SETS: StudioSet[] = [SHIFT2_NEW_DATE, SHIFT2_PARENTS];
