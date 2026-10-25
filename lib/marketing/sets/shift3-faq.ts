import {
  SHIFT_COHORT_3,
  SHIFT_PAYMENT,
  cohortDayCount,
  cohortPath,
  formatThaiDate,
  formatThaiDateRange,
  pairPriceBaht,
  priceLabel,
  teamSizeLabel,
} from "@/lib/content/shift-cohort";

import type { StudioSet } from "../types";

/**
 * SHIFT[3] parent FAQ and objection posts. Every date, price, seat count and
 * session time on the slides and in the captions reads the cohort record,
 * so one edit in shift-cohort.ts updates all three sets.
 */

const C = SHIFT_COHORT_3;
const range = formatThaiDateRange(C.startDate, C.endDate);
const deadline = formatThaiDate(C.applyDeadline);
const endShort = formatThaiDate(C.endDate, false);
/** "9 พ.ย. ถึง 15 พ.ย.": short enough for a chat bubble. */
const rangeShort = `${formatThaiDate(C.startDate, false)} ถึง ${endShort}`;
const price = priceLabel(C);
const pairBaht = pairPriceBaht(C) ?? C.priceBaht;
const pair = `฿${pairBaht.toLocaleString("en-US")}`;
const days = cohortDayCount(C);
const team = teamSizeLabel(C);
const time = C.sessionTime;
const LINE = SHIFT_PAYMENT.lineId;
const APPLY = `passionseed.org${cohortPath(C)}`;

/** Hours in one live session, read from "19:00–21:00". */
function sessionHours(span: string): number {
  const [from, to] = span.split(/[–-]/).map((t) => {
    const [h, m] = t.trim().split(":").map(Number);
    return h + (m || 0) / 60;
  });
  return to - from;
}

const hours = sessionHours(time);

const COHORT_SOURCE = "lib/content/shift-cohort.ts (SHIFT_COHORT_3, pairPriceBaht, SHIFT_PAYMENT)";
const PAYMENT_SOURCE =
  "components/shift/ShiftPayment.tsx + lib/shift/paymentMessage.ts (PromptPay QR, slip to LINE, name the friend, a person confirms)";
const MAKEUP_SOURCE = "lib/content/shift-refund.ts REFUND_STEPS (missed session: make-up class), shown on /shift/3";
const BUSY_SOURCE = "lib/content/shift-next.ts NOT_FOR_YOU (busy more than 2 evenings)";
const LESSONS_SOURCE =
  "company-brain shift.md + SHIFT[0]-[2] debriefs, public-safe lessons: topic choice hardest, AI replying in English, strangers, interview fear, school projects need teachers";

