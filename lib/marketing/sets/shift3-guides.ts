import {
  SHIFT_COHORT_3,
  cohortDayCount,
  formatThaiDate,
  formatThaiDateRange,
} from "@/lib/content/shift-cohort";

import type { StudioSet } from "../types";

/**
 * Student value guides published in the SHIFT[3] run-up. Each one is worth
 * saving even for someone who never applies: SHIFT is one soft line on the
 * last slide and in the caption's last line, nowhere else. The caption line
 * reads the cohort record, so a date move is one edit in shift-cohort.ts.
 *
 * Examples on the slides are made up and say so; past-round lessons are
 * paraphrased from the shift[1] debrief with no names and no quote marks.
 */

const C = SHIFT_COHORT_3;
const RANGE = formatThaiDateRange(C.startDate, C.endDate);
const DAYS = cohortDayCount(C);
const DEADLINE = formatThaiDate(C.applyDeadline);

/** The only SHIFT line in a guide caption: always last, always from data. */
function shiftLine(lead: string): string {
  return `${lead}? ${C.name} คือ ${DAYS} วันสร้างต้นแบบจริงให้คนจริงลองใช้ จบด้วยงาน 1 ชิ้นที่เล่าในพอร์ตได้ ออนไลน์ ${RANGE} ปิดรับ ${DEADLINE} คอมเมนต์ "SHIFT" รับลิงก์สมัครทาง DM`;
}

/** The soft ask on each guide's final slide. */
const COMMENT_SHIFT = "คอมเมนต์ SHIFT รับลิงก์ทาง DM";

const BASE = {
  channel: "instagram",
  format: "ig-tall",
  theme: "cosmos",
  audience: "student",
  created: "2026-10-23",
} as const;

const DEBRIEF = "company-brain/shift.md, shift[1] debrief: what students said (no names, paraphrased)";
const COHORT_SOURCE = "lib/content/shift-cohort.ts SHIFT_COHORT_3 (caption last line: name, dates, day count)";

