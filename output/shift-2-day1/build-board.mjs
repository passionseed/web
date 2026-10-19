#!/usr/bin/env node
/**
 * Builds the SHIFT[2] cohort board as an .excalidraw file for excalidraw.com
 * live collaboration. No student data goes in: students claim a numbered
 * frame themselves on Day 1, and the frame number is their player number.
 *
 *   node output/shift-2-day1/build-board.mjs
 *
 * Copy sources: SHIFT[2] dates and day copy from lib/content/shift-cohort.ts,
 * icebreaker questions from the shift_round_icebreaker_questions seed in
 * supabase/migrations/20261014090000_shift_rounds_schema.sql.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "shift-2-board.excalidraw");

// ---------------------------------------------------------------- content

const STUDENT_FRAMES = 20; // ~18 enrolled + spares for late joiners or teams
const ROOMS = 6;
const ROUNDS = 3;

/** SHIFT[2] days, condensed from SHIFT2_CURRICULUM in lib/content/shift2-curriculum.ts (origin/main). */
const WEEK = [
  { day: 1, date: "พ. 14 ต.ค.", name: "3 ไอเดีย → เลือก 1", live: true,
    goal: "คิดอย่างน้อย 3 ไอเดีย\nเลือกอันที่ดีที่สุด\nกับกลุ่มคนที่ทักได้เอง", mission: "คุยกับคนที่เจอปัญหาจริง\nอย่างน้อย 3 คน", slot: "3 ไอเดีย\n+ อันที่เลือก" },
  { day: 2, date: "พฤ. 15 ต.ค.", name: "ปัญหาจริงไหม\n+ เริ่มหาคนลอง", live: true,
    goal: "ล็อก 1 ปัญหา\n1 กลุ่มคนใช้\nเริ่มหาคนลอง 2 ทาง", mission: "ทักคนตรงทีละคน\n+ โพสต์กลุ่ม Facebook\n10 กลุ่ม", slot: "คำพูดจริง\nจาก 3 คน" },
  { day: 3, date: "ศ. 16 ต.ค.", name: "Build Fast", live: false,
    goal: "ต้นแบบที่คนอื่น\nเปิดลองได้\nไม่ต้องสวย", mission: "ต้นแบบเปิดได้บนมือถือ\n+ นัดคนลอง 3 คน", slot: "รูปหรือลิงก์\nต้นแบบ" },
  { day: 4, date: "ส. 17 ต.ค.", name: "Ship to Strangers", live: true,
    goal: "คนนอกรุ่น 3 คนได้ลอง\nแยก \"เขาทำ\"\nออกจาก \"เขาพูด\"", mission: "ให้คนนอกลองครบ 3 คน\nเลือก 1 อย่างที่จะเปลี่ยน", slot: "คนนอก 3 คน\nเขาทำ / เขาพูด" },
  { day: 5, date: "อา. 18 ต.ค.", name: "Fix", live: false,
    goal: "เปลี่ยน 1 อย่าง\nจากที่คนลองบอก\nแล้วขึ้นลิงก์จริง", mission: "โพสต์ ก่อน → หลัง\nของสิ่งที่เปลี่ยน", slot: "ก่อน → หลัง" },
  { day: 6, date: "จ. 19 ต.ค.", name: "ปล่อยสู่โลก\n+ ซ้อมเดโม", live: true,
    goal: "ส่งลิงก์กลับไปให้\nคนที่เคยช่วยลอง\nซ้อมเดโม 2 นาที", mission: "เดโม 2 นาทีตามโครง\n+ พอร์ต 1 หน้า", slot: "ลิงก์จริง\n+ โครงเดโม" },
  { day: 7, date: "อ. 20 ต.ค.", name: "Demo Day", live: true,
    goal: "ใครใช้ เขาพูดอะไร\nเราเปลี่ยนอะไร", mission: "ให้คนใช้จริงต่อ\nหลังค่าย", slot: "เดโม\n+ พอร์ต 1 หน้า" },
];

/** Day 1 run of show, from SHIFT2_CURRICULUM day 1. */
const TONIGHT = [
  ["19:00", "Park", "SHIFT คืออะไร + กติกา + 9 ขั้นคืนเงิน"],
  ["19:15", "ภารกิจลับ", "ห้องละ 3 คน รอบละ 8 นาที หมุน 3 รอบ + วาดบนบอร์ด"],
  ["19:45", "3 ไอเดีย", "ปัญหาที่เห็นเองอย่างน้อย 3 ข้อ + ใครเจอบ้าง"],
  ["20:05", "ทักเองได้ไหม", "ทักคนกลุ่มนี้เองได้ไหม โดยไม่ต้องขอผู้ใหญ่"],
  ["20:15", "เลือก 1", "พี่ถาม เราตัดเอง"],
  ["20:30", "วิธีคุยกับคน", "ถามเรื่องที่เกิดขึ้นจริง ไม่ขายไอเดีย ซ้อมกับเพื่อน 1 รอบ"],
  ["20:45", "First contact", "ทักคนจริง 1 คน นัดคุย 10 นาทีพรุ่งนี้ แคปลง #first-contact"],
  ["20:50", "Mission", "ก่อน Day 2: คุยกับคนจริง 3 คน โพสต์ใน #progress"],
];