export const SHIFT3_PARENTS: StudioSet = {
  slug: "shift3-parents",
  title: "SHIFT[3] for parents: the practical FAQ",
  channel: "instagram",
  format: "ig-portrait",
  theme: "cosmos",
  audience: "parent",
  shiftRound: 3,
  angle:
    "Parents' practical FAQ: hours per evening and between days, where the talk happens (group rooms), device, missing an evening, paying, refund line, who to ask.",
  sources: [
    COHORT_SOURCE,
    PAYMENT_SOURCE,
    MAKEUP_SOURCE,
    BUSY_SOURCE,
    "company-brain shift.md (refund line; homework between days; OpenCode install on Day 2, laptop still an open question)",
    "lib/content/home.ts HOME_PARENT_POINTS (talk happens in group rooms the team can see)",
    "lib/content/shift-voices.ts kkGrandpa (consent 2026-10-07)",
    "lib/content/shift-next.ts (YOU_BRING: one computer and internet; FAQ: parent contact before confirming for under-18s, team Discord rooms staff can see)",
    "lib/content/shift-refund.ts REFUND_STEPS (daily Discord progress post), REFUND_HOW (full refund only after every step)",
    "lib/content/shift-cohort.ts SHIFT_DAILY_SHOW (every team shows work each evening)",
  ],
  caption: [
    `สำหรับผู้ปกครอง: ${C.name} ใช้เวลาแค่ไหน เรียนที่ไหน ต้องเตรียมอะไร`,
    "",
    `เวลา: ไลฟ์บน Discord ทุกเย็น ${time} น. ${days} เย็นติดกัน ${range} ระหว่างวันมีงานบ้าง เช่น คุยกับคนที่เจอปัญหา หรือส่งต้นแบบให้คนลองใช้`,
    "ที่ไหน: ออนไลน์จากบ้าน งาน คำถาม และคำแนะนำจากพี่เลี้ยงอยู่ในห้องกลุ่มบน Discord ที่ทีมงานเห็น",
    "เครื่อง: เตรียมคอมพิวเตอร์ที่ต่อเน็ตได้ 1 เครื่อง เพราะเครื่องมือ AI บางตัวใช้บนมือถือไม่ได้",
    "พลาดเย็นไหน: มีคลาสชดเชย ถ้ารู้ว่าไม่ว่างเกิน 2 เย็น แนะนำรอรุ่นถัดไป",
    `จ่ายยังไง: ${price} ต่อคน สมัครคู่ 2 คน จ่ายคนละ ${pair} โอนผ่าน QR พร้อมเพย์ ส่งสลิปทาง LINE ${LINE} แล้วมีคนยืนยันที่นั่งให้`,
    "คืนเงินเต็ม: ทำครบทุกขั้น (รายการอยู่ในหน้าสมัคร) แล้วยังรู้สึกว่าไม่คุ้ม ทักมาบอกเราได้เลย",
    "",
    `สมัครที่ ${APPLY} ปิดรับ ${deadline} รับ ${C.seats} คน`,
    `ผู้ปกครองถามเพิ่มได้ที่ LINE ${LINE}`,
  ].join("\n"),
  hashtags: ["PassionSeed", "SHIFT", "TCAS", "ผู้ปกครอง"],
  created: "2026-10-23",
  slides: [
    {
      kind: "cover",
      kicker: "For parents",
      icon: "calendar",
      title: ["เรียนกี่โมง", "ใช้เครื่องอะไร", "ขาดได้ไหม"],
      sub: `${days} เย็นบน Discord · ${rangeShort}\nลงมือสร้างของจริง พร้อมพอร์ต 1 หน้า`,
      note: "คำตอบสั้นๆ ก่อนตัดสินใจ",
    },
    {
      kind: "points",
      tag: "Time & place",
      title: "ใช้เวลาแค่ไหน เรียนที่ไหน",
      points: [
        { title: `ไลฟ์ทุกเย็น ${time} น.`, body: `บน Discord ${days} เย็นติดกัน ${range}` },
        { title: "ระหว่างวันมีงาน จัดเวลาเอง", body: "เช่น คุยกับคนที่เจอปัญหา หรือส่งต้นแบบให้คนลองใช้" },
        { title: "เรียนจากบ้านทั้งหมด", body: "ออนไลน์ ไม่ต้องเดินทาง ไม่ต้องค้างคืน" },
      ],
    },
    {
      kind: "points",
      tag: "Where they talk",
      title: "ทุกการคุยงาน\nอยู่ในห้องกลุ่มที่ทีมงานเห็น",
      points: [
        {
          title: "ไม่มีแชทส่วนตัวกับพี่เลี้ยง",
          body: "คำถามและคำแนะนำจากพี่เลี้ยง\nอยู่ในห้อง Discord ที่ทีมงานเห็นทั้งหมด",
        },
        { title: "งานเดินหน้าให้เห็นทุกวัน", body: "ทุกคนโพสต์ความคืบหน้าใน Discord ทุกวัน\nและโชว์งานให้ทั้งห้องดูทุกเย็น" },
        { title: "ผู้ปกครองคุยกับทีมได้ตรง", body: "ถ้านักเรียนอายุไม่ถึง 18 ปี\nเราขอช่องทางติดต่อผู้ปกครองก่อนยืนยันที่นั่ง" },
      ],
      footnote: `ส่วนเรื่องสมัครกับจ่ายเงิน คุยผ่าน LINE ของทีม ${LINE}`,
    },
    {
      kind: "points",
      tag: "Before Day 1",
      title: "ต้องเตรียมอะไร ขาดได้ไหม",
      points: [
        { title: "เตรียมคอมพิวเตอร์ที่ต่อเน็ตได้ 1 เครื่อง", body: "เครื่องมือ AI บางตัวใช้บนมือถือไม่ได้" },
        { title: "ไม่ต้องมีพื้นฐานเขียนโค้ด", body: "ใช้ AI ช่วยสร้าง นักเรียนเป็นคนเลือกและตัดสินใจเอง" },
        { title: "พลาดเย็นไหน มีคลาสชดเชย", body: "งานของทีมโพสต์ไว้ใน Discord ตามอ่านต่อได้" },
        { title: "ไม่ว่างเกิน 2 เย็น", body: "แนะนำรอรุ่นถัดไป จะได้ไม่ตามหลังทีม" },
      ],
    },
    {
      kind: "quote",
      tag: "From SHIFT",
      voice: "kkGrandpa",
      context: "บางโจทย์เริ่มจากคนในบ้าน ถ้านักเรียนมาถามว่าเจอปัญหาอะไรบ้าง เล่าให้ฟังตรงๆ ได้เลย",
    },
    {
      kind: "points",
      tag: "Paying",
      title: "สมัคร จ่าย และเงื่อนไขคืนเงิน",
      numbered: true,
      points: [
        { title: "กรอกใบสมัคร 2 นาทีเสร็จ", body: `ที่ ${APPLY} ปิดรับ ${deadline}` },
        { title: `จ่าย ${price} ผ่าน QR พร้อมเพย์`, body: `ส่งสลิปทาง LINE ${LINE} แล้วมีคนยืนยันที่นั่งให้` },
        { title: `สมัครคู่ 2 คน จ่ายคนละ ${pair}`, body: "สมัครคนละฟอร์ม แล้วบอกชื่อเพื่อนตอนส่งสลิป" },
        { title: "==ทำครบแล้วไม่คุ้ม คืนเงินเต็ม==", body: "ทำครบทุกขั้น (รายการอยู่ในหน้าสมัคร) แล้วยังรู้สึกว่าไม่คุ้ม ทักมาบอกเราได้เลย" },
      ],
      footnote: `รับ ${C.seats} คน ปิดรับ ${deadline}`,
    },
    { kind: "offer", tag: "Price", title: "ราคาและวิธีสมัคร", round: C.round },
    {
      kind: "cta",
      tag: "Ask us",
      title: "สงสัยข้อไหน\nทักมาได้เลย",
      icon: "chat",
      action: "link",
      link: `LINE ${LINE}`,
      body: `รายละเอียดรุ่นนี้ที่ ${APPLY}`,
    },
  ],
};

