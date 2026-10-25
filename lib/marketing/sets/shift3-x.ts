import {
  SHIFT_COHORT_0,
  SHIFT_COHORT_3,
  cohortDayCount,
  cohortPath,
  formatThaiDate,
  pairPriceBaht,
  priceLabel,
  teamSizeLabel,
} from "@/lib/content/shift-cohort";

import type { XPost } from "../types";

/**
 * X (@PassionSeed_th) posts for the SHIFT[3] run-up, 24 Oct to Day 1.
 * Same shape as x.ts: single posts, not threads (X's scheduler only takes
 * single posts), up to four slides from an existing Studio set as images,
 * and every date, price, seat count and time read from SHIFT_COHORT_3.
 * Order below is the intended posting order.
 */

const C = SHIFT_COHORT_3;
const start = formatThaiDate(C.startDate);
const end = formatThaiDate(C.endDate);
const deadline = formatThaiDate(C.applyDeadline);
const price = priceLabel(C);
const pair = pairPriceBaht(C);
const days = cohortDayCount(C);
const team = teamSizeLabel(C);
/** "19:00", the start of the nightly session. */
const sessionStart = C.sessionTime.split("–")[0];
const day1 = C.schedule[0];
const ROUND_LINK = `passionseed.org${cohortPath(C)}`;
const TAGS = "#dek70 #dek71 #TCAS70";

const pairLine = pair !== null ? ` · มากับเพื่อนคนละ ฿${pair}` : "";
const offerLine = `${price}${pairLine} · รับ ${C.seats} คน · ปิดรับ ${deadline}`;

/** "9 ถึง 15 พ.ย.": the month is said once when both ends share it. */
function shortRange(startIso: string, endIso: string): string {
  const sameMonth = startIso.slice(0, 7) === endIso.slice(0, 7);
  const from = sameMonth ? String(Number(startIso.slice(8, 10))) : formatThaiDate(startIso, false);
  return `${from} ถึง ${formatThaiDate(endIso, false)}`;
}

const rangeShort = shortRange(C.startDate, C.endDate);

/** Round-0 proof lines, read from the showcase so a wording fix lands here too. */
function proofOf(title: string): string {
  const project = SHIFT_COHORT_0.showcase?.find((p) => p.title === title);
  if (!project?.proof) throw new Error(`SHIFT_COHORT_0.showcase has no proof for ${title}`);
  return project.proof;
}

const COHORT_SOURCE = "lib/content/shift-cohort.ts SHIFT_COHORT_3";
const FIRST_FOUR = [1, 2, 3, 4];
const BASE = { created: "2026-10-23" } as const;