/** SHIFT2_RULES, rewritten from the mentor's voice into the student's. */
const RULES = [
  "ทุกงานโพสต์ใน #progress งานที่ทำในคอล\nหรือในแชทก็โพสต์ด้วย ไม่งั้นไม่นับ",
  "ใช้งานจริงสำคัญกว่าสวย",
  "เลือกกลุ่มคนใช้ที่เราทักได้เอง\nไม่ต้องรอครูหรือผู้ใหญ่อนุญาต",
  "พี่เลี้ยงถาม เราตัดสินใจเอง\nพี่จะไม่เสนอฟีเจอร์ให้",
  "ขาดเซสชันได้ เข้าคลาสชดเชยแทน",
];

/** REFUND_STEPS and REFUND_HOW from lib/content/shift-refund.ts (origin/main), verbatim. */
const REFUND_STEPS = [
  "คิดไอเดียอย่างน้อย 3 ไอเดีย แล้วเลือกอันที่ดีที่สุด",
  "คุยกับคนที่เจอปัญหาจริงอย่างน้อย 3 คน ก่อนเริ่มสร้าง",
  "เลือกปัญหาเดียว กับกลุ่มคนใช้กลุ่มเดียว",
  "สร้างต้นแบบที่คนอื่นลองใช้ได้",
  "ให้คนนอกรุ่นอย่างน้อย 3 คนลองใช้ แล้วจดว่าเขาพูดอะไร",
  "ปรับอย่างน้อย 1 อย่างจากสิ่งที่คนลองใช้บอก",
  "นำเสนองานในวันที่ 7",
  "โพสต์ความคืบหน้าใน Discord ทุกวัน",
  "เข้าเซสชันกับพี่เลี้ยงทุกครั้ง (พลาดแล้วเข้าคลาสชดเชยได้)",
];
const REFUND_HOW = "ทำครบแล้วยังรู้สึกว่าไม่คุ้ม ทักมาบอกเราได้เลย\nถ้าขาดขั้นไหนไป จะไม่ได้รับเงินคืน";

/** Verbatim from the shift_round_icebreaker_questions seed, with manual line breaks. */
const QUESTIONS = [
  { id: 1, th: "มีเรื่องอะไรที่คุณอยากให้\nคนอื่นถามคุณบ่อยกว่านี้?", en: "What do you wish people asked you\nabout more often?" },
  { id: 2, th: "มีเรื่องอะไรที่คุณคิดว่า\nคนเราควรให้ความสำคัญมากกว่านี้?", en: "What do you think people\nshould care about more?" },
  { id: 3, th: "ถ้าคุณรวยแบบไม่ต้องกังวลเรื่องเงินอีกแล้ว\nคุณจะยังทำงานอยู่ไหม?\nถ้ายังทำ คุณอยากทำงานอะไร?\nถ้าไม่ทำ คุณอยากใช้ชีวิตแบบไหน?", en: "If money were never a worry again,\nwould you still work? If yes, at what?\nIf not, how would you live?" },
  { id: 4, th: "มีเรื่องอะไรที่คุณคิดว่าตัวเอง\nเก่งกว่าคนทั่วไปเป็นพิเศษ?", en: "What are you unusually good at?" },
  { id: 5, th: "มีหัวข้ออะไรที่คุณสามารถพูด\nเกี่ยวกับมันได้นานเป็นชั่วโมง\nโดยไม่รู้สึกเบื่อ?", en: "What topic could you talk about\nfor an hour without getting bored?" },
  { id: 6, th: "มีเรื่องอะไรเกี่ยวกับตัวคุณ\nที่คนอื่นมักเข้าใจผิด?", en: "What do people often get wrong\nabout you?" },
  { id: 7, th: "คุณมักจะรู้สึกสนุกหรือสบายใจ\nเวลาอยู่กับคนแบบไหน?", en: "What kind of people do you feel\nmost at ease with?" },
  { id: 8, th: "มีเรื่องเล็ก ๆ หรือเรื่องเฉพาะเจาะจง\nอะไรที่ทำให้คุณมีความสุขแบบแปลก ๆ?", en: "What small, specific thing\nmakes you oddly happy?" },
  { id: 9, th: "ถ้าปีหน้าคุณสามารถเก่งขึ้นอย่างมาก\nในเรื่องหนึ่ง คุณอยากเก่งเรื่องอะไร?", en: "If you could get much better at one thing\nnext year, what would it be?" },
  { id: 10, th: "มีอะไรที่คุณรู้สึกว่า \"มันถูกออกแบบมาได้แย่มาก\"\nหรือ \"มันไม่ควรจะเป็นแบบนี้\"\nจนทุกครั้งที่เห็นแล้วรู้สึกหงุดหงิด?", en: "What is so badly designed, or so\n\"it shouldn't be like this\",\nthat it annoys you every time you see it?" },
];