export const SHIFT3_OBJECTIONS: StudioSet = {
  slug: "shift3-objections",
  title: "SHIFT[3]: 5 reasons people don't start, answered",
  channel: "instagram",
  format: "ig-tall",
  theme: "cosmos",
  audience: "student",
  shiftRound: 3,
  angle:
    "Five reasons students don't start (no code, no idea, scared of strangers, busy evenings, M.4 too early / M.6 too late), each answered from what past rounds hit.",
  sources: [
    COHORT_SOURCE,
    LESSONS_SOURCE,
    "lib/shift/paymentMessage.ts kickoffMessage (3 questions to seed a Day 1 idea)",
    "lib/content/shift2-curriculum.ts SHIFT2_INTERVIEW (10-minute talks), SHIFT2_RULES (no waiting for teacher approval)",
    "lib/content/shift-cohort.ts SHIFT_SKILL_CARDS (Zero-Code Stack), schedule Day 3 (zero-code or paper)",
    MAKEUP_SOURCE,
    BUSY_SOURCE,
  ],
  caption: [
    "5 ข้อที่ทำให้หลายคนยังไม่เริ่ม กับคำตอบตรงๆ จากที่รุ่นก่อนเจอมา",
    "",
    "1. เขียนโค้ดไม่เป็น: ใช้ AI ช่วยสร้าง เราเป็นคนตัดสินใจ ต้นแบบไม่ต้องเขียนโค้ด หรือทำบนกระดาษก็ได้ และสั่งให้ AI ตอบเป็นภาษาไทยได้",
    "2. ยังไม่มีไอเดีย: ไม่ต้องมีก่อนสมัคร ก่อนวันแรกเราส่ง 3 คำถามที่ช่วยหาโจทย์จากชีวิตตัวเอง",
    "3. ไม่กล้าคุยกับคนแปลกหน้า: ทักแชททีละคน ถามเรื่องที่เขาเคยเจอ ไม่ต้องขายอะไร",
    `4. เย็นๆ ไม่ว่าง: ไลฟ์วันละ ${hours} ชั่วโมง ${time} น. พลาดเย็นไหนมีคลาสชดเชย ถ้ารู้ว่าไม่ว่างเกิน 2 เย็น รอรุ่นถัดไปดีกว่า`,
    `5. ม.4 เร็วไป ม.6 สายไป: ม.4 ได้ลองของจริงก่อน ม.6 เช็กวันยื่นพอร์ตของคณะก่อน แล้วใช้ ${days} วันนี้เตรียมเรื่องเล่าสำหรับห้องสัมภาษณ์`,
    "",
    `${C.name} · ${range} · ${price} ต่อคน · ทำเดี่ยวหรือทีม ${team}`,
    `ปิดรับ ${deadline}`,
    "",
    "คอมเมนต์ \"SHIFT\" แล้วรับลิงก์สมัครทาง DM",
    `หรือสมัครที่ ${APPLY}`,
  ].join("\n"),
  hashtags: ["PassionSeed", "SHIFT", "พอร์ตTCAS", "ทำพอร์ต", "TCAS70"],
  created: "2026-10-23",
  slides: [
    {
      kind: "cover",
      kicker: "Honest answers",
      icon: "compass",
      title: ["5 เรื่องที่ทำให้", "ยังไม่เริ่ม", "เคลียร์ทีละข้อ"],
      sub: "โค้ดไม่เป็น ไม่มีไอเดีย ไม่กล้าคุย\nไม่มีเวลา กลัวเร็วไปหรือสายไป",
      note: "จากที่รุ่นก่อนเจอจริง",
    },
    {
      kind: "compare",
      tag: "01 · โค้ดไม่เป็น",
      title: "เขียนโค้ดไม่เป็น ทำได้ไหม",
      left: { label: "ที่กลัว", items: ["ต้องเขียนโค้ดเป็นก่อน", "AI ตอบเป็นอังกฤษ อ่านไม่ทัน"] },
      right: {
        label: "ที่เจอจริง",
        items: ["ใช้ AI ช่วยสร้าง เราเป็นคนตัดสินใจ", "==สั่งให้ AI ตอบเป็นภาษาไทยได้==", "ต้นแบบไม่ต้องเขียนโค้ด ทำบนกระดาษก็ได้"],
      },
      footnote: "รุ่นก่อนมีคนติดอยู่เพราะ AI ตอบเป็นภาษาอังกฤษ พอรู้ว่าสั่งให้ตอบไทยได้ ก็ไปต่อได้",
    },
    {
      kind: "points",
      tag: "02 · ยังไม่มีไอเดีย",
      title: "ไม่มีไอเดีย ตอบ 3 ข้อนี้",
      numbered: true,
      points: [
        { title: "อะไรในชีวิตที่น่ารำคาญ", body: "เรื่องเรียน คนรอบตัว งานอดิเรก ที่รู้สึกว่าไม่ควรเป็นแบบนี้" },
        { title: "เรื่องไหนคุยได้เป็นชั่วโมง", body: "สิ่งที่เราอินอยู่แล้ว เช่น ดนตรี อาหาร เกม" },
        { title: "คนกลุ่มไหนที่เราเข้าใจดี", body: "คนที่เราทักไปถามได้จริง ไม่ต้องรอใครแนะนำ" },
      ],
      footnote: "ไม่ต้องมีไอเดียก่อนสมัคร ก่อนวันแรกเราส่ง 3 ข้อนี้ให้ตอบ รุ่นก่อนบอกว่าขั้นเลือกหัวข้อยากที่สุด",
    },
    {
      kind: "points",
      tag: "03 · ไม่กล้าคุย",
      title: "ไม่กล้าคุยกับคนแปลกหน้า",
      points: [
        { title: "ทักแชททีละคน", body: "ส่งข้อความหาคนที่น่าจะเจอปัญหานี้ ไม่ต้องเดินเข้าไปหาใคร" },
        { title: "ถามเรื่องที่เขาเคยเจอ", body: "ไม่ต้องขายไอเดีย ถามว่าครั้งล่าสุดเกิดอะไรขึ้น แล้วฟัง" },
        { title: "ทำโจทย์ในโรงเรียนตัวเอง?", body: "เริ่มคุยกับสภานักเรียนเพื่อเข้าใจปัญหาก่อน ถ้าต้องใช้พื้นที่หรือข้อมูลของโรงเรียน ค่อยขออนุญาตครู" },
      ],
      footnote: "รุ่นก่อนก็บอกว่าตรงนี้ยาก ทุกเย็นทั้งห้องเล่าว่าไปคุยกับใครมา ไม่ต้องเก่งเข้าสังคมก่อน",
    },
    {
      kind: "points",
      tag: "04 · เย็นไม่ว่าง",
      title: "มีเรียนพิเศษ การบ้านเยอะ",
      points: [
        { title: `ไลฟ์บน Discord วันละ ${hours} ชั่วโมง`, body: `${time} น. ${range}` },
        { title: "งานระหว่างวัน จัดเวลาเอง", body: "คุยกับคนที่เจอปัญหาครั้งละ 10 นาที ทักแชทตอนพักก็ได้" },
        { title: "พลาดเย็นไหน มีคลาสชดเชย", body: "แต่ถ้ารู้ว่าไม่ว่างเกิน 2 เย็น รอรุ่นถัดไปดีกว่า" },
      ],
      footnote: `${days} เย็น ลงมือสร้างของจริง แล้วชวนคนนอกมาลองใช้ พร้อมพอร์ต 1 หน้าที่เล่าว่าเราทำอะไรไป`,
    },
    {
      kind: "points",
      tag: "05 · เร็วไป สายไป",
      title: "ม.4 เร็วไป ม.6 สายไป?",
      points: [
        { title: "ม.4: กำลังดี ไม่เร็วไป", body: "ได้ลองของจริง 1 รอบ แล้วมีเวลาต่อยอดก่อนยื่นพอร์ต" },
        { title: "ม.6: เช็กวันยื่นพอร์ตก่อน", body: `จบ ${endShort} ได้พอร์ต 1 หน้า ทันไหม ขึ้นกับคณะที่เล็งไว้` },
        { title: "ห้องสัมภาษณ์: มีของจริงให้เล่า", body: "รุ่นก่อนกลัวตรงนี้ที่สุด เล่าสิ่งที่ทำเองได้ ไม่ต้องท่อง" },
      ],
      footnote: "รุ่นก่อนก็มี ม.6 ที่ทำโปรเจกต์จนจบ และ ม.4 ที่ได้ลองก่อนใคร",
    },
    { kind: "offer", tag: "Price", title: "ราคาและวิธีสมัคร", round: C.round },
    {
      kind: "cta",
      tag: "Start",
      title: "ไม่ต้องพร้อม\nก็เริ่มได้",
      icon: "rocket",
      action: "comment",
      body: `รับลิงก์สมัครทาง DM · ปิดรับ ${deadline}`,
    },
  ],
};

