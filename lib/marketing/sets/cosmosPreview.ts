import {
  SHIFT_COHORT_0,
  SHIFT_COHORT_3,
  SHIFT_PAYMENT,
  formatThaiDate,
  formatThaiDateRange,
  pairPriceBaht,
  priceLabel,
  teamSizeLabel,
} from "@/lib/content/shift-cohort";

import type { StudioSet } from "../types";

/**
 * One slide of every kind on the cosmos theme, for visual QA of the SHIFT[3]
 * look. Not a post: every date, price and seat count is read from the
 * cohort record so the copy can be lifted into a real set as is.
 */

const C = SHIFT_COHORT_3;
const range = formatThaiDateRange(C.startDate, C.endDate);
const deadline = formatThaiDate(C.applyDeadline);
const pair = pairPriceBaht(C);

export const COSMOS_PREVIEW: StudioSet = {
  slug: "cosmos-preview",
  title: "Cosmos theme preview (QA, every slide kind)",
  channel: "instagram",
  format: "ig-portrait",
  theme: "cosmos",
  audience: "student",
  shiftRound: C.round,
  angle: "QA only: every studio slide kind on the SHIFT[3] cosmos theme. Not for posting.",
  sources: ["lib/content/shift-cohort.ts SHIFT_COHORT_3"],
  caption: [
    `${C.name} · ${range}`,
    "",
    `${C.schedule.length} วัน ${C.schedule.length} เย็น ออนไลน์บน Discord ทุกเย็น ${C.sessionTime} น. ทำเดี่ยวหรือทีม ${teamSizeLabel(C)} ไม่ต้องมีพื้นฐานเขียนโค้ด ใช้ AI ช่วยสร้าง แต่เราเป็นคนตัดสินใจเอง`,
    "",
    "จบแล้วมีต้นแบบที่คนนอกลองใช้ บันทึกว่าอะไรพังและแก้ยังไง และพอร์ต 1 หน้าสำหรับสัมภาษณ์ TCAS รอบ 1",
    "",
    `${priceLabel(C)} ต่อคน${pair !== null ? ` สมัครคู่กับเพื่อน จ่ายคนละ ฿${pair}` : ""} · รับ ${C.seats} คน`,
    `สมัครได้ถึง ${deadline} ใบสมัครใช้เวลาประมาณ 2 นาที`,
    "",
    "คอมเมนต์ \"SHIFT\" แล้วรับลิงก์สมัครทาง DM",
    `มีคำถาม ทัก LINE ${SHIFT_PAYMENT.lineId}`,
  ].join("\n"),
  hashtags: ["PassionSeed", "SHIFT", "พอร์ตTCAS", "TCAS1"],
  created: "2026-10-23",
  slides: [
    {
      kind: "cover",
      kicker: `Builder sprint · ${C.schedule.length} days`,
      title: [`${C.schedule.length} วัน`, "ปั้น**โปรเจกต์จริง**", "ให้คนนอกได้ลองใช้"],
      sub: `${range} · ออนไลน์บน Discord ทุกเย็น ${C.sessionTime} น.`,
      sky: true,
      wordmark: true,
      icon: "rocket",
    },
    {
      kind: "points",
      tag: "What you leave with",
      title: `หลังวันที่ ${C.schedule.length} มีอะไรติดมือ`,
      numbered: true,
      points: [
        { title: "ต้นแบบที่คนนอกลองใช้แล้ว", body: "AI ช่วยสร้าง เราเป็นคนตัดสินใจ ไม่ต้องเขียนโค้ดเป็น" },
        { title: "บันทึกว่าอะไรพัง แล้วแก้ยังไง", body: "จดทุกจุดที่คนใช้ติด กับสิ่งที่เปลี่ยนในแต่ละวัน" },
        { title: "พอร์ต 1 หน้า สำหรับ TCAS รอบ 1", body: "เล่าได้ทันทีตอนสัมภาษณ์ ว่าเลือกปัญหานี้เพราะอะไร" },
        { title: "==ไม่คุ้ม คืนเงินเต็ม==", body: "ทำครบทุกขั้นแล้วยังรู้สึกว่าไม่คุ้ม" },
      ],
    },
    {
      kind: "compare",
      tag: "Picking a problem",
      title: `เลือกโจทย์ให้ทันใน ${C.schedule.length} วัน`,
      left: {
        label: "โจทย์ที่กว้างไป",
        items: ["แอปช่วยนักเรียนทุกคนเรื่องเรียน", "ระบบที่ต้องรอครูอนุมัติก่อนเริ่ม"],
      },
      right: {
        label: "โจทย์ที่เริ่มได้วันนี้",
        items: ["ปัญหาเดียว ของคนกลุ่มเดียว", "หาคนลองใช้ผ่านสภานักเรียน"],
      },
      footnote: "รุ่นก่อนหลายคนบอกว่าการเลือกโจทย์ยากที่สุด วันแรกเลยช่วยกันตัดให้เหลือเรื่องเดียว",
    },
    {
      kind: "chat",
      tag: "Tester DM",
      title: "ทักคนแปลกหน้าให้ลองใช้",
      lines: [
        { from: "me", text: "สวัสดีครับ/ค่ะ เราเป็นนักเรียน ม.5 ทำเว็บช่วยวางตารางอ่านหนังสือ ขอเวลา 5 นาที ช่วยลองใช้หน่อยได้ไหม" },
        { from: "them", text: "ได้ ลองแล้วนะ **ปุ่มบันทึกหายาก** กดไม่เจอเลย" },
        { from: "me", text: "ขอบคุณมาก ขอจดคำนี้ไว้ พรุ่งนี้ส่งเวอร์ชันใหม่ให้ลองอีกรอบได้ไหม" },
      ],
      footnote: "ทักทีละคน ไม่ต้องโพสต์ลงสตอรี่ แล้วจดคำพูดของเขาตามจริง",
    },
    {
      kind: "quote",
      tag: `From ${SHIFT_COHORT_0.name}`,
      voice: "potterIntrovert",
      context: "นักเรียนรุ่นทดลอง เล่าวันที่ต้องออกไปคุยกับคนใช้จริง",
    },
    {
      kind: "statement",
      tag: "Portfolio",
      big: ["สัมภาษณ์ TCAS", "เล่าจาก**ของจริง**"],
      body: "รอบสัมภาษณ์คือส่วนที่หลายคนกลัวที่สุด พอมีต้นแบบ คนที่ลองใช้ และสิ่งที่แก้ไปแล้ว คำตอบก็มาจากงานที่ทำเอง",
      note: "ไม่ต้องท่องคำตอบ",
    },
    {
      kind: "schedule",
      tag: `${C.schedule.length} วัน ${C.schedule.length} เย็น`,
      title: `ทุกเย็น ${C.sessionTime} น. บน Discord`,
      round: C.round,
    },
    { kind: "offer", tag: "Price", title: "ราคาและวิธีสมัคร", round: C.round },
    {
      kind: "cta",
      tag: "Apply",
      title: "อยากเริ่ม\nโปรเจกต์แรก",
      action: "comment",
      body: `รับลิงก์สมัครทาง DM สมัครได้ถึง **${deadline}**`,
      icon: "send",
    },
  ],
};

/** One slide of every kind on the cosmos theme, for visual QA only. */
export const COSMOS_PREVIEW_SETS: StudioSet[] = [COSMOS_PREVIEW];