/** One question per round: light, then deeper, then the one that feeds 3 ไอเดีย. */
const ROUND_QUESTION = [8, 5, 10];

/**
 * Secret missions. 1 to 11 are the moves in SHIFT2_INTERVIEW (ask about what
 * already happened, ask why one level deeper, quote don't summarise, ask for
 * the next person), so the game rehearses the 20:30 "วิธีคุยกับคน" segment
 * without saying so until the debrief. 12 is the spy. A d12 roll picks one.
 */
const MISSIONS = [
  "ถามใครสักคนว่า \"ครั้งล่าสุดที่...คือเมื่อไหร่ เล่าให้ฟังหน่อย\"",
  "ถาม \"ทำไม\" ต่ออีกชั้น กับคนเดิม 2 ครั้งติดกัน",
  "ทำให้ใครสักคนพูดตัวเลขออกมา (กี่ครั้ง กี่นาที กี่บาท)",
  "พอใครพูดจบ เงียบนับ 1 ถึง 5 ในใจ จนเขาพูดต่อเอง",
  "ทวนคำพูดเพื่อนแบบคำต่อคำ \"เมื่อกี้บอกว่า...\" จนเขาตอบว่า \"ใช่\"",
  "ถามว่า \"ตอนนั้นทำยังไงต่อ\" หรือ \"ใช้อะไรช่วย\"",
  "ขอให้ใครสักคน \"ยกตัวอย่างจริง\" ให้ฟังได้สำเร็จ",
  "ถามว่า \"ตรงไหนยากที่สุด\" แล้วได้คำตอบ",
  "ถามต่อจากคำตอบของคนเดิม 3 ข้อติด โดยไม่เปลี่ยนเรื่อง",
  "ชวนคนที่พูดน้อยที่สุดในห้อง ให้เล่าเพิ่ม 1 เรื่อง",
  "ถามว่า \"มีใครอีกไหมที่เป็นแบบนี้\"",
  "สปาย: แต่งคำตอบของรอบนี้ 1 เรื่อง ให้เนียนจนไม่มีใครจับได้",
];

/**
 * Rooms per round. Players 1-18 sit in a 3x6 grid (row r = 0..2, col c);
 * round k puts row r's player with col (g + k*r) mod 6 in room g. Any two
 * players then share a room at most once across the three rounds, and
 * neighbouring frame numbers (likely friends who joined together) never do.
 * Spare frames 19 and 20 go, each round, to the first rooms where they meet
 * nobody they have met before.
 */
const SCHEDULE = (() => {
  const met = new Set();
  const meet = (room) => room.forEach((a) => room.forEach((b) => a !== b && met.add(`${a}-${b}`)));
  const fresh = (room, p) => room.every((a) => !met.has(`${a}-${p}`));
  return Array.from({ length: ROUNDS }, (_, k) => {
    const rooms = Array.from({ length: ROOMS }, (_, g) =>
      [0, 1, 2].map((r) => r * ROOMS + ((g + k * r) % ROOMS) + 1));
    for (const spare of [19, 20]) {
      const room = rooms.find((rm) => rm.length === 3 && fresh(rm, spare));
      if (!room) throw new Error(`no fresh room for ${spare} in round ${k + 1}`);
      room.push(spare);
    }
    rooms.forEach(meet);
    return rooms;
  });
})();

const roomsForRound = (k) => SCHEDULE[k];

function assertNoRepeatPairs() {
  const seen = new Set();
  for (let k = 0; k < ROUNDS; k++) {
    for (const room of roomsForRound(k)) {
      for (const a of room) for (const b of room) {
        if (a >= b) continue;
        const key = `${a}-${b}`;
        if (seen.has(key)) throw new Error(`pair ${key} meets twice`);
        seen.add(key);
      }
    }
  }
}

// ---------------------------------------------------------------- palette

const C = {
  ink: "#1e1e1e",
  muted: "#868e96",
  line: "#ced4da",
  yellow: "#fff3bf",
  highlighter: "#ffec99",
  blue: "#e7f5ff",
  green: "#ebfbee",
  pink: "#fff0f6",
  violet: "#f3f0ff",
  orange: "#fff4e6",
  red: "#e03131",
  accent: "#1971c2",
};

const FONT = { hand: 5, body: 6 }; // Excalifont, Nunito (Thai falls back to the system font)

// ---------------------------------------------------------------- element builders