export const INTERVIEW_STORY: StudioSet = {
  ...BASE,
  slug: "guide-interview-story",
  title: "Guide: tell one project in 60 seconds for the TCAS round 1 interview",
  angle:
    "The portfolio interview is what a past student feared most; a 5-part, 60-second project story (problem, who you talked to, what broke, what changed, one number), weak vs strong answer, a 15-minute drill.",
  sources: [
    `${DEBRIEF}: one student said the TCAS portfolio interview is what they fear most`,
    "company-brain/alumni.md ideas to try: mock portfolio interviews",
    "lib/content/shift-cohort.ts schedule Day 5-7 (fix log, one number, tell what you learned)",
    "Compare slide example is invented and labelled as such; no admission outcome is claimed",
    COHORT_SOURCE,
  ],
  caption: [
    "รอบสัมภาษณ์พอร์ต TCAS รอบ 1 คือสิ่งที่รุ่นพี่คนหนึ่งบอกเราว่ากลัวที่สุด",
    "",
    "โครงนี้ช่วยเล่างาน 1 ชิ้นให้จบใน 60 วินาที โดยไม่ต้องท่องบท",
    "ปัญหา → คนที่ไปคุยด้วย → อะไรพัง → เราเปลี่ยนอะไร → ตัวเลข 1 ตัว",
    "",
    "สไลด์ 3 เทียบคำตอบแบบกว้างกับแบบชัด สไลด์ 6 คือแบบฝึก 15 นาที ทำคืนนี้ได้เลย",
    "เซฟไว้ แล้วส่งให้เพื่อนที่กำลังเตรียมสัมภาษณ์",
    "",
    shiftLine("ยังไม่มีงานของตัวเองให้เล่า"),
  ].join("\n"),
  hashtags: ["PassionSeed", "พอร์ตTCAS", "สัมภาษณ์TCAS", "TCASรอบ1", "ม6"],
  slides: [
    {
      kind: "cover",
      kicker: "TCAS Interview",
      icon: "mic",
      title: ["เล่าโปรเจกต์", "ให้จบใน", "**60 วินาที**"],
      note: "ซ้อมได้ตั้งแต่คืนนี้",
      sub: "รุ่นพี่คนหนึ่งบอกเราว่า\nรอบสัมภาษณ์พอร์ตน่ากลัวที่สุด\nโครงนี้ช่วยให้เล่าได้ไม่หลุด",
    },
    {
      kind: "points",
      tag: "The 60-second order",
      title: "เล่า 5 ท่อน ตามลำดับนี้",
      numbered: true,
      points: [
        { title: "ปัญหา · 10 วิ", body: "ใครเจออะไร ตอนไหน ใน 1 ประโยค" },
        { title: "คนที่ไปคุยด้วย · 15 วิ", body: "กี่คน และเขาพูดอะไรที่ทำให้เราเห็นภาพ" },
        { title: "อะไรพัง · 15 วิ", body: "จุดที่คนลองใช้แล้วติด หรือที่เราคิดผิด" },
        { title: "เราเปลี่ยนอะไร · 10 วิ", body: "แก้ตรงไหน เพราะได้ยินอะไรจากใคร" },
        { title: "ตัวเลข 1 ตัว · 10 วิ", body: "ก่อนแก้กับหลังแก้ เช่น กี่คนใช้จนจบ" },
      ],
      footnote: "รวมกัน ==ไม่เกิน 60 วินาที== ที่เหลือปล่อยให้กรรมการถามต่อ",
    },
    {
      kind: "compare",
      tag: "Weak vs strong",
      title: "เล่างานเดียวกัน 2 แบบ",
      left: {
        label: "แบบกว้าง",
        items: ["ทำเว็บจองห้องซ้อมดนตรี", "ใช้ AI สร้าง ทุกคนชอบมาก", "แก้ไปหลายรอบจนดีขึ้น", "ได้เรียนรู้การทำงานเป็นทีม"],
      },
      right: {
        label: "แบบชัด",
        items: [
          "ชมรมจองห้องซ้อมชนกันบ่อย",
          "คุยกับสมาชิก 6 คน เขาบอกว่าหาตารางว่างไม่เจอ",
          "รอบแรก 4 ใน 6 คนจองพลาด",
          "เลยย้ายปฏิทินขึ้นหน้าแรก",
          "ลองอีกครั้ง พลาดเหลือ 1 ใน 6 คน",
        ],
      },
      footnote: "ตัวอย่างสมมติ ฝั่งขวามีครบ 5 ท่อน เรียงตามลำดับ",
    },
    {
      kind: "statement",
      tag: "Don't hide it",
      big: ["ท่อนที่**พัง**", "คือท่อนที่", "บอกว่าลงมือจริง"],
      body: "ฟีเจอร์มีอะไรบ้าง ใครก็พูดได้\nแต่จุดที่คนใช้แล้วติด กับวิธีที่เราแก้\nคือท่อนที่บอกว่าเราลงมือจริง เล่าได้โดยไม่ต้องท่อง",
      note: "เล่าเป็นเหตุการณ์: 4 ใน 6 คนหาปฏิทินจองไม่เจอ",
    },
    {
      kind: "points",
      tag: "Follow-ups",
      title: "ซ้อมคำถามต่ออีก 4 ข้อ",
      points: [
        { title: "ทำไมเลือกปัญหานี้", body: "ยกเหตุการณ์ที่เจอเอง หรือเรื่องที่ได้ยินจากคนเจอปัญหาจริง 1 เรื่อง" },
        { title: "คุณทำส่วนไหนเอง", body: "งานทีม บอกชิ้นที่ลงมือเองให้ชัด แล้วให้เครดิตเพื่อน" },
        { title: "ตรงไหนยากที่สุด", body: "เลือก 1 เรื่อง แล้วบอกว่าผ่านมาได้ยังไง" },
        { title: "ถ้ามีเวลาอีก 7 วัน จะทำอะไรต่อ", body: "บอกสิ่งที่อยากทดสอบต่อ ไม่ใช่แค่ฟีเจอร์ที่จะเพิ่ม" },
      ],
      footnote: "จดบันทึกไว้ระหว่างทำ ทั้ง 4 ข้อตอบจากบันทึกได้เลย",
    },
    {
      kind: "points",
      tag: "Practice drill",
      title: "ซ้อมคืนนี้ 15 นาที",
      numbered: true,
      points: [
        { title: "เขียน 5 ท่อน ท่อนละ 1 ประโยค", body: "เขียนลงกระดาษ ไม่ต้องสวย ห้ามเกินบรรทัดเดียว" },
        { title: "อัดเสียงตัวเอง แล้วจับเวลา", body: "เกิน 60 วินาที ตัดคำขยายก่อน อย่าตัดตัวเลข" },
        { title: "ฟังซ้ำ หาคำกว้างๆ", body: "เช่น ทุกคน ดีมาก หลายคน แทนด้วยชื่อกลุ่มหรือตัวเลข" },
        { title: "ให้เพื่อนถามแทรก 1 ข้อ", body: "ตอบให้จบใน 20 วินาที จากของที่ทำมาจริง" },
      ],
      footnote: "ทำซ้ำ ==3 คืน== ก่อนวันสัมภาษณ์ ไม่ต้องท่อง ให้จำแค่ 5 ท่อน",
    },
    {
      kind: "cta",
      tag: "Save",
      title: "เก็บโครงนี้\nไว้ซ้อมก่อน\nวันสัมภาษณ์",
      icon: "chat",
      action: "save",
      body: `ยังไม่มีงานของตัวเองให้เล่า?\n${COMMENT_SHIFT}`,
    },
  ],
};

