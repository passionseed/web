import type { ReactNode } from "react";

import { MONO, MentorSays, Note, Steps } from "./ShiftPixelDay2";
import { Croc, Plate, TopicFrame, notch } from "./ShiftPixelDiscordGuide";
import { PIXEL_FONT } from "./PixelRects";
import { CELL, PX } from "./pixelKit";

/**
 * SHIFT[1] days 4–7 resources (day 4 also covers the skipped day 3), written as data so every day reads the same
 * way: a schedule frame, then "discuss in the group room, share in Park"
 * frames, then the Mission for tomorrow. The schedule doubles as the mentor
 * run sheet on the plan page.
 */

export type ScheduleRow = [time: string, topic: string, detail: string];

type Spec =
  | { kind: "schedule" }
  | { kind: "questions"; qs: string[]; mentor?: string; note?: string; croc?: boolean }
  | { kind: "steps"; items: [string, string][]; cols?: number; mentor?: string; note?: string }
  | { kind: "prompt"; text: string; mentor?: string; note?: string }
  | { kind: "template"; slots: string[]; example: string; mentor?: string }
  | { kind: "big"; text: string; mentor?: string; note?: string; croc?: boolean };

export interface DayPlan {
  day: number;
  name: string;
  goal: string;
  schedule: ScheduleRow[];
  frames: ({ th: string; en: string; slug: string } & Spec)[];
}

