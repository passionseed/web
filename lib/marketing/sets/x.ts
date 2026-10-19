import { SHIFT_COHORT_2, formatThaiDate, pairPriceBaht, priceLabel } from "@/lib/content/shift-cohort";

import type { XPost } from "../types";

/**
 * Posts for X (@PassionSeed_th). Thai students live on X under #dek tags,
 * so each post is one self-contained tip with the carousel's first four
 * slides as images, and a soft SHIFT[2] line. Single posts, not threads:
 * X's scheduler only takes single posts.
 */

const C = SHIFT_COHORT_2;
const start = formatThaiDate(C.startDate);
const deadline = formatThaiDate(C.applyDeadline);
const pair = pairPriceBaht(C);
const ROUND_LINK = `passionseed.org/shift/${C.round}`;
const TAGS = "#dek70 #dek71 #TCAS70";
const FIRST_FOUR = [1, 2, 3, 4];

const BASE = { created: "2026-10-11" } as const;

export const X_POSTS: XPost[] = [
  {
    ...BASE,
    slug: "x-shift2-new-date",
    title: "SHIFT[2] new start date",
    angle: "Date change announcement with poster and offer",
    sources: ["lib/content/shift-cohort.ts SHIFT_COHORT_2"],
    images: { set: "shift2-new-date", slides: FIRST_FOUR },
    text: [
      `${C.name} เลื่อนวันเริ่มเป็น ${start}`,
      "",
      `ครบ 7 วันเท่าเดิม ออนไลน์บน Discord ทุกเย็น ${C.sessionTime}`,
      "เลือกปัญหาเอง สร้างต้นแบบด้วย AI ให้คนนอกลองใช้ จบด้วยพอร์ต 1 หน้า",
      "",
      `${priceLabel(C)}${pair !== null ? ` มากับเพื่อนคนละ ฿${pair}` : ""} · สมัครได้ถึง ${deadline}`,
      ROUND_LINK,
      "",
      TAGS,
    ].join("\n"),
  },
  {
    ...BASE,
    slug: "x-tester-hunt",
    title: "Tester hunt",
    angle: "Story posts get no testers; ask one person at a time",
    sources: ["lib/marketing/sets/guides.ts TESTER_HUNT"],
    images: { set: "guide-tester-hunt", slides: FIRST_FOUR },
    text: [
      "โพสต์สตอรี่ขอให้คนลองแอป แล้วเงียบ ไม่มีใครกด",
      "",
      "ไม่ใช่เพราะไม่มีใครอยากช่วย แต่พอขอทุกคนพร้อมกัน ก็ไม่มีใครรู้สึกว่าต้องเป็นคนตอบ",
      "",
      "ทักทีละคน บอกชื่อเขา บอกว่าทำไมต้องเป็นเขา แล้วขอแค่ 5 นาที ข้อความทักให้ก๊อปอยู่ในรูปที่ 4",
      "",
      `${TAGS} #ทำพอร์ต`,
    ].join("\n"),
  },
  {
    ...BASE,
    slug: "x-questions-that-lie",
    title: "3 questions that get polite lies",
    angle: "Customer discovery: ask about the past",
    sources: ["lib/marketing/sets/guides.ts QUESTIONS_THAT_LIE"],
    images: { set: "guide-questions-that-lie", slides: FIRST_FOUR },
    text: [
      "ถามคนว่า \"ถ้ามีแอปนี้ จะใช้ไหม\" ทุกคนตอบว่าใช้ แล้วก็ไม่มีใครใช้",
      "",
      "เขาไม่ได้โกหกเพราะใจร้าย แค่เกรงใจ",
      "",
      "เลิกถามอนาคต ถามอดีตแทน:",
      "ครั้งล่าสุดที่เจอปัญหานี้คือเมื่อไหร่ ตอนนั้นแก้ยังไง",
      "",
      `${TAGS} #ทำพอร์ต`,
    ].join("\n"),
  },
  {
    ...BASE,
    slug: "x-cert-vs-proof",
    title: "Certificates vs proof",
    angle: "Attendance certificate vs uncopyable proof",
    sources: ["lib/marketing/sets/guides.ts CERT_VS_PROOF", "SHIFT_COHORT_0.showcase กสพท70"],
    images: { set: "guide-cert-vs-proof", slides: FIRST_FOUR },
    text: [
      "ใบเซอร์บอกว่าเราไปนั่งฟังมา",
      "งานที่มีคนใช้จริงบอกว่าเราทำอะไรได้",
      "",
      "หลักฐานที่ลอกกันไม่ได้มี 4 อย่าง: คำพูดจริงของคนที่ไปคุยด้วย ลิงก์ที่เปิดได้ บันทึกจุดที่พัง และตัวเลข 1 ตัว ก่อนและหลัง",
      "",
      `${TAGS} #พอร์ตTCAS`,
    ].join("\n"),
  },
  {
    ...BASE,
    slug: "x-port-one-page",
    title: "1-page portfolio template",
    angle: "Saveable template, six blocks",
    sources: ["lib/marketing/sets/guides.ts PORT_ONE_PAGE"],
    images: { set: "guide-port-one-page", slides: FIRST_FOUR },
    text: [
      "พอร์ต 1 หน้า ที่เล่างานได้ใน 1 นาที มี 6 ช่อง",
      "",
      "ครึ่งบน: ปัญหา 1 ประโยค · คนที่ไปคุยด้วย · สิ่งที่สร้าง",
      "ครึ่งล่าง: จุดที่พัง · ตัวเลข 1 ตัว · ถ้ามีอีก 7 วันจะทำอะไร",
      "",
      "ไม่ต้องสวย ต้องจริง กดเซฟไว้ใช้ตอนสรุปโปรเจกต์",
      "",
      `${TAGS} #พอร์ตTCAS`,
    ].join("\n"),
  },
  {
    ...BASE,
    slug: "x-ai-not-proxy",
    title: "AI without copy-paste",
    angle: "Anti Meat Proxy, 4 checks before pasting",
    sources: ["lib/marketing/sets/guides.ts AI_NOT_PROXY", "SHIFT_CHANGES (ป่าน)"],
    images: { set: "guide-ai-not-proxy", slides: FIRST_FOUR },
    text: [
      "\"มันง่ายเกินไป แค่สั่ง AI ก็ได้ เลยขี้เกียจ\" นักเรียน SHIFT เล่าให้เราฟังหลังจบรุ่น",
      "",
      "ใช้ AI ได้เต็มที่ แต่ก่อนกดใช้คำตอบ ถามตัวเอง: อธิบายได้ไหมว่ามันทำอะไร ถ้าพังรู้ไหมว่าพังตรงไหน และวันนี้เราตัดสินใจอะไรเอง",
      "",
      `${TAGS} #AI`,
    ].join("\n"),
  },
  {
    ...BASE,
    slug: "x-shift2-last-call",
    title: "SHIFT[2] first session tonight",
    angle: "Day 1 reminder: applications close before the first session",
    sources: ["lib/content/shift-cohort.ts SHIFT_COHORT_2 (deadline is Day 1)"],
    images: { set: "shift2-new-date", slides: [2, 3, 4] },
    text: [
      `คืนนี้ ${C.sessionTime.split("–")[0]} คลาสแรก ${C.name}`,
      "",
      "ยังสมัครได้ก่อนคลาสแรกวันนี้ 7 วันจากนี้ เลือกปัญหาเอง ไปคุยกับคนที่เจอปัญหาจริง แล้วสร้างต้นแบบให้คนนอกลองใช้",
      "",
      `${priceLabel(C)} · รับ ${C.seats} คน`,
      ROUND_LINK,
      "",
      TAGS,
    ].join("\n"),
  },
  {
    ...BASE,
    slug: "x-problem-at-home",
    title: "Find a problem at home",
    angle: "KK and his grandpa; 5 questions",
    sources: ["lib/content/shift-voices.ts kkGrandpa"],
    images: { set: "guide-problem-at-home", slides: FIRST_FOUR },
    text: [
      "หาไอเดียโปรเจกต์ไม่เจอ ลองดูคนที่บ้าน",
      "",
      "เคเค นักเรียน SHIFT เห็นคุณตาสแกน QR ไม่เป็น เลยทำแอปที่สแกนแล้วเด้งเข้าแอปธนาคารเลย",
      "",
      "เริ่มจากคำถามนี้: ใครที่บ้านขอให้เราช่วยเรื่องเดิมซ้ำๆ อีก 4 คำถามอยู่ในรูปที่ 3",
      "",
      `${TAGS} #ทำพอร์ต`,
    ].join("\n"),
  },
  {
    ...BASE,
    slug: "x-introvert-interviews",
    title: "Interviews for introverts",
    angle: "Potter the introvert; low-energy tactics",
    sources: ["lib/content/shift-voices.ts potterIntrovert"],
    images: { set: "guide-introvert-interviews", slides: FIRST_FOUR },
    text: [
      "เป็น introvert ก็สัมภาษณ์คนได้",
      "",
      "เริ่มจากแชทก่อน เตรียม 3 คำถามไว้บนจอ ไปเป็นคู่ คนหนึ่งถาม อีกคนจด แล้วบอกตั้งแต่แรกว่าขอแค่ 10 นาที",
      "",
      "คนแรกยากที่สุด พอผ่านไปได้ คนที่สองจะง่ายขึ้นเยอะ",
      "",
      `${TAGS} #ทำพอร์ต`,
    ].join("\n"),
  },
  {
    ...BASE,
    slug: "x-scope-cut",
    title: "Cut to 1-1-1",
    angle: "Scope lock: 1 person, 1 problem, 1 action",
    sources: ["lib/marketing/sets/guides.ts SCOPE_CUT"],
    images: { set: "guide-scope-cut", slides: FIRST_FOUR },
    text: [
      "ไอเดียใหญ่ทำไม่เสร็จ ไอเดียเล็กได้ใช้จริง",
      "",
      "ตัดให้เหลือ 1-1-1: ผู้ใช้ 1 คนที่ชัดที่สุด ปัญหา 1 เรื่องที่เขาเจอบ่อยที่สุด และ 1 สิ่งที่เขาต้องทำได้ในต้นแบบ",
      "",
      "แล้วเขียนออกมาเลยว่ารอบนี้จะไม่ทำอะไร",
      "",
      `${TAGS} #ทำพอร์ต`,
    ].join("\n"),
  },
];

export function getXPost(slug: string): XPost | undefined {
  return X_POSTS.find((post) => post.slug === slug);
}