let seq = 0;
const now = Date.now();
const rid = () => `s2-${(seq++).toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const rint = () => Math.floor(Math.random() * 2 ** 31);
const elements = [];

/** Rough glyph widths in em, enough for selection boxes; text renders by content. */
function charWidth(ch) {
  const c = ch.codePointAt(0);
  if (c === 0x0e31 || (c >= 0x0e34 && c <= 0x0e3a) || (c >= 0x0e47 && c <= 0x0e4e)) return 0;
  if (c >= 0x0e00 && c <= 0x0e7f) return 0.6;
  if (c === 0x20) return 0.28;
  if (c >= 0x1f000) return 1.25;
  if (c >= 0x2000 && c <= 0x2bff) return 1;
  if (/[A-Z]/.test(ch)) return 0.66;
  if (/[0-9]/.test(ch)) return 0.58;
  return 0.52;
}

function measure(str, size) {
  const lines = str.split("\n");
  const width = Math.max(...lines.map((l) => [...l].reduce((w, ch) => w + charWidth(ch), 0))) * size;
  return { width: Math.ceil(width) + 4, height: Math.ceil(lines.length * size * 1.25) };
}

function base(type, x, y, width, height, o = {}) {
  const el = {
    id: rid(), type, x, y, width, height, angle: o.angle ?? 0,
    strokeColor: o.stroke ?? C.ink,
    backgroundColor: o.bg ?? "transparent",
    fillStyle: "solid",
    strokeWidth: o.strokeWidth ?? 1,
    strokeStyle: o.dashed ? "dashed" : "solid",
    roughness: o.roughness ?? 1,
    opacity: 100,
    groupIds: o.groupIds ?? [],
    frameId: o.frameId ?? null,
    roundness: o.roundness === undefined ? null : o.roundness,
    seed: rint(), version: 1, versionNonce: rint(),
    isDeleted: false, boundElements: null, updated: now,
    link: o.link ?? null, locked: o.locked ?? true,
  };
  elements.push(el);
  return el;
}

function text(str, x, y, o = {}) {
  const size = o.size ?? 20;
  const { width, height } = measure(str, size);
  return base("text", x, y, width, height, {
    ...o, stroke: o.color ?? C.ink, roughness: 0,
  }) && Object.assign(elements[elements.length - 1], {
    text: str, originalText: str, fontSize: size, fontFamily: o.family ?? FONT.body,
    textAlign: "left", verticalAlign: "top", containerId: null,
    autoResize: true, lineHeight: 1.25,
  });
}

function rect(x, y, w, h, o = {}) {
  return base("rectangle", x, y, w, h, {
    roundness: { type: 3 }, stroke: C.line, ...o,
  });
}

/** Text centred inside a rectangle that shares its angle (sticky notes). */
function sticky(str, x, y, w, h, o = {}) {
  const box = rect(x, y, w, h, { bg: o.bg ?? C.highlighter, stroke: "transparent", angle: o.angle, frameId: o.frameId, locked: true });
  const size = o.size ?? 22;
  const m = measure(str, size);
  const t = base("text", x + (w - m.width) / 2, y + (h - m.height) / 2, m.width, m.height, {
    angle: o.angle, frameId: o.frameId, roughness: 0,
  });
  Object.assign(t, {
    text: str, originalText: str, fontSize: size, fontFamily: o.family ?? FONT.body,
    textAlign: "center", verticalAlign: "middle", containerId: box.id,
    autoResize: true, lineHeight: 1.25,
  });
  box.boundElements = [{ id: t.id, type: "text" }];
  return box;
}

/** Frames go after their children so they clip them, as Excalidraw orders them. */
function frame(name, x, y, w, h, build) {
  const id = rid();
  const start = elements.length;
  build({ id, x, y, w, h });
  for (let i = start; i < elements.length; i++) elements[i].frameId ??= id;
  const f = base("frame", x, y, w, h, { stroke: C.muted, strokeWidth: 2, roughness: 0 });
  f.id = id;
  f.name = name;
  return f;
}

// ---------------------------------------------------------------- zones

const PAD = 48;
const bullets = (rows) => rows.map((r) => `•  ${r.replace(/\n/g, "\n    ")}`).join("\n\n");

function startHere(x, y) {
  return frame("เริ่มที่นี่", x, y, 1700, 1250, (f) => {
    text("SHIFT[2] · บอร์ดของรุ่น", x + PAD, y + PAD, { size: 64, family: FONT.hand });
    text("ที่ทำงานของเราทั้ง 7 วัน ทุกคนมีกรอบของตัวเองอยู่ข้างล่าง", x + PAD, y + 140, { size: 28, color: C.muted });

    text("เริ่ม 3 ขั้น", x + PAD, y + 220, { size: 36, family: FONT.hand, color: C.accent });
    text([
      "1  ตั้งชื่อเล่นบนเคอร์เซอร์: กด Share มุมขวาบน\n    แล้วแก้ช่อง Your name",
      "2  จองกรอบ: เลือกกรอบว่างข้างล่าง (01 ถึง 20)\n    พิมพ์ชื่อเล่นในช่องสีเหลืองบนสุด\n    เลขกรอบ = เลขของเราในเกมคืนนี้",
      "3  ตามจอพี่: กดรูปพี่ที่มุมขวาบน จอจะตามพี่ไปเอง\n    ขยับจอเมื่อไหร่ก็เลิกตาม",
    ].join("\n\n"), x + PAD, y + 280, { size: 24 });

    text("ใช้บอร์ดยังไง", x + PAD, y + 690, { size: 36, family: FONT.hand, color: C.accent });
    text([
      "ดับเบิลคลิกในกล่อง = พิมพ์ในกล่อง",
      "Ctrl / Cmd + V = แปะรูป, SVG หรือข้อความ (รูปละไม่เกิน 4MB)",
      "ลากไฟล์จากเครื่องมาวางก็ได้",
      "เสียง: บอร์ดเล่นเสียงไม่ได้ อัดใน Discord แล้วแปะลิงก์แทน",
      "หลงทาง: กด Shift + 1 ดูทั้งบอร์ด",
      "เผลอลบ: Ctrl / Cmd + Z",
    ].join("\n"), x + PAD, y + 750, { size: 24 });

    rect(x + 900, y + 220, 750, 700, { bg: C.pink, stroke: "transparent", locked: true });
    text("กติกาบอร์ด", x + 930, y + 245, { size: 36, family: FONT.hand, color: C.red });
    text(bullets([
      "ชื่อเล่นเท่านั้น ไม่ใส่นามสกุล\nโรงเรียน เบอร์ หรือ IG",
      "คนที่เราไปคุยด้วย: ไม่แปะรูปหน้า\nไม่ใส่ชื่อจริง แคปแชทได้\nแต่เบลอชื่อกับรูปโปรไฟล์ก่อน",
      "ไม่ย้าย ไม่ลบของในกรอบเพื่อน",
      "ห้ามกด Reset the canvas\n(ลบทั้งบอร์ดของทุกคน)",
      "ลิงก์บอร์ดอยู่ใน Discord ของรุ่นเท่านั้น\nอย่าส่งต่อ",
    ]), x + 930, y + 310, { size: 24 });

    sticky("บอร์ดเละได้ ไม่ต้องสวย\nของจริงสำคัญกว่า", x + 1100, y + 1010, 420, 120, { angle: -0.05, frameId: f.id });
  });
}

function park(x, y) {
  return frame("Park: กติกา + คืนเงิน", x, y, 1500, 1250, (f) => {
    text("SHIFT ไม่ใช่ห้องเรียน", x + PAD, y + PAD, { size: 56, family: FONT.hand });
    text("ไม่มีเกรด กรรมการตัวจริงคือคนใช้จริง", x + PAD, y + 130, { size: 28, color: C.muted });

    text("กติกา", x + PAD, y + 210, { size: 36, family: FONT.hand, color: C.accent });
    text(bullets(RULES), x + PAD, y + 270, { size: 22 });

    const rx = x + 720;
    rect(rx, y + 200, 730, 1000, { bg: C.green, stroke: "transparent", locked: true });
    text("9 ขั้น คืนเงิน", rx + 30, y + 225, { size: 36, family: FONT.hand, color: C.accent });
    text(REFUND_STEPS.map((step, i) => `${i + 1}  ${step}`).join("\n\n"), rx + 30, y + 290, { size: 19 });
    text(REFUND_HOW, rx + 30, y + 1090, { size: 20, color: C.muted });

    text("#progress คือที่นับ\nบอร์ดนี้คือที่ทำงานและร่าง", x + PAD, y + 860, { size: 30, family: FONT.hand, color: C.red });
    sticky("พลาดได้ ถามได้\nไม่มีคำถามโง่", x + 140, y + 1030, 380, 120, { angle: 0.04, frameId: f.id });
  });
}

function tonight(x, y) {
  return frame("คืนนี้", x, y, 1400, 1250, () => {
    text("คืนนี้ พ. 14 ต.ค.", x + PAD, y + PAD, { size: 56, family: FONT.hand });
    text("19:00 ถึง 21:00 · Discord ห้องเสียง Park", x + PAD, y + 130, { size: 28, color: C.muted });
    TONIGHT.forEach(([time, what, detail], i) => {
      const rowY = y + 200 + i * 112;
      rect(x + PAD, rowY, 1300, 96, { bg: i % 2 ? C.blue : C.green, stroke: "transparent", locked: true });
      text(time, x + PAD + 24, rowY + 28, { size: 32, family: FONT.hand });
      text(what, x + PAD + 170, rowY + 14, { size: 26, family: FONT.hand });
      text(detail, x + PAD + 170, rowY + 54, { size: 20, color: "#495057" });
    });
    text("สุ่มชื่อ: wheelofnames.com", x + PAD, y + 1130, { size: 26, color: C.accent, link: "https://wheelofnames.com" });
  });
}

function week(x, y) {
  const cardW = 300, gap = 24, w = PAD * 2 + 7 * cardW + 6 * gap;
  return frame("7 วัน", x, y, w, 900, () => {
    text("SHIFT[2] · 7 วัน", x + PAD, y + PAD, { size: 56, family: FONT.hand });
    text("14 ถึง 20 ต.ค. · 19:00 ถึง 21:00 · วันที่ไม่มีเซสชันสด ทำเองใน Discord", x + PAD, y + 130, { size: 28, color: C.muted });
    WEEK.forEach((d, i) => {
      const cx = x + PAD + i * (cardW + gap), cy = y + 210;
      rect(cx, cy, cardW, 650, { bg: i === 0 ? C.yellow : C.violet, stroke: "transparent", locked: true });
      text(`D${d.day}`, cx + 24, cy + 20, { size: 64, family: FONT.hand, color: i === 0 ? C.red : C.ink });
      text(d.date, cx + 24, cy + 110, { size: 22, color: C.muted });
      text(d.live ? "เซสชันสด" : "ไม่มีเซสชันสด", cx + 24, cy + 145, { size: 18, color: d.live ? C.accent : C.red });
      text(d.name, cx + 24, cy + 190, { size: 28, family: FONT.hand });
      text("เป้าหมาย", cx + 24, cy + 310, { size: 18, color: C.muted });
      text(d.goal, cx + 24, cy + 340, { size: 20 });
      text("Mission", cx + 24, cy + 520, { size: 18, color: C.muted });
      text(d.mission, cx + 24, cy + 550, { size: 20 });
    });
  });
}

function gameRules(x, y) {
  return frame("ภารกิจลับ: วิธีเล่น", x, y, 1900, 1400, (f) => {
    text("ภารกิจลับ", x + PAD, y + PAD, { size: 72, family: FONT.hand });
    text("3 รอบ · รอบละ 8 นาที (คุย 6 + ทาย 2) · ห้องละ 3 คน", x + PAD, y + 150, { size: 28, color: C.muted });

    text("วิธีเล่น", x + PAD, y + 230, { size: 36, family: FONT.hand, color: C.accent });
    text([
      "1  ดูเลขห้องของรอบนี้ในตาราง เข้าห้องเสียงนั้นใน Discord\n    แล้วเลื่อนบอร์ดไปที่ช่องของห้องเรา",
      "2  เลือกภารกิจ 1 ข้อแบบลับ ๆ ห้ามบอกใคร\n    ให้สุ่มให้: พิมพ์ roll a d12 ใน Google",
      "3  ผลัดกันตอบ \"คำถามของรอบ\" คนละ 2 นาที\n    คนที่ฟังอยู่ วาดสิ่งที่ได้ยินลงช่องห้อง",
      "4  ระหว่างคุย แอบทำภารกิจ ทำได้แล้วพิมพ์ ✅\n    ในแชทของห้องเสียง (ห้ามบอกว่าภารกิจอะไร)",
      "5  2 นาทีสุดท้าย: ทายกันว่าใครมีภารกิจอะไร\n    ใครคือสปาย แล้วค่อยเฉลย",
      "6  จดคะแนนตัวเองในกระดานคะแนน",
    ].join("\n\n"), x + PAD, y + 290, { size: 24 });

    rect(x + PAD, y + 1060, 800, 290, { bg: C.yellow, stroke: "transparent", locked: true });
    text("คะแนน", x + PAD + 28, y + 1080, { size: 32, family: FONT.hand });
    text([
      "+2  ทำภารกิจสำเร็จ และไม่มีใครทายถูก",
      "+1  ทำภารกิจสำเร็จ แต่โดนทายถูก",
      "+1  ทายภารกิจของเพื่อนถูก (ต่อ 1 คน)",
      "+1  ✅ คนแรกของห้องในรอบนั้น",
    ].join("\n"), x + PAD + 28, y + 1140, { size: 24 });

    const mx = x + 940;
    text("ภารกิจ (d12)", mx, y + 230, { size: 36, family: FONT.hand, color: C.accent });
    MISSIONS.forEach((m, i) => {
      const my = y + 295 + i * 86;
      const spy = i === MISSIONS.length - 1;
      rect(mx, my, 910, 72, { bg: spy ? C.pink : C.blue, stroke: "transparent", locked: true });
      text(String(i + 1).padStart(2, "0"), mx + 18, my + 17, { size: 30, family: FONT.hand, color: spy ? C.red : C.ink });
      text(m, mx + 90, my + 22, { size: 21, color: spy ? C.red : C.ink });
    });
    sticky("แพ้ได้ ไม่มีใครจำคะแนน\nแต่จะจำว่าใครเนียนสุด", x + 1380, y + 70, 440, 120, { angle: 0.04, frameId: f.id });
  });
}

/** Where each player goes per round, and the space that room draws in. */
function roomsTable(x, y) {
  const colW = 380, rowH = 330, left = 470;
  const w = PAD * 2 + left + ROOMS * colW;
  return frame("ห้อง + ช่องวาด", x, y, w, 1400, () => {
    text("ห้องของแต่ละรอบ", x + PAD, y + PAD, { size: 56, family: FONT.hand });
    text("เลข = เลขกรอบที่เราจองไว้ · ห้อง = ห้องเสียงใน Discord · วาดในช่องของห้องเรา", x + PAD, y + 130, { size: 26, color: C.muted });
    const top = y + 200;
    for (let g = 0; g < ROOMS; g++) {
      text(`ห้อง ${g + 1}`, x + PAD + left + g * colW + 16, top, { size: 32, family: FONT.hand, color: C.accent });
    }
    for (let k = 0; k < ROUNDS; k++) {
      const ry = top + 60 + k * (rowH + 20);
      const q = QUESTIONS.find((qq) => qq.id === ROUND_QUESTION[k]);
      const bg = [C.green, C.blue, C.orange][k];
      rect(x + PAD, ry, left - 20, rowH, { bg, stroke: "transparent", locked: true });
      text(`รอบ ${k + 1}`, x + PAD + 20, ry + 16, { size: 40, family: FONT.hand });
      text(`คำถาม ${q.id}`, x + PAD + 20, ry + 76, { size: 20, color: C.muted });
      text(q.th, x + PAD + 20, ry + 110, { size: 17 });
      roomsForRound(k).forEach((room, g) => {
        const cx = x + PAD + left + g * colW;
        rect(cx, ry, colW - 16, rowH, { bg, stroke: "transparent", locked: true });
        text(room.map((n) => String(n).padStart(2, "0")).join(" · "), cx + 16, ry + 12, { size: 30, family: FONT.hand });
      });
    }
    text("19, 20 = กรอบสำรอง · ห้องไหนเหลือคนเดียว รอพี่ย้ายให้ไปห้องข้าง ๆ", x + PAD, y + 1300, { size: 22, color: C.muted });
  });
}

function scoreboard(x, y) {
  const cellW = 220, cellH = 110, cols = 4;
  const w = PAD * 2 + cols * cellW + (cols - 1) * 20;
  return frame("กระดานคะแนน", x, y, w, 1400, () => {
    text("กระดานคะแนน", x + PAD, y + PAD, { size: 56, family: FONT.hand });
    text("ดับเบิลคลิกกล่องตัวเอง\nแล้วพิมพ์คะแนนรวม", x + PAD, y + 130, { size: 24, color: C.muted });
    for (let i = 0; i < STUDENT_FRAMES; i++) {
      const cx = x + PAD + (i % cols) * (cellW + 20);
      const cy = y + 230 + Math.floor(i / cols) * (cellH + 120);
      text(`#${String(i + 1).padStart(2, "0")}`, cx, cy, { size: 30, family: FONT.hand });
      rect(cx, cy + 45, cellW, cellH, { bg: "#ffffff", locked: false, strokeWidth: 2 });
    }
  });
}