export const SHIFT3_X_POSTS: XPost[] = [
  {
    ...BASE,
    slug: "x-shift3-launch",
    title: "SHIFT[3] opens (post Sat 24 Oct)",
    angle: "Launch: what you leave with after 7 evenings, dates, offer",
    sources: [COHORT_SOURCE, "lib/marketing/sets/shift3.ts SHIFT3_LAUNCH"],
    // The launch set starts at slide 2 (slide 1 is the bespoke poster).
    images: { set: "shift3-launch", slides: [2, 3, 6, 7] },
    text: [
      `${C.name} เปิดรับสมัครแล้ว`,
      "",
      `${days} เย็น เปลี่ยนไอเดียเป็นต้นแบบ ชวนคนนอกมาลองใช้จริง พร้อมพอร์ต 1 หน้าไว้ยื่น TCAS รอบ 1`,
      "",
      `${rangeShort} บน Discord ${C.sessionTime} ไม่ต้องเขียนโค้ดเป็น`,
      "",
      offerLine,
      ROUND_LINK,
      "",
      TAGS,
    ].join("\n"),
  },
  {
    ...BASE,
    slug: "x-shift3-proof",
    title: "What past rounds shipped (post Sun 25 Oct)",
    angle: "Proof: three round-0 projects, each with its own evidence, numbers kept per project",
    sources: [COHORT_SOURCE, "lib/content/shift-cohort.ts SHIFT_COHORT_0.showcase", "lib/marketing/sets/shift3.ts SHIFT3_PROOF"],
    images: { set: "shift3-proof", slides: [1, 2, 3, 4] },
    text: [
      `${SHIFT_COHORT_0.name} ปล่อยของจริงแล้ว:`,
      "",
      `Magnified Lens แว่นขยายบนมือถือ: ${proofOf("Magnified Lens")}`,
      "TradBid สอนเทรดผ่านมังงะ: ปล่อยแล้ว ทำต่อถึงเวอร์ชัน 2",
      "ปฏิทิน กสพท70: ฟังผู้ใช้ แล้วเปลี่ยนโจทย์",
      "",
      `ชิ้นต่อไปอาจเป็นของคุณ ที่ ${C.name}`,
      ROUND_LINK,
      "",
      TAGS,
    ].join("\n"),
  },
  {
    ...BASE,
    slug: "x-shift3-pick-a-problem",
    title: "Guide: find a problem in 20 minutes (post Mon 26 Oct)",
    angle: "Guide tip 1: list annoyances from the last 7 days, keep the ones with names attached",
    sources: ["lib/marketing/sets/shift3-guides.ts guide-pick-a-problem"],
    images: { set: "guide-pick-a-problem", slides: FIRST_FOUR },
    text: [
      "คิดไม่ออกว่าจะทำโปรเจกต์เรื่องอะไร ลองแบบนี้ 20 นาที",
      "",
      "ไล่แชท รูป ปฏิทิน 7 วันที่ผ่านมา จดเรื่องที่รอ บ่น หรือทำซ้ำ ให้ได้ 10 ข้อ",
      "ข้างแต่ละข้อ เขียนชื่อคนที่เจอเหมือนกัน ยังนึกชื่อไม่ออก พักข้อนี้ไว้ก่อน",
      "",
      "รอบนี้เลือกข้อที่หาคนคุยได้ทัน",
      "",
      `${TAGS} #ทำพอร์ต`,
    ].join("\n"),
  },
  {
    ...BASE,
    slug: "x-shift3-pair",
    title: "Bring a friend (post Tue 27 Oct)",
    angle: "Pair price, and why two people get further: one talks, one builds",
    sources: [COHORT_SOURCE, "lib/content/shift-cohort.ts PAIR_DISCOUNT_BAHT", "lib/marketing/sets/shift3-faq.ts shift3-pair"],
    images: { set: "shift3-pair", slides: FIRST_FOUR },
    text: [
      pair !== null ? `ชวนเพื่อนมา ${C.name} จ่ายคนละ ฿${pair}` : `ชวนเพื่อนมา ${C.name} ด้วยกัน`,
      "",
      "มาเป็นคู่ คนหนึ่งคุยกับผู้ใช้ อีกคนลงมือสร้าง",
      "เวลาไปคุยกับคนแปลกหน้า คนหนึ่งถาม อีกคนจด",
      `ทีมละ ${team} หรือมาด้วยกันแต่ทำคนละโปรเจกต์ก็ได้`,
      "",
      `สมัครคนละฟอร์ม บอกชื่อเพื่อนตอนส่งสลิป · ปิดรับ ${deadline}`,
      ROUND_LINK,
      "",
      TAGS,
    ].join("\n"),
  },
  {
    ...BASE,
    slug: "x-shift3-no-code",
    title: "Objection: I can't code (post Wed 28 Oct)",
    angle: "Objections 1 to 3: no code, no idea, scared to talk to strangers",
    sources: [COHORT_SOURCE, "lib/marketing/sets/shift3-faq.ts shift3-objections"],
    images: { set: "shift3-objections", slides: FIRST_FOUR },
    text: [
      "\"เขียนโค้ดไม่เป็น\" \"ไม่มีไอเดีย\" \"ไม่กล้าคุยกับคนแปลกหน้า\"",
      "",
      "AI ช่วยสร้าง เราเป็นคนตัดสินใจ",
      "ไอเดียเริ่มจากเรื่องที่รำคาญอยู่แล้ว",
      "คุยกับคน เริ่มจากทักแชท ถามว่าครั้งล่าสุดเจออะไร",
      "",
      `ไม่ต้องพร้อมก็เริ่มได้ · ${C.name} ปิดรับ ${deadline}`,
      ROUND_LINK,
      "",
      TAGS,
    ].join("\n"),
  },
  {
    ...BASE,
    slug: "x-shift3-ai-in-thai",
    title: "Guide: make the AI answer in Thai (post Thu 29 Oct)",
    angle: "Guide tip 2: reply-in-Thai line plus the 4-part prompt formula",
    sources: ["lib/marketing/sets/shift3-guides.ts guide-ai-in-thai"],
    images: { set: "guide-ai-in-thai", slides: FIRST_FOUR },
    text: [
      "AI ตอบเป็นภาษาอังกฤษจนเลิกใช้? พิมพ์ไว้ตั้งแต่บรรทัดแรกเลยว่าให้ตอบเป็นภาษาไทย",
      "",
      "แล้วสั่งให้ครบ 4 ช่อง:",
      "เราคือใคร · เป้าหมายของเรา · ให้ทำอะไร และห้ามทำอะไร · ช่วยเช็กหน่อยว่าคิดพลาดตรงไหน",
      "",
      "ช่องสุดท้ายช่วยเปิดมุมที่เรามองข้าม แต่คนเลือกยังเป็นเรา",
      "",
      `${TAGS} #AI`,
    ].join("\n"),
  },
  {
    ...BASE,
    slug: "x-shift3-parents",
    title: "For parents: the practical FAQ (post Fri 30 Oct)",
    angle: "Parent angle: time, place, group-only channels, make-up class, refund",
    sources: [
      COHORT_SOURCE,
      "lib/marketing/sets/shift3-faq.ts shift3-parents",
      "lib/content/shift-refund.ts (make-up class; full refund only if every step was done and it still felt not worth it)",
    ],
    images: { set: "shift3-parents", slides: [1, 2, 3, 6] },
    text: [
      `ผู้ปกครองถามบ่อยเรื่อง ${C.name}`,
      "",
      `เรียนกี่โมง: ไลฟ์บน Discord ${C.sessionTime} จากบ้าน`,
      "คุยกับใคร: คุยงานกันในห้องกลุ่มที่ทีมงานเห็น",
      "ขาดได้ไหม: มีคลาสชดเชย",
      "ถ้าไม่คุ้มล่ะ: ทำครบทุกขั้นแล้วยังรู้สึกไม่คุ้ม คืนเงินเต็มจำนวน",
      "",
      `${price} · ปิดรับ ${deadline}`,
      ROUND_LINK,
    ].join("\n"),
  },
  {
    ...BASE,
    slug: "x-shift3-interview-story",
    title: "Guide: tell a project in 60 seconds (post Sun 1 Nov)",
    angle: "Guide tip 3: 5-part, 60-second project story for the TCAS round 1 interview",
    sources: ["lib/marketing/sets/shift3-guides.ts guide-interview-story"],
    images: { set: "guide-interview-story", slides: FIRST_FOUR },
    text: [
      "สัมภาษณ์ TCAS รอบ 1 เล่าโปรเจกต์ให้จบใน 60 วินาที ด้วย 5 ท่อน:",
      "",
      "ปัญหา 10 วิ · คนที่ไปคุยด้วย 15 วิ · อะไรพัง 15 วิ · เราเปลี่ยนอะไร 10 วิ · ตัวเลข 1 ตัว 10 วิ",
      "",
      "ท่อน \"อะไรพัง\" คือท่อนที่บอกว่าเราลงมือจริง อย่าตัดทิ้ง",
      "",
      `${TAGS} #พอร์ตTCAS`,
    ].join("\n"),
  },
  {
    ...BASE,
    slug: "x-shift3-busy",
    title: "Objection: too busy, wrong grade (post Mon 2 Nov)",
    angle: "Objections 4 and 5: tutoring load, M.4 too early or M.6 too late",
    sources: [COHORT_SOURCE, "lib/marketing/sets/shift3-faq.ts shift3-objections", "lib/content/shift-next.ts NOT_FOR_YOU"],
    images: { set: "shift3-objections", slides: [5, 6, 7] },
    text: [
      "เรียนพิเศษเยอะ ไหวไหม",
      `ไลฟ์ ${C.sessionTime} งานระหว่างวันจัดเวลาเอง ถ้าติดเกิน 2 เย็น รอรุ่นหน้าดีกว่า`,
      "",
      "ม.4 เร็วไปไหม: ไม่เร็ว มีเวลาต่อยอด",
      `ม.6 สายไปไหม: จบ ${formatThaiDate(C.endDate, false)} เช็กวันยื่นพอร์ตของคณะก่อน`,
      "",
      `${price} · ปิดรับ ${deadline}`,
      ROUND_LINK,
      "",
      TAGS,
    ].join("\n"),
  },
  {
    ...BASE,
    slug: "x-shift3-last-call",
    title: "Last call (post Thu 5 Nov)",
    angle: "Last call: what the first evening looks like; no countdown, no seat pressure",
    sources: [COHORT_SOURCE, "SHIFT_COHORT_3.schedule[0]", "lib/marketing/sets/shift3.ts SHIFT3_LAST_CALL"],
    images: { set: "shift3-last-call", slides: FIRST_FOUR },
    text: [
      `${C.name} ปิดรับสมัคร ${deadline}`,
      "",
      `เย็นแรก ${start} ${sessionStart} เลือก 1 โจทย์ จดชื่อคนนอกที่จะชวนมาลองใช้`,
      "",
      `อีก ${days - 1} เย็น คุยกับคนใช้ ลงมือทำ ให้คนลองใช้ จดว่าอะไรพัง จบที่ Demo Day ${end}`,
      "",
      `${price}${pairLine} · กรอกใบสมัคร 2 นาที`,
      ROUND_LINK,
      "",
      TAGS,
    ].join("\n"),
  },
  {
    ...BASE,
    slug: "x-shift3-deadline-day",
    title: "Applications close today (post Sat 7 Nov, morning)",
    angle: "Deadline day: plain reminder, offer, link",
    sources: [COHORT_SOURCE, "lib/marketing/sets/shift3.ts SHIFT3_LAST_CALL"],
    images: { set: "shift3-last-call", slides: [3, 4] },
    text: [
      `วันสุดท้ายแล้ว ${C.name} ปิดรับสมัครวันนี้ ${deadline}`,
      "",
      `${rangeShort} บน Discord ${C.sessionTime} เดี่ยวหรือทีม ${team}`,
      "จบด้วยต้นแบบที่คนนอกลองใช้แล้ว และพอร์ต 1 หน้าสำหรับ TCAS รอบ 1",
      "",
      `${price}${pairLine} · กรอกใบสมัคร 2 นาทีเสร็จ`,
      ROUND_LINK,
      "",
      TAGS,
    ].join("\n"),
  },
  {
    ...BASE,
    slug: "x-shift3-day-1",
    title: "Day 1 kickoff (post Mon 9 Nov, evening)",
    angle: "Day 1: the round starts tonight; follow along to Demo Day. Applications are closed, so no apply ask.",
    sources: [COHORT_SOURCE, "SHIFT_COHORT_3.schedule[0]", "lib/content/shift-cohort.ts SHIFT_DAILY_SHOW"],
    images: { set: "shift3-launch", slides: [3, 4] },
    text: [
      `คืนนี้ ${sessionStart} เย็นแรกของ ${C.name}`,
      "",
      `Day ${day1.day} ${day1.label}: ทุกทีมตัดไอเดียให้เหลือโจทย์เดียว แล้วเขียนชื่อคนนอกที่จะชวนมาลองใช้`,
      "",
      `อีก ${days - 1} เย็น ทุกทีมโชว์ว่าอะไรใช้ได้ อะไรพัง และเรียนรู้อะไร ถึง Demo Day ${end}`,
      "",
      "หลัง Demo Day เราจะเล่าว่ารุ่นนี้สร้างอะไรกันบ้าง",
      "",
      TAGS,
    ].join("\n"),
  },
];

export function getShift3XPost(slug: string): XPost | undefined {
  return SHIFT3_X_POSTS.find((post) => post.slug === slug);
}