export const PICK_A_PROBLEM: StudioSet = {
  ...BASE,
  slug: "guide-pick-a-problem",
  title: "Guide: find one problem worth building for in 20 minutes",
  angle:
    "Picking a topic was hard for past students; a timed 20-minute method: 10 annoyances from the last 7 days, who else has it, aim to message 5 of them this week, then one problem statement with the why left blank until you ask.",
  sources: [
    `${DEBRIEF}: picking a topic was hard (one student chose last); projects for their own school depend on teachers agreeing; find users another way, e.g. student leaders`,
    "company-brain/shift.md Day 2 problem statement template: [Who] struggles with [what] when [situation], because [why, from an interview]",
    "Example slide is invented and labelled as such",
    COHORT_SOURCE,
  ],
  caption: [
    "รุ่นพี่เล่าว่าด่านที่ยากสุดคือตอนเลือกโจทย์ บางคนเลือกได้เป็นคนสุดท้ายของรุ่น",
    "",
    "ใช้เวลา 20 นาที มีแค่กระดาษแผ่นเดียวกับมือถือก็เริ่มได้",
    "1. จดเรื่องน่ารำคาญใน 7 วันที่ผ่านมาให้ได้ 10 ข้อ (8 นาที)",
    "2. ข้างแต่ละข้อ เขียนชื่อคนอื่นที่เจอแบบเดียวกัน (5 นาที)",
    "3. ลิสต์คนที่เจอปัญหานั้นและทักได้จริง ตั้งเป้า 5 คน ยังไม่ครบ ลองหาผ่านเพื่อนหรือกลุ่มที่เกี่ยวข้อง (5 นาที)",
    "4. เหลือ 1 คน 1 ปัญหา เขียนเป็น 1 ประโยค (2 นาที)",
    "",
    "ส่วนเหตุผลท้ายประโยค เว้นไว้ก่อน แล้วไปถามเขาจริง",
    "เซฟไว้ ทำคืนนี้ได้เลย",
    "",
    shiftLine("ได้โจทย์แล้ว อยากสร้างจริงไหม"),
  ].join("\n"),
  hashtags: ["PassionSeed", "พอร์ตTCAS", "ทำพอร์ต", "ทำโปรเจกต์", "ม5"],
  slides: [
    {
      kind: "cover",
      kicker: "Find a problem",
      icon: "compass",
      title: ["คิดไม่ออกว่า", "จะทำโปรเจกต์", "เรื่องอะไร?"],
      note: "รุ่นพี่ก็ติดตรงนี้",
      sub: "ใช้เวลา 20 นาที\nหาโจทย์ 1 เรื่องที่มีคนให้ไปถามต่อ\nมีแค่กระดาษแผ่นเดียวกับมือถือก็เริ่มได้",
    },
    {
      kind: "points",
      tag: "Step 1 · 8 min",
      title: "จดเรื่องน่ารำคาญ\nใน 7 วันที่ผ่านมา",
      numbered: true,
      points: [
        { title: "ไล่ดูแชท รูป และปฏิทินย้อนหลัง", body: "หาตอนที่เรารอ บ่น ถามซ้ำ หรือทำอะไรซ้ำๆ" },
        { title: "จดให้ได้ 10 ข้อ ยังไม่ต้องกรอง", body: "เรื่องเล็กแค่ไหนก็จด เรื่องเล็กทำต้นแบบได้จริง" },
        { title: "เขียนเป็นเหตุการณ์ ไม่ใช่หัวข้อ", body: "เช่น หาชีทสรุปใน LINE ไม่เจอ แทนคำว่า การเรียน" },
        { title: "ยังไม่ถึง 10 ข้อ ถามคนข้างๆ", body: "ช่วงนี้มีอะไรทำให้หงุดหงิดบ้าง แล้วจดคำตอบเขาด้วย" },
      ],
      footnote: "ครบ 8 นาทีแล้วได้ไม่ถึง 10 ข้อ ==ใช้เท่าที่มี== แล้วไปขั้นต่อไปเลย",
    },
    {
      kind: "points",
      tag: "Step 2 · 5 min",
      title: "ใครอีกบ้าง\nที่เจอแบบเดียวกัน",
      numbered: true,
      points: [
        { title: "ข้างแต่ละข้อ เขียนชื่อคนที่เจอ", body: "ชื่อคนที่เรารู้จักจริง ไม่ใช่คำว่า ทุกคน" },
        { title: "ยังนึกชื่อไม่ออก พักข้อนี้ไว้ก่อน", body: "รอบนี้เลือกข้อที่หาคนคุยได้ทัน" },
        { title: "ข้อไหนเกิดทุกสัปดาห์ ใส่ดาวไว้", body: "เรื่องที่เกิดปีละครั้ง หาคนมาลองใช้ยาก" },
        { title: "วงข้อที่มีชื่อเยอะที่สุด 3 ข้อ", body: "ถ้าเท่ากัน เลือกข้อที่มีดาว" },
      ],
      footnote: "ปัญหาที่เกิดบ่อยและมีหลายคนเจอ หาคนมาลองต้นแบบได้ง่ายที่สุด",
    },
    {
      kind: "points",
      tag: "Step 3 · 5 min",
      title: "ทักใครได้บ้าง\nในสัปดาห์นี้",
      numbered: true,
      points: [
        { title: "เริ่มจากคนที่ทักได้จริง", body: "มี LINE หรือ IG ของเขาอยู่แล้ว หรือเจอกันทุกวัน" },
        { title: "ตั้งเป้า 5 คน", body: "ยังไม่ครบ ลองหาผ่านเพื่อนหรือกลุ่มที่เกี่ยวข้อง" },
        { title: "ทำเพื่อโรงเรียน เช็กกับครูก่อน", body: "ถ้าต้องใช้ระบบหรือพื้นที่ของโรงเรียน ระหว่างนี้ลองต้นแบบกับเพื่อนกลุ่มเล็กได้" },
        { title: "ร่างข้อความทักไว้เลย", body: "ขอเวลา 10 นาที ถาม 3 ข้อ เรื่องที่เขาเจอจริง" },
      ],
      footnote: "ข้อ 3 รุ่นพี่เจอมาแล้ว: งานที่ทำเพื่อโรงเรียน ถ้าต้องใช้ระบบหรือพื้นที่ของโรงเรียน เช็กกับครูก่อน",
    },
    {
      kind: "points",
      tag: "Step 4 · 2 min",
      title: "1 คน 1 ปัญหา\nใน 1 ประโยค",
      points: [
        { title: "[ใคร] ติดปัญหาเรื่อง [อะไร]", body: "เลือกคนที่ชัดที่สุด 1 คนจากรายชื่อ" },
        { title: "ตอน [สถานการณ์ไหน]", body: "เวลาไหน ที่ไหน กำลังทำอะไรอยู่" },
        { title: "เพราะ [เหตุผล]", body: "ช่องนี้เว้นไว้ เติมหลังจากได้คุยกับเขาจริง" },
        { title: "อ่านออกเสียง 1 รอบ", body: "ถ้าต้องอธิบายเพิ่ม แปลว่ายังกว้างไป ตัดให้แคบลง" },
      ],
      footnote: "เหตุผล ==ต้องมาจากปากเขา== ไม่ใช่จากที่เราเดา",
    },
    {
      kind: "compare",
      tag: "Example",
      title: "ก่อนและหลัง 20 นาที",
      left: {
        label: "ก่อน",
        items: ["อยากทำแอปช่วยเรื่องการเรียน", "สำหรับนักเรียนทุกคน", "ยังไม่ได้ถามใครสักคน", "ไม่รู้จะเริ่มสร้างตรงไหน"],
      },
      right: {
        label: "หลัง",
        items: [
          "เพื่อนในห้อง 6 คนหาชีทสรุปไม่เจอ",
          "ตอนใกล้สอบ ไฟล์จมอยู่ในแชท LINE",
          "ทักได้ 5 คนจากกลุ่ม LINE ห้อง",
          "เพราะ... (ยังไม่รู้ ต้องไปถามก่อน)",
        ],
      },
      footnote: "ตัวอย่างสมมติ ลองเขียนของตัวเองบนกระดาษเลย",
    },
    {
      kind: "cta",
      tag: "Save",
      title: "ลองทำคืนนี้\n20 นาที\nได้ 1 โจทย์",
      icon: "target",
      action: "save",
      body: `ได้โจทย์แล้ว อยากสร้างจริงไหม?\n${COMMENT_SHIFT}`,
    },
  ],
};