export const SHIFT3_PAIR: StudioSet = {
  slug: "shift3-pair",
  title: "SHIFT[3]: bring a friend",
  channel: "instagram",
  format: "ig-portrait",
  theme: "cosmos",
  audience: "student",
  shiftRound: 3,
  angle:
    "Bring a friend: two who apply together pay the pair price each; what a pair can split (no fixed roles); a DM script to invite them; how to apply as two.",
  sources: [
    COHORT_SOURCE,
    "lib/content/shift-cohort.ts PAIR_DISCOUNT_BAHT, teamSize, SHIFT_SDT (autonomy: the team decides)",
    PAYMENT_SOURCE,
  ],
  caption: [
    `ชวนเพื่อนมาสร้างด้วยกัน จ่ายคนละ ${pair}`,
    "",
    `${C.name} มาคนเดียว ${price} สมัครเป็นคู่กับเพื่อน จ่ายคนละ ${pair}`,
    `ทำเดี่ยวหรือทีม ${team} ก็ได้ ถ้ามาเป็นคู่ จะแบ่งงานกันยังไงก็ได้ เช่น คนหนึ่งไปคุยกับคนที่เจอปัญหา อีกคนลงมือสร้าง หรือสลับกันทุกวัน ทีมตัดสินใจเอง`,
    "",
    `สมัครเป็นคู่: สมัครคนละฟอร์มที่ ${APPLY} โอนคนละ ${pair} แล้วตอนส่งสลิปทาง LINE ${LINE} บอกชื่อเพื่อนด้วย`,
    "",
    `${range} · ไลฟ์บน Discord ทุกเย็น ${time} น. · ปิดรับ ${deadline}`,
    "",
    "คอมเมนต์ \"SHIFT\" แล้วรับลิงก์สมัครทาง DM (แท็กเพื่อนไว้ด้วย)",
  ].join("\n"),
  hashtags: ["PassionSeed", "SHIFT", "พอร์ตTCAS", "ทำพอร์ต"],
  created: "2026-10-23",
  slides: [
    {
      kind: "cover",
      kicker: "Bring a friend",
      icon: "people",
      title: ["ชวนเพื่อนมา", `จ่ายคนละ **${pair}**`],
      sub: `มาคนเดียว ${price}\nออนไลน์ ${rangeShort}`,
      note: "ชวนคนที่อยากทำจริง",
    },
    {
      kind: "points",
      tag: "Why two",
      title: "มาเป็นคู่ แบ่งงานกันได้",
      points: [
        { title: "คนหนึ่งไปคุย อีกคนสร้าง", body: "หรือสลับกันทุกวัน ทีมเลือกเองว่าใครทำอะไร" },
        { title: "เวลาทักไปถามคนนอก ก็ช่วยกันได้", body: "คนหนึ่งชวนคุย อีกคนจดประเด็นสำคัญ" },
        { title: "มีเพื่อนช่วยเช็กงานจาก AI", body: "ก่อนเอาคำตอบของ AI ไปใช้ มีอีกคนช่วยถามว่าจริงไหม" },
        { title: `ทีมได้ ${team}`, body: "หรือมาด้วยกันแต่ทำคนละโปรเจกต์ก็ได้" },
      ],
      footnote: "ไม่มีกฎว่าใครต้องทำหน้าที่ไหน แบ่งแล้วไม่เวิร์ก ก็เปลี่ยนได้",
    },
    {
      kind: "chat",
      tag: "Copy this",
      title: "ก๊อปไปชวนเพื่อนได้เลย",
      lines: [
        { from: "me", text: `มาทำโปรเจกต์ใส่พอร์ตด้วยกันปะ ${days} วัน ออนไลน์ตอนเย็น ${rangeShort}` },
        { from: "them", text: "ทำอะไรบ้าง เราเขียนโค้ดไม่เป็นนะ" },
        { from: "me", text: `ไม่ต้องเป็น ใช้ AI ช่วยทำได้ จบแล้วได้งานจริงกับพอร์ต 1 หน้า สมัครคู่เหลือคนละ ${pair}` },
        { from: "them", text: "เอาดิ ส่งลิงก์มา" },
      ],
      footnote: "คอมเมนต์ SHIFT รับลิงก์ทาง DM แล้วส่งต่อให้เพื่อน",
    },
    {
      kind: "points",
      tag: "Apply as two",
      title: "สมัครเป็นคู่ 3 ขั้น",
      numbered: true,
      points: [
        { title: "สมัครคนละฟอร์ม", body: `ที่ ${APPLY} กรอกใบสมัคร 2 นาทีเสร็จ ภายใน ${deadline}` },
        { title: `โอนคนละ ${pair}`, body: "ผ่าน QR พร้อมเพย์ที่ขึ้นหลังสมัคร" },
        { title: "ส่งสลิปทาง LINE", body: `${LINE} บอกชื่อเพื่อนด้วย แล้วรอคนยืนยันที่นั่ง` },
      ],
      footnote: `ราคาคู่ใช้เมื่อสมัครพร้อมกัน 2 คน มาคนเดียวก็ได้ ${price}`,
    },
    { kind: "offer", tag: "Price", title: "ราคาและวิธีสมัคร", round: C.round },
    {
      kind: "cta",
      tag: "Bring a friend",
      title: "ได้คู่แล้ว\nรับลิงก์เลย",
      icon: "send",
      action: "comment",
      body: `แท็กเพื่อนในคอมเมนต์ด้วย · ปิดรับ ${deadline}`,
    },
  ],
};

/** SHIFT[3] parent and objection posts. */
export const SHIFT3_FAQ_SETS: StudioSet[] = [SHIFT3_PARENTS, SHIFT3_OBJECTIONS, SHIFT3_PAIR];