export const DAYS: DayPlan[] = [
  {
    day: 4,
    name: "Test with Real People",
    goal: "ทุกคนได้เทสต์กับคนจริงวันนี้ และแยกออกว่าอะไรคือหลักฐาน (เขาทำ) อะไรแค่ความเห็น (เขาพูด)",
    schedule: [
      ["19:00", "Park", "วันนี้: เทสต์กับคนจริง (Day 3 + 4)"],
      ["19:05", "เช็กอิน", "3 ตัวเลขในเธรด แล้วแยกกลุ่ม A B C"],
      ["19:15", "ติด SeedStack", "1 นาที สำหรับคนที่มี OpenCode"],
      ["19:20", "เขาทำ หรือเขาพูด?", "คุยในกลุ่ม 10 นาที → แชร์ 5 นาที"],
      ["19:35", "ทัก + เทสต์", "ทักตรง 10 คน แล้วเทสต์สดในเวลา"],
      ["20:35", "Daily Show", "คนละ 30 วิ"],
      ["20:55", "Mission ก่อน Day 5", "เทสต์จริงให้ครบ 3 คน"],
    ],
    frames: [
      { slug: "schedule", th: "Day 4: เทสต์กับคนจริง", en: "Test with Real People", kind: "schedule" },
      {
        slug: "check-in",
        th: "เช็กอิน: ตอนนี้อยู่ตรงไหน?",
        en: "Check-in",
        kind: "template",
        slots: ["📨 ทักไปกี่คน", "🧪 เทสต์แล้วกี่คน", "👀 เขาทำอะไรที่เราเซอร์ไพรส์"],
        example: "ทักไป 6 · เทสต์ 2 · เพื่อนพี่หาปุ่มจองไม่เจอ เลื่อนลงไปสุดหน้า 2 รอบ",
        mentor: "เป็น 0 ก็โพสต์ได้ ไม่มีใครตัดสิน 🙂",
      },
      {
        slug: "groups",
        th: "เลือกกลุ่มของเรา",
        en: "Pick your path",
        kind: "steps",
        items: [
          ["A · ยังไม่ได้เทสต์", "คุยเรื่องปัญหา หรือสเก็ตช์ 15 นาที แล้วเทสต์วันนี้เลย"],
          ["B · ได้แต่ \"ดีนะ\"", "เทสต์ใหม่ 2 คน ให้ทำ 1 อย่าง แล้วเงียบ"],
          ["C · เจอจุดติดจริง", "แก้ 1 จุด แล้วเทสต์กับคนใหม่"],
        ],
        mentor: "ไม่ต้องรอให้เสร็จ กระดาษก็เทสต์ได้ ✏️",
        note: "ไม่แน่ใจว่ากลุ่มไหน? พิมพ์ /seedstack ใน OpenCode",
      },
      {
        slug: "seedstack",
        th: "ติด SeedStack 🌱",
        en: "SeedStack",
        kind: "steps",
        cols: 2,
        items: [
          ["ปิด OpenCode ให้สนิท", "Mac: Cmd+Q · Windows: ปิดจาก tray ด้วย"],
          ["วางบรรทัดจาก #shift-chat", "ใน Terminal (Mac) / PowerShell (Windows)"],
          ["พิมพ์ y", "แล้วเปิด OpenCode ใหม่"],
          ["เปิดโฟลเดอร์โปรเจกต์", "แล้วพิมพ์ /seedstack (Codex: $seedstack)"],
        ],
        mentor: "ติดตั้งไม่ผ่าน? แคปจอมาใน #ถามได้ทุกเรื่อง แล้วใช้การ์ดไปก่อน 🙌",
      },
      {
        slug: "did-or-said",
        th: "เขาทำ หรือเขาพูด?",
        en: "Evidence",
        kind: "steps",
        items: [
          ["ทำ 💪", "เขาติดตรงไหน กดอะไร ข้ามอะไร ตอนนี้ใช้อะไรแก้"],
          ["เล่า 📖", "เรื่องที่เกิดขึ้นจริง \"ครั้งที่แล้วผม...\""],
          ["ความเห็น 💭", "\"ดีนะ\" \"สวย\" \"ควรเพิ่ม X\""],
        ],
        mentor: "\"ดีนะ\" 3 ครั้ง ไม่ได้แปลว่ามีคนจะใช้ 😅",
        note: "แยก feedback ที่ได้มาเป็น 3 กอง · ส่วนใหญ่เป็นความเห็น = เทสต์ใหม่ก่อนสร้างเพิ่ม",
      },
      {
        slug: "ask",
        th: "ทักยังไงให้เขาตอบ?",
        en: "Direct asks",
        kind: "steps",
        items: [
          ["ทักตรงทีละคน", "บอกว่าทำไมเลือกเขา ไม่ใช่โพสต์ลอย ๆ"],
          ["ขอเล็ก + บอกเวลา", "\"ขอ 10 นาที คืนนี้ 2 ทุ่มได้ไหม\""],
          ["ทัก 15 ได้ 3–5", "ไม่ตอบ ทักซ้ำ 1 ครั้งพรุ่งนี้"],
        ],
        mentor: "บอกตรง ๆ ว่ายังไม่เสร็จ ติได้เต็มที่ คนจะช่วยมากขึ้น 🙏",
        note: "โพสต์สาธารณะในกลุ่มที่เขาอยู่ = ตัวเสริม ไม่ใช่ตัวหลัก",
      },
      {
        slug: "run-test",
        th: "เทสต์แบบดูเขาทำ",
        en: "Run the test",
        kind: "steps",
        items: [
          ["ให้ทำ 1 อย่าง", "แล้วเงียบ ห้ามอธิบาย ห้ามช่วย"],
          ["จดว่าติดตรงไหน", "หยุดตรงไหน กดผิดตรงไหน \"เอ๊ะ\" ตรงไหน"],
          ["ถามเรื่องจริง", "\"ครั้งล่าสุดที่เจอปัญหานี้ ทำยังไง?\""],
        ],
        mentor: "ห้ามถาม \"จะใช้ไหม / ชอบไหม\" 🙅 รอคนตอบ? สลับเทสต์กับกลุ่มข้าง ๆ",
        note: "เทสต์กับคนที่รู้จัก หรือในกลุ่มสาธารณะ · เจอกันที่สาธารณะ หรือวิดีโอคอล",
      },
      {
        slug: "daily-show",
        th: "Daily Show",
        en: "Show what they did",
        kind: "steps",
        items: [
          ["ตัวเลข", "ทักไปกี่คน → ได้เทสต์กี่คน"],
          ["เขาทำอะไร", "สิ่งที่ผู้ทดสอบทำ แล้วเราเซอร์ไพรส์"],
          ["จะเปลี่ยนอะไร", "1 อย่าง เพราะอะไร"],
        ],
        mentor: "ยังไม่มีใครเทสต์? เล่าว่าทักไปยังไง ก็โชว์ได้ 🎤",
        note: "คนละ 30 วิ · แชร์จอใน Park",
      },
      {
        slug: "mission",
        th: "Mission ก่อน Day 5",
        en: "Before Day 5",
        kind: "steps",
        cols: 2,
        items: [
          ["เทสต์จริงครบ 3 คน", "นับที่ทำไปแล้วด้วย ไม่ใช่เพื่อนสนิท"],
          ["จดในเธรด", "ทำ · เล่า · ความเห็น (หรือ /seedstack-test)"],
          ["หาสิ่งที่เกิดซ้ำ", "อะไรเกิดกับ 2 คนขึ้นไป"],
          ["ภารกิจลับ 🤫", "SHIFT ออกแบบจากทฤษฎี SDT ลองหาอ่านเองว่าคืออะไร"],
        ],
        mentor: "พรุ่งนี้มาเล่า ทั้งสิ่งที่เจอซ้ำ และเรื่อง SDT 🕵️",
      },
    ],
  },
  {
    day: 5,
    name: "Rescope & Go Live",
    goal: "ล็อกโจทย์ใหม่จากผลเทสต์ สร้างสิ่งเดียวที่ต้องเวิร์กใน OpenCode แล้วได้ลิงก์จริงที่คนอื่นเปิดได้",
    schedule: [
      ["19:00", "Park", "วันนี้: ล็อกใหม่ → สร้างใหม่ → ขึ้นลิงก์จริง"],
      ["19:05", "เทสต์บอกอะไร + SDT", "คุยในกลุ่ม 10 นาที → แชร์ 5 นาที"],
      ["19:20", "เชื่อม SeedStack", "/seedstack-update แล้ว /seedstack-connect"],
      ["19:25", "ล็อกสโคปใหม่", "/seedstack-scope จากสิ่งที่เจอซ้ำ"],
      ["19:40", "สร้างทีละขั้น", "/seedstack-build + อีก session"],
      ["20:20", "ขึ้นลิงก์จริง", "/seedstack-live"],
      ["20:40", "Daily Show", "เปิดลิงก์สดบนมือถือ"],
      ["20:55", "Mission ก่อน Day 6", "ส่งลิงก์ให้ 3 คนลอง"],
    ],
    frames: [
      { slug: "schedule", th: "Day 5: ล็อกใหม่ แล้ว Live", en: "Go Live", kind: "schedule" },
      {
        slug: "what-tests-said",
        th: "เทสต์บอกอะไรเรา?",
        en: "Patterns + SDT",
        kind: "questions",
        qs: ["อะไรเกิดกับ 2 คนขึ้นไป?", "ใครไม่เข้าพวก? (ง่ายสำหรับเขา หรือไม่มีปัญหานี้)", "SDT ซ่อนอยู่ตรงไหนใน SHIFT?"],
        mentor: "คนที่ไม่เข้าพวก มักบอกขอบของปัญหาได้ดีที่สุด 🔍",
        note: "คุยในกลุ่ม 10 นาที แล้วแชร์ในห้องรวม",
        croc: true,
      },
      {
        slug: "connect",
        th: "เชื่อม SeedStack 🔗",
        en: "Connect",
        kind: "steps",
        cols: 2,
        items: [
          ["อัปเดตก่อน", "พิมพ์ /seedstack-update แล้วเปิด OpenCode ใหม่"],
          ["พิมพ์ /seedstack-connect", "ในโฟลเดอร์โปรเจกต์"],
          ["เปิดลิงก์ + ล็อกอิน Discord", "บัญชีเดียวกับที่เข้า SHIFT"],
          ["พิมพ์โค้ด 8 ตัว", "จาก OpenCode ของเราเท่านั้น"],
        ],
        mentor: "เชื่อมแล้ว พี่ ๆ เห็นว่าติดตรงไหน เข้าไปช่วยได้ทันที 🙌",
        note: "ไม่อยากเชื่อม? ไม่เป็นไร SeedStack ใช้ได้ครบเหมือนเดิม · อย่าพิมพ์โค้ดที่คนอื่นส่งมา",
      },
      {
        slug: "rescope",
        th: "ล็อกสโคปใหม่",
        en: "Rescope",
        kind: "steps",
        items: [
          ["อ่าน log ทั้งหมดก่อน", "ไม่ใช่แค่คนล่าสุด"],
          ["พิมพ์ /seedstack-scope", "เอาสิ่งที่เจอซ้ำมาตัด"],
          ["จดเหตุผล", "เปลี่ยนอะไร เพราะหลักฐานอะไร"],
        ],
        mentor: "เปลี่ยนทางเพราะหลักฐาน = เก่ง ไม่ใช่พลาด 💪",
        note: "เทสต์ยืนยันโจทย์เดิม? ล็อกเหมือนเดิมได้ แค่จดว่ายืนยันจากอะไร",
      },
      {
        slug: "rebuild",
        th: "สร้างทีละขั้น 🧱",
        en: "Rebuild",
        kind: "steps",
        cols: 2,
        items: [
          ["พิมพ์ /seedstack-build", "ตั้งเป้ารอบนี้ แล้วแบ่งเป็น 3–5 ขั้น"],
          ["เปิดอีก session", "โค้ชอยู่ตรงนี้ AI สร้างในอีกหน้าต่าง"],
          ["ส่งทีละขั้น", "1 ขั้น = 1 prompt แล้วเปิดดูว่าเวิร์ก"],
          ["เวิร์กแล้ว git commit", "จุดเซฟ พังเมื่อไหร่ย้อนกลับได้"],
        ],
        mentor: "สั่งทั้งแอปทีเดียว = พังแล้วไม่รู้ว่าพังตรงไหน 🧩",
        note: "ขั้นแรกเวิร์ก? ขึ้น live เลย แล้วค่อยทำขั้นต่อไป",
      },
      {
        slug: "go-live",
        th: "ขึ้นลิงก์จริง 🚀",
        en: "Go live",
        kind: "steps",
        cols: 2,
        items: [
          ["พิมพ์ /seedstack-live", "พาไป Vercel ทีละขั้น"],
          ["เราติดตั้ง + พิมพ์เอง", "AI เปิดหน้าให้ดู แต่เรารันคำสั่งเอง"],
          ["ได้ลิงก์ .vercel.app", "เปิดบนมือถือตัวเองก่อน"],
          ["ทำใน AI Studio?", "เพื่อนเปิดลิงก์แชร์ได้ = พอ หรือย้ายมา Vercel"],
        ],
        mentor: "ลิงก์ไม่สวยวันนี้ ดีกว่าลิงก์สวยที่ไม่มีวันขึ้น 🙂",
        note: "Supabase ใช้เฉพาะตอนที่เทสต์ต้องเก็บข้อมูลจริง",
      },
      {
        slug: "daily-show",
        th: "Daily Show",
        en: "Show the link",
        kind: "steps",
        items: [
          ["ลิงก์", "เปิดสดบนมือถือ"],
          ["เปลี่ยนอะไร", "1 อย่าง เพราะเทสต์บอกอะไร"],
          ["ต่อไป", "จะส่งให้ใครลอง"],
        ],
        mentor: "ยังไม่ได้ลิงก์? โชว์ว่าติดตรงไหน ก็โชว์ได้ 🎤",
        note: "คนละ 30 วิ · แชร์จอใน Park",
      },
      {
        slug: "mission",
        th: "Mission ก่อน Day 6",
        en: "Before Day 6",
        kind: "steps",
        items: [
          ["ส่งลิงก์ให้ 3 คน", "ทักตรง ให้ทำ 1 อย่าง (/seedstack-test)"],
          ["จดสิ่งที่เห็น", "แยกจากสิ่งที่เราคิด"],
          ["เลือกตัวเลข 1 ตัว", "วัดซ้ำได้ เช่น กี่คนทำจนจบ"],
        ],
        mentor: "พรุ่งนี้วัดผล 📏 ตัวเลขเดียวพอ",
      },
    ],
  },
  {
    day: 6,
    name: "Measure",
    goal: "เลือกตัวเลขเดียวที่วัดซ้ำได้ แล้วเตรียมเดโม",
    schedule: [
      ["19:00", "Park", "วันนี้: ตัวเลขบอกอะไร"],
      ["19:05", "ตัวเลขไหนบอกว่าเวิร์ก?", "คุยในกลุ่ม 10 นาที → แชร์ 10 นาที"],
      ["19:25", "วัด!", "เทสสด ได้ตัวเลขก่อน → หลัง"],
      ["19:50", "ปล่อยสู่โลก", "โพสต์ให้คนคอมเมนต์"],
      ["20:10", "พอร์ต 1 หน้า", "ร่างใน 20 นาที"],
      ["20:30", "ซ้อมเดโม", "ในกลุ่ม คนละ 3 นาที"],
      ["20:50", "Mission ก่อน Day 7", "เตรียมเดโม"],
    ],
    frames: [
      { slug: "schedule", th: "Day 6: ตัวเลขบอกอะไร", en: "Measure", kind: "schedule" },
      {
        slug: "one-number",
        th: "ตัวเลขไหนบอกว่ามันเวิร์ก?",
        en: "One number",
        kind: "questions",
        qs: ["ถ้ามันเวิร์ก อะไรจะเปลี่ยน?", "นับได้ไหม? วัดซ้ำได้ไหม?", "ตอนนี้ตัวเลขเท่าไหร่?"],
        mentor: "ตัวเลขเล็ก ๆ ที่จริง ดีกว่าตัวเลขสวย ๆ ที่มั่ว 📏",
        note: "เช่น กี่คนใช้จนจบ · ติดอยู่กี่วินาที · กี่คนกลับมาใช้ซ้ำ",
      },
      {
        slug: "measure",
        th: "วัด!",
        en: "Before → After",
        kind: "steps",
        items: [
          ["ก่อน", "ตัวเลขจาก log ที่ผ่านมา"],
          ["เทสสด", "ให้กลุ่มอื่นหรือคนแปลกหน้าลองตอนนี้"],
          ["หลัง", "จดตัวเลขใหม่ในเธรด"],
        ],
        mentor: "ตัวเลขไม่ขึ้น? นั่นก็คือผลลัพธ์ เล่าได้เหมือนกัน 🙂",
      },
      {
        slug: "post",
        th: "ปล่อยสู่โลก 🌏",
        en: "Go public",
        kind: "steps",
        items: [
          ["โพสต์ที่ไหนก็ได้", "FB · IG · TikTok · Discord ที่เราอยู่"],
          ["บอกว่าแก้ปัญหาอะไร", "แปะลิงก์ ขอให้ลอง + คอมเมนต์"],
          ["แคปคอมเมนต์", "เก็บไว้ใช้ตอนเดโม"],
        ],
        mentor: "ไม่ต้องรอให้สมบูรณ์ ปล่อยเลย 🚀",
        note: "ไม่อยากโพสต์ในที่ส่วนตัว? ส่งในกลุ่มที่เกี่ยวข้องแทนได้",
      },
      {
        slug: "portfolio",
        th: "พอร์ต 1 หน้า",
        en: "1-Page Portfolio",
        kind: "steps",
        cols: 3,
        items: [
          ["ปัญหา", "ใคร · อะไร · หลักฐาน"],
          ["ผู้ใช้พูดว่า", "คำพูดจริงของเขา"],
          ["พัง → แก้", "จาก log"],
          ["ตัวเลข", "ก่อน → หลัง"],
          ["ลิงก์ของจริง", "ให้คนกดลองได้"],
          ["ได้เรียนรู้อะไร", "1–2 บรรทัด"],
        ],
        note: "Canva · Google Docs · Notion ก็ได้ · ใช้ตอบสัมภาษณ์ TCAS1 ได้",
      },
      {
        slug: "demo-practice",
        th: "ซ้อมเดโม",
        en: "3-minute demo",
        kind: "steps",
        cols: 4,
        items: [
          ["ปัญหา", "ใคร เจออะไร (30 วิ)"],
          ["เดโมสด", "ใช้ให้ดู (1 นาที)"],
          ["พัง → แก้", "+ คำพูดผู้ใช้ (1 นาที)"],
          ["ตัวเลข", "+ ได้เรียนรู้อะไร (30 วิ)"],
        ],
        note: "ซ้อมในกลุ่ม · เพื่อนถามได้คนละ 1 คำถาม",
      },
      {
        slug: "mission",
        th: "Mission ก่อน Day 7",
        en: "Before Day 7",
        kind: "steps",
        items: [
          ["พอร์ต 1 หน้า", "ทำให้เสร็จ โพสต์ในเธรด"],
          ["ซ้อมเดโม", "จับเวลา 3 นาที"],
          ["เตรียมของ", "ลิงก์ · แคปคอมเมนต์ · ตัวเลข"],
        ],
        mentor: "พรุ่งนี้ Demo Day! ไม่ต้องเพอร์เฟกต์ เล่าของจริงพอ 🎤",
      },
    ],
  },
  {
    day: 7,
    name: "Demo Day",
    goal: "เดโมของจริงต่อหน้าทั้งรุ่น เล่าจุดพัง สิ่งที่เปลี่ยน และสิ่งที่ได้เรียนรู้",
    schedule: [
      ["19:00", "Park", "Demo Day 🎉"],
      ["19:05", "เดโม", "คนละ 3 นาที + 1 คำถาม"],
      ["19:55", "เฉลยรูป ice break", "รูปใต้ชื่อเรา หมายถึงอะไร?"],
      ["20:10", "เราเปลี่ยนไปยังไง?", "คุยในกลุ่ม 10 นาที → แชร์ 10 นาที"],
      ["20:30", "คำถามสั้น ๆ", "ตอบในฟอร์ม"],
      ["20:40", "ต่อจากนี้", "Discord ไม่ปิด · คุย 1:1 · project club"],
      ["20:55", "ปิดค่าย 📸", "แคปจอรูปหมู่"],
    ],
    frames: [
      { slug: "schedule", th: "Day 7: Demo Day 🎉", en: "Demo Day", kind: "schedule" },
      {
        slug: "demo",
        th: "เดโม 3 นาที",
        en: "Demo",
        kind: "steps",
        cols: 4,
        items: [
          ["ปัญหา", "ใคร เจออะไร"],
          ["เดโมสด", "ใช้ให้ดู"],
          ["พัง → แก้", "+ คำพูดผู้ใช้"],
          ["ตัวเลข", "+ ได้เรียนรู้อะไร"],
        ],
        mentor: "คนดูถามได้คนละ 1 คำถาม 🙋",
        note: "คนละ 3 นาที · แชร์จอใน Park",
      },
      {
        slug: "ice-break-reveal",
        th: "เฉลยรูป ice break",
        en: "Remember Day 1?",
        kind: "big",
        text: "รูปที่เพื่อนแปะใต้ชื่อเรา\nหมายถึงอะไร? 🖼️",
        mentor: "จำได้ไหม Day 1 พี่บอกว่าจะถาม 😆",
        croc: true,
      },
      {
        slug: "reflection",
        th: "เราเปลี่ยนไปยังไง?",
        en: "Look back",
        kind: "questions",
        qs: ["Day 1 ทำไม่ได้ แต่ตอนนี้ทำได้?", "ตอนไหนที่เราตัดสินใจเอง?", "ใครช่วยเราที่สุด?"],
        note: "คุยในกลุ่ม 10 นาที แล้วแชร์ในห้องรวม",
      },
      {
        slug: "quick-questions",
        th: "คำถามสั้น ๆ",
        en: "2 minutes",
        kind: "steps",
        cols: 2,
        items: [
          ["พอใจแค่ไหน?", "กับสิ่งที่ทำได้ใน 7 วัน"],
          ["เป็นของเราแค่ไหน?", "โปรเจกต์นี้ (1–5)"],
          ["มั่นใจแค่ไหน?", "ที่จะเริ่มโปรเจกต์ใหม่เอง โดยไม่มีพี่ (1–5)"],
          ["ทำไมทำต่อจนจบ?", "เลือกคำตอบที่ใช่ที่สุด"],
        ],
        note: "ตอบในฟอร์ม · ไม่มีถูกผิด ตอบตามจริง",
      },
      {
        slug: "whats-next",
        th: "ต่อจากนี้",
        en: "What's next",
        kind: "steps",
        items: [
          ["Discord นี้ไม่ปิด", "ที่นี่คือคอมมูนิตี้ของเรา"],
          ["คุย 1:1 กับพี่", "เรื่องโปรเจกต์และทางต่อไป"],
          ["Project club", "ทำโปรเจกต์ต่อ หรือเริ่มใหม่"],
        ],
        mentor: "ขอบคุณที่มาลุยด้วยกันนะ 🙏",
      },
    ],
  },
];