function questionCards(x, y) {
  const cardW = 520, cardH = 230, gap = 24, cols = 2;
  const w = PAD * 2 + cols * cardW + gap;
  return frame("การ์ดคำถาม", x, y, w, 1400, () => {
    text("การ์ดคำถาม", x + PAD, y + PAD, { size: 56, family: FONT.hand });
    text("ห้องไหนคุยครบแล้ว หยิบใบอื่นมาถามต่อได้", x + PAD, y + 130, { size: 24, color: C.muted });
    QUESTIONS.forEach((q, i) => {
      const cx = x + PAD + (i % cols) * (cardW + gap);
      const cy = y + 190 + Math.floor(i / cols) * (cardH + gap);
      const inRound = ROUND_QUESTION.indexOf(q.id);
      rect(cx, cy, cardW, cardH, { bg: inRound >= 0 ? C.yellow : "#ffffff", stroke: C.line, locked: true });
      text(String(q.id), cx + 18, cy + 12, { size: 30, family: FONT.hand, color: C.accent });
      if (inRound >= 0) text(`รอบ ${inRound + 1}`, cx + cardW - 90, cy + 16, { size: 20, color: C.red });
      text(q.th, cx + 60, cy + 18, { size: 20 });
      text(q.en, cx + 60, cy + cardH - 18 - measure(q.en, 15).height, { size: 15, color: C.muted });
    });
  });
}

