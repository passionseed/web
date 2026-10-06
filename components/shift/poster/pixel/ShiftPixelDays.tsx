import type { ReactNode } from "react";

import { MONO, MentorSays, Note, Steps } from "./ShiftPixelDay2";
import { Croc, Plate, TopicFrame, notch } from "./ShiftPixelDiscordGuide";
import { PIXEL_FONT } from "./PixelRects";
import { CELL, PX } from "./pixelKit";

/**
 * SHIFT[1] days 4–7 resources, written as data so every day reads the same
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
    name: "Ship to Strangers",
    goal: "ส่งของจริงให้คนที่ไม่ใช่เพื่อนสนิทลอง แล้วจดว่าเขาติดตรงไหน",
    schedule: [
      ["19:00", "Park", "วันนี้: ส่งให้คนแปลกหน้า"],
      ["19:05", "ส่งยังไงให้คนตอบ?", "คุยในกลุ่ม 10 นาที → แชร์ 5 นาที"],
      ["19:20", "Ship!", "ส่งลิงก์ให้ 5 คนจากลิสต์"],
      ["19:40", "Level up", "OpenCode หรือ Business Model Canvas ระหว่างรอ"],
      ["20:20", "คนแปลกหน้าพูดอะไร?", "คุยในกลุ่ม 10 นาที → แชร์ 10 นาที"],
      ["20:40", "Daily Show", "คนละ 30 วิ"],
      ["20:55", "Mission ก่อน Day 5", "+ ตอบในเธรด: ตอนไหนที่เราตัดสินใจเอง?"],
    ],
    frames: [
      { slug: "schedule", th: "Day 4: ส่งให้คนแปลกหน้า", en: "Ship to Strangers", kind: "schedule" },
      {
        slug: "reach-out",
        th: "ส่งยังไงให้คนแปลกหน้าตอบ?",
        en: "Reach out",
        kind: "questions",
        qs: ["ข้อความแบบไหนที่เราเองจะกดลอง?", "ขอเวลาเขากี่นาทีถึงไม่เยอะไป?", "ส่งที่ไหนดี? กลุ่ม FB · Discord · IG"],
        mentor: "ลองเขียนข้อความในกลุ่มก่อน แล้วอ่านให้เพื่อนฟัง ✍️",
        note: "คุยในกลุ่ม 10 นาที แล้วแชร์ข้อความที่ดีที่สุดของกลุ่ม",
      },
      {
        slug: "ship",
        th: "Ship it! 🚀",
        en: "Ship",
        kind: "steps",
        items: [
          ["ส่งลิงก์ให้ 5 คน", "จากลิสต์เมื่อวาน ที่ไม่ใช่เพื่อนสนิท"],
          ["แคปหน้าจอ", "โพสต์ใน #first-contact (เบลอชื่อ+รูปเขา)"],
          ["รอ = ทำต่อ", "ระหว่างรอคำตอบ ไปขั้นต่อไปเลย"],
        ],
        mentor: "โดนเมิน = ปกติ ส่งเพิ่มอีกได้ 😅",
      },
      {
        slug: "level-up",
        th: "ทำให้เป็นของจริง",
        en: "Level up",
        kind: "prompt",
        text: `Here is my app. I want anyone with the link to use it, not just me.
Help me put it online step by step,
and wait for me to tell you what I see before the next step.`,
        mentor: "สายธุรกิจ? ลองเขียน Business Model Canvas แทนก็ได้ 📋",
        note: "สายเทค อยากลึก? ลอง Next.js + Supabase + Vercel ใน OpenCode",
      },
      {
        slug: "reactions",
        th: "คนแปลกหน้าพูดว่าอะไร?",
        en: "First reactions",
        kind: "questions",
        qs: ["ใครตอบกลับแล้ว? เขาพูดว่าอะไร?", "เขาติดตรงไหน?", "ต่างจากตอนเพื่อนลองยังไง?"],
        mentor: "ยังไม่มีใครตอบ? เล่าว่าส่งไปยังไง ก็แชร์ได้ 🙂",
        note: "คุยในกลุ่ม 10 นาที แล้วแชร์ในห้องรวม",
      },
      {
        slug: "mission",
        th: "Mission ก่อน Day 5",
        en: "Before Day 5",
        kind: "steps",
        items: [
          ["คนแปลกหน้าลอง 3 คน", "ไม่ใช่เพื่อนสนิท"],
          ["จดทุกจุดที่พัง", "วันที่ · เจออะไร ในเธรดตัวเอง"],
          ["ภารกิจลับ 🤫", "SHIFT ถูกออกแบบจากทฤษฎี SDT ลองหาอ่านเองว่าคืออะไร"],
        ],
        mentor: "พรุ่งนี้มาเล่า ทั้งเรื่องที่พัง และเรื่อง SDT 🕵️",
      },
    ],
  },
  {
    day: 5,
    name: "Fix Check",
    goal: "อะไรพัง และเราแก้ยังไง จดทุกจุดพร้อมวันที่",
    schedule: [
      ["19:00", "Park", "วันนี้: อะไรพัง และเราแก้ยังไง"],
      ["19:05", "พังที่สุดของวัน", "คุยในกลุ่ม 10 นาที → แชร์ + โหวต 💥"],
      ["19:25", "SDT ซ่อนอยู่ตรงไหน?", "คุยในกลุ่ม 10 นาที → แชร์ 10 นาที"],
      ["19:45", "Fix sprint", "แก้ 1–2 จุด แล้วจด log"],
      ["20:35", "Daily Show", "พัง → แก้ → ผลคือ"],
      ["20:50", "Mission ก่อน Day 6", "เลือกตัวเลข 1 ตัว"],
    ],
    frames: [
      { slug: "schedule", th: "Day 5: อะไรพัง แก้ยังไง", en: "Fix Check", kind: "schedule" },
      {
        slug: "fail-of-the-day",
        th: "พังที่สุดของวัน 💥",
        en: "Fail of the day",
        kind: "questions",
        qs: ["อะไรพังที่สุดตั้งแต่ Day 1?", "รู้ได้ยังไงว่ามันพัง?", "แก้แล้ว หรือจะแก้ยังไง?"],
        mentor: "ของที่พัง = หลักฐานที่ลอกกันไม่ได้ ภูมิใจได้เลย 😎",
        note: "แชร์ในห้องรวม แล้วโหวต 💥 ให้เรื่องที่พังได้ฮาที่สุด",
      },
      {
        slug: "sdt",
        th: "SDT ซ่อนอยู่ตรงไหน?",
        en: "Secret Mission",
        kind: "questions",
        qs: ["SDT คืออะไร? อธิบายแบบภาษาเรา", "มันซ่อนอยู่ตรงไหนใน 5 วันที่ผ่านมา?", "อันไหนที่เรารู้สึกว่ายังขาด?"],
        mentor: "ไม่มีถูกผิด เล่าจากที่อ่านมาเลย 📚",
        note: "คุยในกลุ่ม 10 นาที แล้วแชร์ในห้องรวม",
        croc: true,
      },
      {
        slug: "fix-log",
        th: "Fix sprint + log",
        en: "Fix log",
        kind: "template",
        slots: ["📅 วันที่", "💥 เจออะไร", "🛠️ แก้ยังไง"],
        example: "6 ต.ค. · กดปุ่มสมัครแล้วไม่มีอะไรเกิดขึ้น · ย้ายปุ่มขึ้นบนสุด + ขึ้นข้อความว่าสำเร็จ",
        mentor: "แก้ไม่ทัน? จดว่าลองอะไรไปแล้ว ก็นับ ✍️",
      },
      {
        slug: "daily-show",
        th: "Daily Show",
        en: "Break → Fix",
        kind: "steps",
        items: [
          ["พัง", "เจออะไร ใครเจอ"],
          ["แก้", "ทำอะไรไป"],
          ["ผลคือ", "คนลองใหม่แล้วเป็นยังไง"],
        ],
        mentor: "ยังแก้ไม่ได้? เล่าว่าลองอะไรไป ก็โชว์ได้ 🎤",
        note: "คนละ 30 วิ · แชร์จอใน Park",
      },
      {
        slug: "mission",
        th: "Mission ก่อน Day 6",
        en: "Before Day 6",
        kind: "steps",
        items: [
          ["เทสใหม่", "ให้คนที่เคยติด หรือคนใหม่ ลองอีกครั้ง"],
          ["เลือกตัวเลข 1 ตัว", "วัดซ้ำได้ เช่น กี่คนใช้จนจบ"],
          ["จด log ในเธรด", "วันที่ · เจออะไร · แก้ยังไง"],
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
