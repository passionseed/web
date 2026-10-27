import {
  SHIFT_COHORT,
  SHIFT_COHORT_0,
  SHIFT_COHORT_3,
  SHIFT_DAILY_SHOW,
  SHIFT_PAYMENT,
  SHIFT_TRACKS,
  cohortPath,
  formatThaiDate,
  formatThaiDateRange,
  pairPriceBaht,
  priceLabel,
  teamSizeLabel,
} from "@/lib/content/shift-cohort";

import { SHIFT3 } from "@/components/shift/poster/shift3/facts";

import type { PointsSlide, StudioPoint, StudioSet } from "../types";

/**
 * SHIFT[3] offer carousels: the launch, a gallery of what past rounds
 * shipped, and a last call. Every date, price, seat count and time on the
 * slides and in the captions is read from SHIFT_COHORT_3, so a data edit in
 * lib/content/shift-cohort.ts updates all three posts.
 */

const C = SHIFT_COHORT_3;
const COHORT_SOURCE = "lib/content/shift-cohort.ts (SHIFT_COHORT_3)";
const R0_SOURCE = "lib/content/shift-cohort.ts SHIFT_COHORT_0.showcase (featured: Magnified Lens, TradBid, ปฏิทิน กสพท70)";
const R1_SOURCE =
  "SHIFT_COHORT.showcase, round 1 (USE NEXT, HabitPerk, TCAS Command Center; from the Demo Day recording 11 Oct, in the founder checkout's lib/content/shift-cohort.ts, not yet in this branch)";

const start = formatThaiDate(C.startDate);
const end = formatThaiDate(C.endDate);
const deadline = formatThaiDate(C.applyDeadline);
const range = formatThaiDateRange(C.startDate, C.endDate);
const price = priceLabel(C);
const pair = pairPriceBaht(C);
/** "19:00", the start of the nightly session. */
const sessionStart = C.sessionTime.split("–")[0];
const applyPage = `passionseed.org${cohortPath(C)}`;
const day1 = C.schedule[0];

const THAI_WEEKDAY_LONG = ["วันอาทิตย์", "วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์"];