function studentFrame(n, x, y) {
  const w = 1500, h = 1230;
  const label = String(n).padStart(2, "0");
  return frame(label, x, y, w, h, () => {
    text(`#${label}`, x + PAD, y + 36, { size: 72, family: FONT.hand });
    text("ชื่อเล่น (ทำเป็นทีม ใส่ทุกคนในกรอบเดียวได้)", x + 260, y + 28, { size: 18, color: C.muted });
    rect(x + 260, y + 58, 640, 76, { bg: C.yellow, strokeWidth: 2, locked: false });
    text("D1 · 3 ไอเดีย → เลือก 1", x + 950, y + 48, { size: 28, family: FONT.hand, color: C.accent });
    text("ดับเบิลคลิกในกล่อง แล้วพิมพ์ได้เลย", x + 950, y + 96, { size: 18, color: C.muted });

    const colW = 448, gapX = 30;
    for (let i = 0; i < 3; i++) {
      const bx = x + PAD + i * (colW + gapX), by = y + 170;
      text(`ไอเดีย ${i + 1}`, bx, by, { size: 26, family: FONT.hand });
      text("ปัญหาที่เห็นเอง", bx, by + 40, { size: 16, color: C.muted });
      rect(bx, by + 64, colW, 150, { bg: C.pink, locked: false });
      text("ใครเจอบ้าง (กลุ่มคนให้ชัด)", bx, by + 226, { size: 16, color: C.muted });
      rect(bx, by + 250, colW, 90, { bg: C.blue, locked: false });
      text("ทักคนกลุ่มนี้เองได้ไหม โดยไม่ต้องขอผู้ใหญ่ (✓ / ✗)", bx, by + 352, { size: 16, color: C.muted });
      rect(bx, by + 376, colW, 60, { bg: "#ffffff", locked: false });
    }

    const half = (w - PAD * 2 - gapX) / 2;
    const ry = y + 640;
    text("เลือก 1", x + PAD, ry, { size: 26, family: FONT.hand });
    text("อันไหน เพราะอะไร (พี่ถาม เราตัดเอง)", x + PAD, ry + 36, { size: 16, color: C.muted });
    rect(x + PAD, ry + 62, half, 140, { bg: C.yellow, locked: false });
    const fx = x + PAD + half + gapX;
    text("First contact", fx, ry, { size: 26, family: FONT.hand });
    text("ทักใคร นัดคุย 10 นาทีพรุ่งนี้กี่โมง · แคปลง #first-contact (เบลอชื่อและรูปก่อน)", fx, ry + 36, { size: 16, color: C.muted });
    rect(fx, ry + 62, half, 140, { bg: C.green, locked: false });

    const sy = y + 880;
    text("อัปเดตทุกวัน: แปะรูป ข้อความ หรือลิงก์เสียงลงช่องของวันนั้น แล้วโพสต์ใน #progress ด้วย (#progress คือที่นับ)", x + PAD, sy, { size: 18, color: C.muted });
    const slotGap = 12, slotW = (w - PAD * 2 - 6 * slotGap) / 7;
    WEEK.forEach((d, i) => {
      const sx = x + PAD + i * (slotW + slotGap);
      text(`D${d.day} · ${d.date.split(" ")[1]} ต.ค.`, sx, sy + 34, { size: 18, family: FONT.hand, color: i === 0 ? C.red : C.ink });
      text(d.slot, sx, sy + 60, { size: 14, color: C.muted });
      rect(sx, sy + 106, slotW, 210, { bg: "#ffffff", dashed: true, locked: false });
    });
  });
}