/** Schedule table in pixel style, shared with the plan page's run sheet. */
export function ScheduleFrameBody({ rows }: { rows: ScheduleRow[] }) {
  return (
    <ul className="flex h-full flex-col justify-between">
      {rows.map(([time, title, body]) => (
        <li key={time} className="grid grid-cols-[110px_330px_1fr] items-center">
          <span className="text-[24px]" style={{ ...PIXEL_FONT, color: PX.accentLight }}>
            {time}
          </span>
          <span className="font-kodchasan text-[28px] font-bold" style={{ color: PX.cream }}>
            {title}
          </span>
          <span className="text-[22px]" style={{ color: `${PX.cream}b3` }}>
            {body}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Questions({ qs }: { qs: string[] }) {
  return (
    <ul className="flex flex-col gap-[12px]">
      {qs.map((q, i) => (
        <li key={q} className="flex items-center gap-[20px]">
          <Plate label={String(i + 1)} size={46} />
          <span className="font-kodchasan text-[38px] font-bold leading-[1.2]" style={{ color: PX.cream }}>
            {q}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Mentor bubble on the left, crocodile on the right when asked for. */
function Footer({ mentor, croc }: { mentor?: string; croc?: boolean }) {
  if (!mentor && !croc) return null;
  return (
    <div className="flex items-end justify-between gap-[24px]">
      {mentor ? <MentorSays>{mentor}</MentorSays> : <span />}
      {croc && (
        <span className="shrink-0">
          <Croc scale={6} />
        </span>
      )}
    </div>
  );
}

function Body({ plan, spec }: { plan: DayPlan; spec: Spec }) {
  switch (spec.kind) {
    case "schedule":
      return <ScheduleFrameBody rows={plan.schedule} />;
    case "questions":
      return (
        <div className="flex h-full flex-col justify-between">
          <Questions qs={spec.qs} />
          <Footer mentor={spec.mentor} croc={spec.croc} />
          {spec.note && <Note>{spec.note}</Note>}
        </div>
      );
    case "steps": {
      const rows = Math.ceil(spec.items.length / (spec.cols ?? 3));
      return (
        <div className="flex h-full flex-col justify-between">
          <div style={{ height: rows > 1 ? 280 : 170 }}>
            <Steps compact cols={spec.cols} items={spec.items} />
          </div>
          <Footer mentor={spec.mentor} />
          {spec.note && <Note>{spec.note}</Note>}
        </div>
      );
    }
    case "prompt":
      return (
        <div className="flex h-full flex-col">
          {spec.mentor && <MentorSays>{spec.mentor}</MentorSays>}
          <div
            className="mt-[6px] flex-1 whitespace-pre-line px-[28px] py-[16px] text-[21px] leading-[1.45]"
            style={{ ...MONO, backgroundColor: PX.near, color: PX.cream, clipPath: notch(CELL) }}
          >
            {spec.text}
          </div>
          {spec.note && (
            <p className="mt-[10px] text-[22px]" style={{ color: `${PX.cream}b3` }}>
              {spec.note} · ก๊อปได้ใน #shift-chat
            </p>
          )}
        </div>
      );
    case "template":
      return (
        <div className="flex h-full flex-col justify-between">
          <p className="flex flex-wrap gap-[14px] text-[38px]">
            {spec.slots.map((slot) => (
              <span
                key={slot}
                className="px-[16px] py-[4px] font-kodchasan font-bold"
                style={{ backgroundColor: PX.accentLight, color: PX.ink }}
              >
                {slot}
              </span>
            ))}
          </p>
          <div className="px-[24px] py-[14px]" style={{ backgroundColor: PX.near, clipPath: notch(CELL) }}>
            <p className="text-[18px] tracking-[0.08em]" style={{ ...PIXEL_FONT, color: PX.waterLight }}>
              EXAMPLE
            </p>
            <p className="mt-[6px] font-kodchasan text-[26px] font-semibold leading-[1.35]" style={{ color: PX.cream }}>
              {spec.example}
            </p>
          </div>
          <Footer mentor={spec.mentor} />
        </div>
      );
    case "big":
      return (
        <div className="flex h-full flex-col justify-between">
          <p className="whitespace-pre-line font-kodchasan text-[52px] font-bold leading-[1.25]" style={{ color: PX.cream }}>
            {spec.text}
          </p>
          {spec.note && <Note>{spec.note}</Note>}
          <Footer mentor={spec.mentor} croc={spec.croc} />
        </div>
      );
  }
}

export function ShiftPixelDayFrame({ day, n }: { day: number; n: number }) {
  const plan = DAYS.find((d) => d.day === day);
  const f = plan?.frames[n - 1];
  if (!plan || !f) return null;
  return (
    <TopicFrame
      n={n}
      id={`day${day}`}
      th={f.th}
      en={f.en}
      tag={`DAY ${day} · ${n}/${plan.frames.length}`}
    >
      <Body plan={plan} spec={f} />
    </TopicFrame>
  );
}

export function dayFrameCount(day: number): number {
  return DAYS.find((d) => d.day === day)?.frames.length ?? 0;
}

export function ShiftPixelDayDeck({ day }: { day: number }): ReactNode {
  const plan = DAYS.find((d) => d.day === day);
  if (!plan) return null;
  return (
    <div className="flex flex-col items-center gap-10">
      {plan.frames.map((f, i) => (
        <ShiftPixelDayFrame key={f.slug} day={day} n={i + 1} />
      ))}
    </div>
  );
}