/** "วันจันทร์" for an ISO date, built from the parts so Bangkok never reads as the day before. */
function thaiWeekday(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return THAI_WEEKDAY_LONG[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

const pairLine = pair !== null ? ` สมัครคู่กับเพื่อน จ่ายคนละ ฿${pair}` : "";
const commentLines = [
  "คอมเมนต์ \"SHIFT\" แล้วรับลิงก์สมัครทาง DM",
  `หรือสมัครเองที่ ${applyPage} กรอกใบสมัคร 2 นาทีเสร็จ`,
];

/** Thai head for each Daily Show beat; an unknown label shows on its own. */
const BEAT_TH: Record<string, string> = {
  Shipped: "ของที่ใช้ได้แล้ว",
  Broke: "จุดที่พัง",
  Learned: "สกิลที่ได้",
};

/** A second line per beat, drawn from what past rounds actually showed. */
const BEAT_EXAMPLE: Record<string, string> = {
  Shipped: "ยังไม่สวยก็โชว์ได้ ขอแค่กดใช้ได้จริง",
  Broke: "เช่น ขยายฟอนต์แล้วหน้าเว็บพัง (TCAS Command Center)",
};

function beatTitle(label: string): string {
  return BEAT_TH[label] ? `**${label}** ${BEAT_TH[label]}` : label;
}

const SHIFT3_TAGS = ["PassionSeed", "SHIFT", "พอร์ตTCAS", "TCAS", "ทำพอร์ต"];

/* ------------------------------------------------------------------ */
/* What past rounds shipped. Titles only: no student names, schools,   */
/* handles or faces. Every number keeps its own boundary.              */
/* ------------------------------------------------------------------ */

interface ShippedProject {
  round: number;
  title: string;
  /** Title lines under the name on the proof slide (\n splits lines): the story in a few words. */
  headline: string;
  /** One line for the launch post's proof slide. */
  short: StudioPoint;
  problem: StudioPoint;
  build: StudioPoint;
  proof: StudioPoint;
  /** What the evidence does not claim, shown as the slide's footnote. */
  boundary: string;
}

const LENS: ShippedProject = {
  round: SHIFT_COHORT_0.round,
  title: "Magnified Lens",
  headline: "มีคนลองใช้จริงมากกว่า 15 คน",
  short: { title: "**Magnified Lens** แว่นขยายบนมือถือ", body: "ฟีดแบ็กจากคนลองใช้จริงมากกว่า 15 คน" },
  problem: { title: "**โจทย์** อ่านตัวหนังสือเล็กไม่ถนัด", body: "เช่น ฉลากยา สัญญา หรือรหัสพัสดุ" },
  build: {
    title: "**ทำอะไร** แว่นขยายบนมือถือ",
    body: "แตะหยุดภาพ ลากกรอบเหลืองไปส่อง ดูภาพขยาย\nใช้ได้ทั้งไทยและอังกฤษ",
  },
  proof: { title: "**หลักฐาน** ฟีดแบ็กจากคนลองใช้จริง", body: "==มากกว่า 15 คน== ที่ลองแล้วตอบกลับมา" },
  boundary: "15+ คนเป็นตัวเลขของ Magnified Lens ชิ้นเดียว ไม่ใช่ของทั้งรุ่น",
};

const TRADBID: ShippedProject = {
  round: SHIFT_COHORT_0.round,
  title: "TradBid",
  headline: "ปล่อยแล้ว ทำต่อถึงเวอร์ชัน 2",
  short: { title: "**TradBid** สอนเทรดหุ้นผ่านมังงะ", body: "ปล่อยเวอร์ชันแรก แล้วอัปเกรดต่อเป็นเวอร์ชัน 2 ในรอบเดียว" },
  problem: { title: "**โจทย์** เรียนเทรดหุ้น โดยไม่เสียเงินจริง" },
  build: {
    title: "**ทำอะไร** มังงะ + เกมเทรดจำลอง",
    body: "อ่านมังงะวาดมือตอนแรก แล้วลองซื้อขายหุ้นสมมติด้วยเงินจำลอง ฿10,000",
  },
  proof: { title: "**หลักฐาน** ทำต่อถึงเวอร์ชัน 2", body: "==ปล่อยเวอร์ชันแรกแล้ว== ทำต่อจนถึงเวอร์ชัน 2 ในรอบเดียว" },
  boundary: "หลักฐานของชิ้นนี้คือการปล่อยแล้วทำต่อ ไม่ได้อ้างจำนวนคนใช้",
};

const KSPT70: ShippedProject = {
  round: SHIFT_COHORT_0.round,
  title: "ปฏิทิน กสพท70",
  headline: "ฟังคนใช้ แล้วเปลี่ยนโจทย์",
  short: { title: "**ปฏิทิน กสพท70**", body: "คุยกับคนใช้จริงแล้วเปลี่ยนโจทย์ จากเกณฑ์พอร์ตเป็นวันสอบ" },
  problem: {
    title: "**โจทย์แรก** เกณฑ์พอร์ตสายหมอ",
    body: "คุยกับคนที่จะใช้จริง แล้วเจอว่าเขาอยากรู้วันสอบมากกว่า",
  },
  build: { title: "**ทำอะไร** ปฏิทินนับถอยหลัง", body: "นับถอยหลัง 11 กำหนดการ กสพท และ TCAS รอบ 3" },
  proof: { title: "**หลักฐาน** เปลี่ยนโจทย์ตามคนใช้", body: "==ของที่ปล่อยจริงต่างจากแผนแรก== เพราะฟังคนใช้" },
  boundary: "ไม่ได้อ้างจำนวนคนใช้ เล่าแค่ว่าโจทย์เปลี่ยนเพราะอะไร",
};

const USE_NEXT: ShippedProject = {
  round: SHIFT_COHORT.round,
  title: "USE NEXT",
  headline: "คนนอก 2 คน เจอ 3 จุดต้องแก้",
  short: { title: "**USE NEXT** เมนูจากของเหลือในตู้เย็น", body: "ได้ฟีดแบ็กจริงจากคนนอก 2 คน จนเห็นจุดที่ต้องแก้ต่อ 3 ข้อ" },
  problem: { title: "**โจทย์** ของเหลือในตู้เย็น ทำอะไรกินดี" },
  build: {
    title: "**ทำอะไร** แนะนำเมนูจากของที่เหลือ",
    body: "จำของที่เหลือ บอกว่าต้องซื้ออะไรเพิ่ม\nทำเมนูเสร็จ วัตถุดิบอัปเดตเอง",
  },
  proof: {
    title: "**หลักฐาน** คนนอกตอบกลับ 2 คน",
    body: "ฟีดแบ็กกลายเป็น==สิ่งที่ต้องแก้ 3 ข้อ==\nพร้อมวิธีทดสอบแต่ละข้อ",
  },
  boundary: "2 คนไม่เยอะ แต่เป็นคนนอกจริง และทำให้รู้ว่าต้องแก้อะไร",
};

const HABITPERK: ShippedProject = {
  round: SHIFT_COHORT.round,
  title: "HabitPerk",
  headline: "เพื่อนลองแล้วชอบ\nระบบซื้อสิทธิ์พัก",
  short: { title: "**HabitPerk** ติดตามนิสัยแบบเกม", body: "เพื่อนลองแล้วบอกว่าระบบซื้อสิทธิ์พัก ไม่ค่อยเห็นที่ไหนทำ" },
  problem: { title: "**โจทย์** สร้างนิสัยใหม่ให้ต่อเนื่อง" },
  build: {
    title: "**ทำอะไร** ติดตามนิสัยแบบเกม",
    body: "ทำต่อเนื่องแล้วได้เหรียญ เอาไปซื้อสิทธิ์พัก\nเช่น หยุดอ่านหนังสือ 1 วัน",
  },
  proof: {
    title: "**หลักฐาน** เพื่อนลองใช้แล้วให้ฟีดแบ็ก",
    body: "เพื่อนบอกว่า ==ระบบซื้อสิทธิ์พัก== ไม่ค่อยเห็นใครทำ\nและทำให้พักได้โดยไม่โทษตัวเอง",
  },
  boundary: "คนที่ลองชิ้นนี้คือเพื่อน ขั้นต่อไปคือให้คนนอกลอง",
};

const TCAS_CC: ShippedProject = {
  round: SHIFT_COHORT.round,
  title: "TCAS Command Center",
  headline: "ลองบนมือถือ เจอ 4 จุดต้องแก้",
  short: { title: "**TCAS Command Center**", body: "รวม TCAS ไว้หน้าเดียว ให้คนลองบนมือถือ เจอ 4 จุดที่ต้องแก้" },
  problem: { title: "**โจทย์** ข้อมูล TCAS กระจายหลายแท็บ" },
  build: {
    title: "**ทำอะไร** รวม TCAS ไว้หน้าเดียว",
    body: "ค้นสาขา ดูในปฏิทินว่ารอบไหนปิดเมื่อไหร่\nพร้อมรายการสิ่งที่ต้องทำ",
  },
  proof: { title: "**หลักฐาน** ให้คนลองบนมือถือ", body: "==เจอ 4 จุดที่ต้องแก้== เช่น ขยายฟอนต์แล้วหน้าเว็บพัง" },
  boundary: "4 คือจำนวนจุดที่ต้องแก้ ไม่ใช่จำนวนคนลอง",
};

/** Featured projects, oldest round first. */
const SHIPPED: ShippedProject[] = [LENS, TRADBID, KSPT70, USE_NEXT, HABITPERK, TCAS_CC];

/** The four projects the launch carousel features, as one-line points. Also on the Halloween carousel. */
export const SHIFT3_FEATURED_SHORTS: StudioPoint[] = [LENS.short, TRADBID.short, KSPT70.short, TCAS_CC.short];

/** What a student holds on Demo Day. Shared by the launch and Halloween carousels. */
export const SHIFT3_LEAVE_WITH: StudioPoint[] = [
  { title: "==ของจริงที่ชวนคนนอกมาลองใช้==", body: "ใช้ AI ช่วยสร้าง ไม่ต้องเขียนโค้ดเป็น แต่เราเป็นคนตัดสินใจทุกขั้น" },
  { title: "บันทึกว่าอะไรพัง แล้วแก้ยังไง", body: "จดพร้อมวันที่ ทุกจุดที่คนลองแล้วติด และสิ่งที่แก้" },
  { title: "พอร์ต 1 หน้า สำหรับ TCAS รอบ 1", body: "ปัญหา คนที่ไปคุยด้วย จุดที่พัง และสิ่งที่แก้ ในหน้าเดียว" },
  { title: "ใบรับรองที่ตรวจสอบได้", body: "มีลิงก์ให้กรรมการกดดูว่าทำจริง ออกให้เฉพาะคนที่ส่งหลักฐานครบ" },
];

/** Footnotes the launch carousel uses under those two lists. */
export const SHIFT3_LEAVE_WITH_NOTE =
  "รุ่นก่อนบอกว่ากลัวรอบสัมภาษณ์พอร์ตที่สุด พอร์ต 1 หน้า เลยเรียงเป็นเรื่องเดียวที่เล่าเองได้";
export const SHIFT3_FEATURED_NOTE = "ตัวเลขเป็นของแต่ละโปรเจกต์ ไม่ใช่ของทั้งรุ่น";

/**
 * Latin-only so the eyebrow face draws the square brackets of the cohort
 * name; the Thai face turns "[0]" into what reads as "(0)".
 */
function roundTag(round: number): string {
  return round === SHIFT_COHORT_0.round ? `${SHIFT_COHORT_0.name} · Pilot` : `SHIFT[${round}]`;
}

/** Project titles two per line, so no title wraps mid-name on the cover. */
function titlePairs(projects: ShippedProject[]): string {
  const lines: string[] = [];
  for (let i = 0; i < projects.length; i += 2) {
    lines.push(projects.slice(i, i + 2).map((p) => p.title).join(" · "));
  }
  return lines.join("\n");
}

function projectSlide(p: ShippedProject): PointsSlide {
  return {
    kind: "points",
    tag: roundTag(p.round),
    title: [p.title, ...p.headline.split("\n").map((line) => `**${line}**`)].join("\n"),
    points: [p.problem, p.build, p.proof],
    footnote: p.boundary,
  };
}

/* ------------------------------------------------------------------ */
/* 1. Launch: slides 2-7 behind the bespoke poster (#shift3-launch-feed) */
/* ------------------------------------------------------------------ */

export const SHIFT3_LAUNCH: StudioSet = {
  slug: "shift3-launch",
  title: "SHIFT[3] launch (carousel slides 2-7)",
  channel: "instagram",
  format: "ig-portrait",
  theme: "cosmos",
  audience: "student",
  shiftRound: C.round,
  pageOffset: 1,
  angle: `SHIFT[3] opens: what you leave with on Demo Day, the 7 evenings, how one evening runs (Shipped/Broke/Learned), 3 shipped projects from past rounds, offer, comment SHIFT.`,
  sources: [
    COHORT_SOURCE,
    "lib/content/shift-cohort.ts SHIFT_DAILY_SHOW, SHIFT_TRACKS, PAIR_DISCOUNT_BAHT, SHIFT_PAYMENT",
    "lib/content/shift-next.ts YOU_GET (prototype outside people tried, log of what broke, 1-page portfolio, verifiable certificate)",
    "lib/content/shift-voices.ts SHIFT_CHANGES (whole room reviews work each evening, solo or team)",
    R0_SOURCE,
    R1_SOURCE,
    "lib/dm-leads/shift-comment-copy.ts (comment SHIFT, apply in about 2 minutes)",
    "Past-round lesson, paraphrased: the TCAS portfolio interview is what students fear most",
    "lib/content/shift-refund.ts REFUND_HOW (full refund only after every step, if it still was not worth it)",
  ],
  caption: [
    `${C.name} เปิดรับสมัครแล้ว`,
    `${SHIFT3.days} เย็น เปลี่ยนไอเดียในหัวเป็นของจริง แล้วชวนคนนอกมาลองใช้`,
    "",
    `จบ ${SHIFT3.days} วัน มี 3 อย่างติดมือ`,
    "1. ของจริงที่สร้างเอง แล้วชวนคนนอกมาลองใช้",
    "2. บันทึกว่าอะไรพัง แล้วแก้ยังไง",
    "3. พอร์ต 1 หน้า สำหรับ TCAS รอบ 1 ใช้เล่าตอนสัมภาษณ์ได้",
    "",
    `${range} ออนไลน์บน Discord ไลฟ์ทุกเย็น ${C.sessionTime} น. จบที่ Demo Day ${end}`,
    `ทำเดี่ยวหรือทีม ${teamSizeLabel(C)} ไม่ต้องมีพื้นฐานเขียนโค้ด ใช้ AI ช่วยสร้าง แต่เราเป็นคนตัดสินใจ`,
    `เหมาะกับ ม.4-ม.6 ที่เล็งพอร์ตสาย ${SHIFT_TRACKS.fields.join(", ")} เช่น ${SHIFT_TRACKS.programs.join(", ")}`,
    "",
    `${price} ต่อคน${pairLine}`,
    `รับ ${C.seats} คน ปิดรับสมัคร ${deadline}`,
    "ทำครบทุกขั้นแล้วยังรู้สึกว่าไม่คุ้ม คืนเงินเต็ม",
    "",
    ...commentLines,
    `มีคำถาม ทัก LINE ${SHIFT_PAYMENT.lineId}`,
  ].join("\n"),
  hashtags: SHIFT3_TAGS,
  created: "2026-10-23",
  slides: [
    {
      kind: "points",
      tag: "What you leave with",
      title: `Demo Day ${end}\nในมือมีอะไรบ้าง`,
      numbered: true,
      points: SHIFT3_LEAVE_WITH,
      footnote: SHIFT3_LEAVE_WITH_NOTE,
    },
    { kind: "schedule", tag: SHIFT3.dates, title: `${SHIFT3.days} เย็น จากโจทย์เดียว\nถึง Demo Day`, round: C.round },
    {
      kind: "points",
      tag: `ทุกเย็น ${C.sessionTime} น.`,
      title: `ทุกเย็นบน Discord\nทุกทีมโชว์ ${SHIFT_DAILY_SHOW.length} อย่าง`,
      points: SHIFT_DAILY_SHOW.map((beat) => ({
        title: beatTitle(beat.label),
        body: BEAT_EXAMPLE[beat.label] ? `${beat.detail}\n${BEAT_EXAMPLE[beat.label]}` : beat.detail,
      })),
      footnote: "ทั้งห้องช่วยกันดูงาน ทำคนเดียวก็ได้ ไม่ต้องเป็นสายคุยเก่ง",
    },
    {
      kind: "points",
      tag: `From ${SHIFT_COHORT_0.name} + ${SHIFT_COHORT.name}`,
      title: "รุ่นก่อน\n==ปล่อยของจริง==ไปแล้ว",
      points: SHIFT3_FEATURED_SHORTS,
      footnote: SHIFT3_FEATURED_NOTE,
    },
    { kind: "offer", tag: "Price", title: "ราคาและวิธีสมัคร", round: C.round },
    {
      kind: "cta",
      tag: "Apply",
      title: `สมัครได้ถึง\n${deadline}\n**รับ ${C.seats} คน**`,
      action: "comment",
      icon: "rocket",
      body: `รับลิงก์สมัครทาง DM กรอกใบสมัคร 2 นาทีเสร็จ\nหรือเข้า ${applyPage}\nมีคำถาม ทัก LINE ${SHIFT_PAYMENT.lineId}`,
    },
  ],
};

/* ------------------------------------------------------------------ */
/* 2. Proof: a gallery of what SHIFT[0] and SHIFT[1] shipped (3:4 grid)  */
/* ------------------------------------------------------------------ */

export const SHIFT3_PROOF: StudioSet = {
  slug: "shift3-proof",
  title: "SHIFT[3] proof: what past rounds shipped",
  channel: "instagram",
  format: "ig-tall",
  theme: "cosmos",
  audience: "student",
  shiftRound: C.round,
  angle:
    "ของจริงจากรุ่นก่อน: a gallery of the 6 featured projects from SHIFT[0] and SHIFT[1] (problem, what it does, evidence), each with its own boundary; soft CTA to SHIFT[3].",
  sources: [
    COHORT_SOURCE,
    R0_SOURCE,
    R1_SOURCE,
    "SHIFT_COHORT_0 comment: free pilot, 9 students, invite only (seats: 9, priceBaht: 0)",
  ],
  caption: [
    `ของจริงจากรุ่นก่อน: ${SHIPPED.length} โปรเจกต์ที่นักเรียน ${SHIFT_COHORT_0.name} และ ${SHIFT_COHORT.name} ปล่อยให้คนลองใช้`,
    "",
    "แต่ละหน้าเล่า 3 อย่าง: โจทย์ ของที่ทำ และหลักฐานว่าไปต่อจากแผนแรกยังไง",
    "",
    `ตัวเลขยังไม่เยอะ แต่เป็นของจริงทั้งหมด ไม่ปัดให้ดูเยอะ บางชิ้นมีคนนอกลอง 2 คน บางชิ้นมากกว่า 15 คน บางชิ้นยังเป็นเพื่อนที่ลอง ตัวเลขเป็นของแต่ละโปรเจกต์ ไม่ใช่ค่าเฉลี่ยของรุ่น ${SHIFT_COHORT_0.name} เป็นรุ่นทดลองฟรี ${SHIFT_COHORT_0.seats} คน`,
    "",
    `${C.name} ${range} ไลฟ์บน Discord ทุกเย็น ${C.sessionTime} น.`,
    `${price} ต่อคน${pairLine} · รับ ${C.seats} คน · ปิดรับ ${deadline}`,
    "",
    "อยากมีชิ้นของตัวเองบ้าง",
    ...commentLines,
  ].join("\n"),
  hashtags: [...SHIFT3_TAGS, "ผลงานนักเรียน"],
  created: "2026-10-23",
  slides: [
    {
      kind: "cover",
      kicker: `Shipped · ${SHIFT_COHORT_0.name} + ${SHIFT_COHORT.name}`,
      title: ["ของจริง", `${SHIPPED.length} ชิ้น`, "จากรุ่นก่อน"],
      sub: `${titlePairs(SHIPPED)}\nแต่ละชิ้นเล่าโจทย์ ของที่ทำ และหลักฐานว่าไปต่อจากแผนแรกยังไง`,
      note: "ไม่เปิดชื่อคนทำ ให้ผลงานพูดแทน",
      icon: "rocket",
    },
    ...SHIPPED.map(projectSlide),
    {
      kind: "cta",
      tag: C.name,
      title: `ชิ้นที่ ${SHIPPED.length + 1}\n**เป็นของเรา**`,
      action: "comment",
      icon: "sparkle",
      body: `${SHIFT3.days} เย็นบน Discord · ${SHIFT3.dates}\n${price} ต่อคน · รับ ${C.seats} คน\nปิดรับสมัคร ${deadline}`,
    },
  ],
};

/* ------------------------------------------------------------------ */
/* 3. Last call: for Thu 5 / Fri 6 Nov, before applications close       */
/* ------------------------------------------------------------------ */

export const SHIFT3_LAST_CALL: StudioSet = {
  slug: "shift3-last-call",
  title: "SHIFT[3] last call (post Thu 5 or Fri 6 Nov)",
  channel: "instagram",
  format: "ig-portrait",
  theme: "cosmos",
  audience: "student",
  shiftRound: C.round,
  angle: `Last call: applications close ${C.applyDeadline}; what the first Monday evening (Day 1 ${day1.label}) looks like; the 7 evenings; offer; comment SHIFT. No seat counts, no countdown.`,
  sources: [
    COHORT_SOURCE,
    "SHIFT_COHORT_3.schedule[0] (Day 1 Scope Lock detail)",
    "lib/content/shift-voices.ts SHIFT_CHANGES (ทุกคนเลือกคนที่จะไปขอให้ลองตั้งแต่วันแรก); testerTarget comment: outside users named on Day 1",
    "Past-round lesson, paraphrased: picking a topic was the hardest part",
    "lib/content/shift-cohort.ts SHIFT_PAYMENT (PromptPay QR, slip to LINE, a person confirms)",
    "lib/content/shift-refund.ts REFUND_HOW (full refund only after every step, if it still was not worth it)",
  ],
  caption: [
    `${C.name} ปิดรับสมัคร ${deadline}`,
    "",
    `${thaiWeekday(C.startDate)}ที่ ${formatThaiDate(C.startDate, false)} ${sessionStart} น. คือเย็นแรก`,
    "เย็นนั้นทุกคนตัดไอเดียให้เหลือโจทย์เดียว ล็อกสโคปใน 1 หน้า แล้วเขียนชื่อคนนอกที่จะชวนมาลองใช้",
    `อีก ${C.schedule.length - 1} เย็นต่อจากนั้น คุยกับคนที่เจอปัญหาจริง สร้างต้นแบบ ให้คนนอกลอง จดว่าอะไรพัง แล้วจบที่ Demo Day ${end} พร้อมพอร์ต 1 หน้าสำหรับ TCAS รอบ 1`,
    "",
    `ไลฟ์บน Discord ทุกเย็น ${C.sessionTime} น. ทำเดี่ยวหรือทีม ${teamSizeLabel(C)} ไม่ต้องมีพื้นฐานเขียนโค้ด`,
    "",
    `${price} ต่อคน${pairLine} · รับ ${C.seats} คน`,
    `จ่ายผ่านพร้อมเพย์ แล้วส่งสลิปทาง LINE ${SHIFT_PAYMENT.lineId} มีทีมงานตอบยืนยันที่นั่ง`,
    "ทำครบทุกขั้นแล้วยังรู้สึกว่าไม่คุ้ม คืนเงินเต็ม",
    "",
    ...commentLines,
  ].join("\n"),
  hashtags: SHIFT3_TAGS,
  created: "2026-10-23",
  slides: [
    {
      kind: "cover",
      kicker: "Last call",
      title: ["ปิดรับสมัคร", `${thaiWeekday(C.applyDeadline)}นี้`],
      wordmark: true,
      sub: `ปิดรับ ${deadline}\nเย็นแรก ${start} ${sessionStart} น.`,
      note: "โค้งสุดท้ายแล้ว เผื่อใครเล็งไว้",
      icon: "calendar",
    },
    {
      kind: "points",
      tag: `Day ${day1.day} · ${start} ${sessionStart} น.`,
      title: `เย็นแรก ${thaiWeekday(C.startDate)}\nตัดไอเดียให้เหลือ**โจทย์เดียว**`,
      numbered: true,
      points: [
        { title: "ตัดฟีเจอร์ที่ไม่จำเป็นออก", body: `เหลือเรื่องเดียวที่ทำทันใน ${SHIFT3.days} เย็น` },
        { title: "ล็อกสโคปลงใน 1 หน้า", body: "พร้อมเดาไว้ก่อนว่าอะไรจะเวิร์ก แล้วค่อยพิสูจน์" },
        { title: "เขียนชื่อคนนอกที่จะชวนมาลองใช้", body: "ตั้งแต่เย็นแรก ไม่ต้องรอให้งานเสร็จ" },
      ],
      footnote: "รุ่นก่อนบอกว่าการเลือกโจทย์ยากที่สุด เย็นแรกเลยช่วยกันตัดทั้งห้อง ไม่ต้องคิดคนเดียว",
    },
    {
      kind: "schedule",
      tag: SHIFT3.dates,
      title: `จากเย็นแรก\nถึง Demo Day ${end}`,
      round: C.round,
    },
    { kind: "offer", tag: "Price", title: "กรอกใบสมัคร 2 นาทีเสร็จ", round: C.round },
    {
      kind: "cta",
      tag: "Apply",
      title: `เจอกัน\n${thaiWeekday(C.startDate)}\n${sessionStart} น.`,
      action: "comment",
      icon: "live",
      body: `ปิดรับสมัคร ${deadline} รับลิงก์ทาง DM\nหรือเข้า ${applyPage}\nมีคำถาม ทัก LINE ${SHIFT_PAYMENT.lineId}`,
    },
  ],
};

export const SHIFT3_SETS: StudioSet[] = [SHIFT3_LAUNCH, SHIFT3_PROOF, SHIFT3_LAST_CALL];