function parkingLot(x, y) {
  return frame("ที่จอดคำถาม", x, y, 1500, 1230, () => {
    text("ที่จอดคำถาม", x + PAD, y + PAD, { size: 64, family: FONT.hand });
    text("ติดอะไร แปะไว้ตรงนี้ หรือถามใน #ถามได้ทุกเรื่อง · พี่ตอบในที่เปิดเสมอ", x + PAD, y + 140, { size: 26, color: C.muted });
    for (let i = 0; i < 9; i++) {
      rect(x + PAD + (i % 3) * 470, y + 220 + Math.floor(i / 3) * 330, 430, 290, { bg: C.yellow, stroke: "transparent", locked: false });
    }
  });
}

// ---------------------------------------------------------------- layout

assertNoRepeatPairs();

const GAP = 120;
let cursorX = 0;
const place = (fn, y) => { const f = fn(cursorX, y); cursorX += f.width + GAP; return f; };

place(startHere, 0);
place(park, 0);
place(tonight, 0);
place(week, 0);

cursorX = 0;
const row1Y = 1250 + 150;
place(gameRules, row1Y);
place(roomsTable, row1Y);
place(scoreboard, row1Y);
place(questionCards, row1Y);

const row2Y = row1Y + 1400 + 150;
const COLS = 5;
for (let i = 0; i < STUDENT_FRAMES; i++) {
  studentFrame(i + 1, (i % COLS) * (1500 + GAP), row2Y + Math.floor(i / COLS) * (1230 + GAP));
}
parkingLot(COLS * (1500 + GAP), row2Y);

const scene = {
  type: "excalidraw",
  version: 2,
  source: "https://excalidraw.com",
  elements,
  appState: { viewBackgroundColor: "#ffffff", gridSize: 20, gridStep: 5, gridModeEnabled: false },
  files: {},
};

writeFileSync(OUT, JSON.stringify(scene));
console.log(`wrote ${OUT}: ${elements.length} elements, ${elements.filter((e) => e.type === "frame").length} frames`);
for (let k = 0; k < ROUNDS; k++) {
  console.log(`round ${k + 1}: ${roomsForRound(k).map((r, g) => `R${g + 1}=[${r.join(",")}]`).join(" ")}`);
}