export const AI_IN_THAI: StudioSet = {
  ...BASE,
  slug: "guide-ai-in-thai",
  title: "Guide: tell the AI to reply in Thai, plus a 4-part prompt formula",
  angle:
    "A past student gave up on an AI tool because it replied in English; one line fixes it, then the 4-part prompt formula card (who am I, my goal, do and don't, check me) with a filled Thai example and a saved-prompts habit.",
  sources: [
    `${DEBRIEF}: one student gave up on an AI tool that replied in English, then learned later it can reply in Thai`,
    "company-brain/shift.md How students learn prompting: prompt formula card (Who am I / My goal / What the AI should do, and not do / Check me) and the group prompt library",
    "lib/content/shift-cohort.ts SHIFT_SKILL_CARDS AI Tools (no coding background needed)",
    "Filled example is invented and labelled as an example",
    COHORT_SOURCE,
  ],
  caption: [
    "เคยเลิกใช้ AI เพราะมันรัวภาษาอังกฤษใส่ไหม? รุ่นพี่คนหนึ่งเคยเลิกไปแล้ว เพิ่งมารู้ทีหลังว่าแค่สั่งให้ตอบเป็นไทย มันก็ตอบเป็นไทย",
    "",
    "แชท AI ส่วนใหญ่สั่งเป็นภาษาไทยได้เลย ถ้ามันตอบอังกฤษ พิมพ์บอกให้ตอบเป็นภาษาไทยทั้งหมด",
    "",
    "แล้วใช้สูตร prompt 4 ช่องที่เราให้นักเรียนใช้ทุกครั้งที่สั่ง AI",
    "เราคือใคร / เป้าหมายของเรา / ให้ AI ทำอะไร และห้ามทำอะไร / ช่วยเช็กหน่อยว่าคิดพลาดตรงไหน",
    "",
    "สไลด์ 4 มีตัวอย่างที่เติมแล้ว ก๊อปไปเปลี่ยนเป็นเรื่องของตัวเองได้",
    "prompt ไหนได้ผล เก็บไว้พร้อมโน้ต 1 บรรทัดว่าใช้ตอนไหน ไม่นานจะมีคลัง prompt ของตัวเอง",
    "",
    shiftLine("อยากลองใช้ AI กับโปรเจกต์จริงไหม"),
  ].join("\n"),
  hashtags: ["PassionSeed", "AI", "prompt", "พอร์ตTCAS", "ทำโปรเจกต์"],
  slides: [
    {
      kind: "cover",
      kicker: "AI in Thai",
      icon: "chat",
      title: ["AI ตอบเป็น", "ภาษาอังกฤษ", "จน**เลิกใช้**?"],
      note: "แก้ได้ใน 1 บรรทัด",
      sub: "รุ่นพี่คนหนึ่งเคยเลิกใช้ไปแล้ว\nเพิ่งมารู้ทีหลังว่าแค่สั่งให้ตอบเป็นไทยก็ได้\nแถมสูตร prompt 4 ช่องไว้ใช้ต่อ",
    },
    {
      kind: "chat",
      tag: "Fix it in one line",
      title: "พิมพ์บรรทัดนี้ไว้ก่อนเลย",
      lines: [
        { from: "me", text: "ต่อจากนี้ตอบเป็นภาษาไทยทั้งหมด\nศัพท์เทคนิคใส่ภาษาอังกฤษในวงเล็บ" },
        { from: "them", text: "ได้เลย จากนี้จะตอบเป็นภาษาไทย\nและใส่ศัพท์อังกฤษในวงเล็บให้" },
        { from: "me", text: "อธิบายแบบคนที่ไม่เคยเขียนโค้ด\nทีละขั้น ขั้นละไม่เกิน 3 บรรทัด" },
        { from: "them", text: "ได้ เริ่มขั้นที่ 1 กันก่อน\nบอกหน่อยว่าอยากสร้างอะไร ให้ใครใช้" },
      ],
      footnote: "ใส่ไว้ในหน้าตั้งค่าครั้งเดียวก็ได้ เช่น Custom instructions ใน ChatGPT ไม่ต้องพิมพ์ใหม่ทุกแชท",
    },
    {
      kind: "points",
      tag: "Prompt formula",
      title: "สูตร prompt 4 ช่อง",
      numbered: true,
      points: [
        { title: "เราคือใคร", body: "AI ต้องรู้อะไรเกี่ยวกับเรา และสถานการณ์ตอนนี้" },
        { title: "เป้าหมายของเรา", body: "จริงๆ แล้วเราอยากได้อะไร ไม่ใช่แค่สิ่งที่สั่ง" },
        { title: "ให้ AI ทำอะไร และห้ามทำอะไร", body: "ขอบเขตชัด AI ก็ไม่ต้องเดาเอง" },
        { title: "==ช่วยเช็กหน่อย==", body: "ให้ AI ชี้ว่าเราอาจคิดพลาดตรงไหน ก่อนลงมือ" },
      ],
      footnote: "ใช้ได้กับแชท AI ส่วนใหญ่ พิมพ์เป็นภาษาไทยได้ทั้ง 4 ช่อง",
    },
    {
      kind: "chat",
      tag: "Filled example",
      title: "ตัวอย่างที่เติมแล้ว",
      lines: [
        { from: "me", text: "เราคือ: นักเรียน ม.5 ไม่เคยเขียนโค้ด\nกำลังทำเว็บให้เพื่อนในห้องเช็กวันส่งงาน" },
        { from: "me", text: "เป้าหมาย: ต้นแบบที่เพื่อน 5 คน\nลองกดใช้ได้ภายในวันเสาร์นี้" },
        { from: "me", text: "ให้ทำ: บอกทีละขั้น รอเราลองก่อนไปขั้นต่อไป\nห้ามเพิ่มฟีเจอร์ที่เราไม่ได้ขอ" },
        { from: "me", text: "ช่วยเช็กหน่อย: แผนนี้อาจพังตรงไหน\nและควรถามเพื่อนอะไรก่อนเริ่มสร้าง" },
      ],
      footnote: "เปลี่ยนเป็นเรื่องของเราก่อน แล้วส่งทั้ง 4 ช่องในข้อความเดียว",
    },
    {
      kind: "compare",
      tag: "Same ask, two ways",
      title: "สั่งสั้นๆ กับสั่งด้วยสูตร",
      left: {
        label: "สั่งสั้นๆ",
        items: ["AI เดาเองว่าเราเป็นใคร", "ได้โค้ดยาวทั้งก้อน อ่านไม่ออก", "ไม่รู้ว่าแผนเราพลาดตรงไหน"],
      },
      right: {
        label: "สั่งด้วยสูตร 4 ช่อง",
        items: ["AI รู้ว่าเราเริ่มจากศูนย์", "บอกให้ตอบทีละขั้น แล้วลองเช็กทีละขั้น", "ได้มุมเสี่ยงมาช่วยตรวจ ก่อนลงมือสร้าง"],
      },
      footnote: "ลองเองคืนนี้: ถามเรื่องเดียวกัน 2 แบบ ในแชทใหม่ 2 อัน แล้วเทียบคำตอบ",
    },
    {
      kind: "points",
      tag: "Prompt library",
      title: "เก็บ prompt ที่ได้ผลไว้",
      points: [
        { title: "ได้ผลเมื่อไหร่ ก๊อปเก็บทันที", body: "โน้ตในมือถือ หรือแชท LINE กับตัวเองก็ได้" },
        { title: "เขียนกำกับ 1 บรรทัด", body: "ใช้ตอนไหน เช่น ตอนติดบั๊ก ตอนเตรียมคำถามสัมภาษณ์" },
        { title: "ไม่ได้ผล เช็กทั้งโจทย์และคำตอบ", body: "ให้ AI ถามกลับ แล้วลองคำแนะนำจริง" },
        { title: "แชร์คลังกับเพื่อนในทีม", body: "prompt ที่เวิร์กของคนหนึ่ง ช่วยได้ทั้งทีม" },
      ],
      footnote: "รหัสผ่าน เลขบัตรประชาชน เบอร์โทร อย่าใส่ใน prompt ไหนเลย",
    },
    {
      kind: "cta",
      tag: "Save",
      title: "เก็บ 4 ช่องนี้\nไว้ใช้ทุกครั้ง\nที่เปิดแชท AI",
      icon: "sparkle",
      action: "save",
      body: `อยากลองใช้ AI กับโปรเจกต์จริงไหม?\n${COMMENT_SHIFT}`,
    },
  ],
};

export const SHIFT3_GUIDE_SETS: StudioSet[] = [INTERVIEW_STORY, PICK_A_PROBLEM, AI_IN_THAI];
