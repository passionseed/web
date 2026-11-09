import { formatThaiDateRange, priceLabel } from "@/lib/content/shift-cohort";

import { SHIFT3 } from "../../../shift3/facts";

/**
 * Instagram captions for the five startup lab posters, one per poster key.
 * Each caption opens with the poster's headline as a sentence (it has to
 * work alone above the "more" fold), turns the feeling into one concrete
 * thing SHIFT[3] does, then ends in the same offer block and one CTA.
 * Facts come from SHIFT_COHORT_3 via SHIFT3, so a data edit updates them.
 */

const C = SHIFT3.cohort;
/** Full refund wording, as in the launch caption (rule: lib/content/shift-refund.ts). */
const REFUND_LINE = "ทำครบทุกขั้นแล้วยังรู้สึกว่าไม่คุ้ม คืนเงินเต็ม";

function offer({ refund = true }: { refund?: boolean } = {}): string[] {
  return [
    `${SHIFT3.name} แล็บสตาร์ทอัพเล็กๆ ${SHIFT3.days} คืน`,
    `${formatThaiDateRange(C.startDate, C.endDate)} ออนไลน์บน Discord ทุกเย็น ${SHIFT3.time} น.`,
    `${priceLabel(C)} ต่อคน${SHIFT3.pairPrice ? ` สมัครคู่กับเพื่อน จ่ายคนละ ${SHIFT3.pairPrice}` : ""}`,
    `รับ ${SHIFT3.seats} คน ปิดรับสมัคร ${SHIFT3.deadline}`,
    ...(refund ? [REFUND_LINE] : []),
    "",
    'คอมเมนต์ "SHIFT" แล้วรับลิงก์สมัครทาง DM',
    `หรือสมัครเองที่ ${SHIFT3.link} กรอกใบสมัคร 2 นาทีเสร็จ`,
  ];
}

const caption = (...blocks: string[][]) => blocks.map((b) => b.join("\n")).join("\n\n");

export const SHIFT3_LAB_HASHTAGS = ["PassionSeed", "SHIFT", "สตาร์ทอัพ", "พอร์ตTCAS", "ทำพอร์ต"];

export const SHIFT3_LAB_CAPTIONS: Record<string, string> = {
  founder: caption(
    ["หมวกทุกใบเป็นของคุณ", `ทีมแค่ ${SHIFT3.team} เลยไม่มีใครคิดแทน ไม่มีใครตัดสินใจให้`],
    [
      `${SHIFT3.days} คืนนี้ คุณได้ลองทุกบทบาทของคนทำสตาร์ทอัพ`,
      "CEO: เลือกโจทย์เอง",
      "RESEARCH: ไปคุยกับคนที่เจอปัญหาจริง",
      "BUILD: ใช้ AI สร้างต้นแบบ ไม่ต้องเขียนโค้ดเป็น",
      "GROWTH: หาคนนอกมาลองใช้",
    ],
    offer(),
  ),
  customer: caption(
    ["ของที่ไม่มีใครใช้ คือโปรดักต์ผี", "สร้างเสร็จ ปล่อยแล้ว เงียบ ไม่มีใครเปิด"],
    [
      "ลูกค้าไม่ได้อยากได้ไอเดียเรา เขาอยากให้ปัญหาของเขาหายไป",
      `${SHIFT3.name} เลยเริ่มกลับด้าน`,
      "คืนแรก ไปคุยกับคนที่เจอปัญหาก่อน",
      "แล้วค่อยสร้างต้นแบบให้คนจริงลองใช้",
      "จดว่าเขาติดตรงไหน แล้วแก้",
    ],
    offer(),
  ),
  "demo-day": caption(
    ["คนดูไม่ซื้อไอเดีย เขาซื้อหลักฐาน", `คืนที่ ${SHIFT3.demoDay} คือ Demo Day ทุกคนขึ้นพิตช์ของตัวเอง`],
    [
      "คำถามที่ทั้งห้องรอมีข้อเดียว: ใครใช้แล้ว?",
      "เล่าว่าเลือกแก้ปัญหาอะไร เปิดลิงก์ให้คนในห้องกดลองจริง",
      "บอกว่าใช้เครื่องมืออะไรสร้าง แล้วใครลองใช้แล้ว เขาว่ายังไง",
    ],
    offer(),
  ),
  parent: caption(
    ["ลองเป็น Founder ก่อนลงทุนจริง", `สำหรับผู้ปกครองที่อยากรู้ว่า ${SHIFT3.days} คืนนี้ได้อะไร และเสี่ยงแค่ไหน`],
    [
      `เวลา: ${SHIFT3.days} เย็น ${SHIFT3.time} น. ออนไลน์`,
      "ที่ทำงาน: ห้องกลุ่มบน Discord มี mentor ดูแล",
      "ได้กลับมา: ต้นแบบที่คนนอกลองใช้ และพอร์ต 1 หน้า",
      `ถ้าไม่คุ้ม: ${REFUND_LINE}`,
    ],
    offer({ refund: false }),
  ),
  lab: caption(
    ["เราไม่ให้ไอเดีย เราเปิดแล็บให้", "คืนแรกหาโจทย์ด้วยกัน แล้วคุณเลือกเอง"],
    ["คุณเอามา", "เรื่องที่อยากแก้ ยังไม่ชัดก็ได้", "กับความกล้าไปถามคนจริง"],
    ["แล็บมีให้", "ไลฟ์บน Discord ทุกเย็น", "AI ช่วยสร้าง ไม่ต้องเขียนโค้ดเป็น", "เพื่อนร่วมรุ่นช่วยกันดูงาน", "Mentor ถามให้คิด แต่ไม่คิดแทน"],
    ["ออกจากแล็บพร้อมต้นแบบที่คนจริงลองใช้ และพอร์ต 1 หน้า"],
    offer(),
  ),
};
