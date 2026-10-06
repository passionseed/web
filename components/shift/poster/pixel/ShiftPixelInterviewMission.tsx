import { Plate, TopicFrame, notch } from "./ShiftPixelDiscordGuide";
import { CELL, PX } from "./pixelKit";

/**
 * SHIFT[1] day 1 interview Mission: what to do before day 2, and the example
 * AI prompt students start from. Two 1200x600 frames for #progress.
 * The prompt is also posted as text so students can copy it.
 */

const STEPS = [
  { title: "หาวิธีในกลุ่ม", body: "คุยกับเพื่อนในกลุ่มว่าวิธีไหนเข้าใจลูกค้าได้ดีที่สุด (ใช้ prompt ช่วยได้)" },
  { title: "ไปคุยกับลูกค้าจริง", body: "คนที่เจอปัญหานี้จริง ไม่ใช่แค่เพื่อนที่ใจดีกับเรา" },
  { title: "อัดคลิป แล้วโพสต์", body: "ขออนุญาตก่อนอัดทุกครั้ง แล้วโพสต์ใน #progress ก่อน Day\u00a02" },
];

export const INTERVIEW_PROMPT = `I'm a high school student. I have an idea for a product, and I'm going to talk to 15–20 people who might use it. My goal is NOT to prove my idea is good. My goal is to understand their real life and problems so I can design something better.

Don't give me a list of questions. Instead:
1. Ask me 3 questions about my idea and who I'm talking to.
2. Then show me 2–3 different ways to learn from people, with what each is good and bad at.
3. Point out any question I'm planning to ask that might make people just be nice to me instead of honest.`;

function Mission() {
  return (
    <div className="flex h-full flex-col justify-between">
      <p className="font-kodchasan text-[32px] font-bold leading-[1.3]" style={{ color: PX.accentLight }}>
        เป้าหมาย: เข้าใจชีวิตและปัญหาจริงของเขา ไม่ใช่พิสูจน์ว่าไอเดียเราดี
      </p>
      <ul className="grid grid-cols-3 gap-[24px]">
        {STEPS.map((s, i) => (
          <li
            key={s.title}
            className="flex flex-col px-[26px] pb-[22px] pt-[22px]"
            style={{ backgroundColor: PX.near, clipPath: notch(CELL) }}
          >
            <Plate label={String(i + 1)} size={44} />
            <span className="mt-[16px] font-kodchasan text-[32px] font-bold leading-[1.2]" style={{ color: PX.cream }}>
              {s.title}
            </span>
            <span className="mt-[10px] text-[23px] leading-[1.4]" style={{ color: `${PX.cream}cc` }}>
              {s.body}
            </span>
          </li>
        ))}
      </ul>
      <p className="font-kodchasan text-[26px] font-semibold" style={{ color: `${PX.cream}b3` }}>
        ทำเกม? ผู้ใช้ = ผู้เล่น 🎮 ไปคุยกับคนที่เล่นเกมแบบนั้นจริง ๆ
      </p>
    </div>
  );
}

function Prompt() {
  return (
    <div className="flex h-full flex-col">
      <div
        className="flex-1 whitespace-pre-line px-[30px] py-[22px] text-[20px] leading-[1.4]"
        style={{ backgroundColor: PX.near, color: PX.cream, clipPath: notch(CELL), fontFamily: "ui-monospace, Menlo, monospace" }}
      >
        {INTERVIEW_PROMPT}
      </div>
      <p className="mt-[14px] font-kodchasan text-[24px] font-semibold" style={{ color: PX.accentLight }}>
        ก๊อปข้อความได้ใน #shift-chat · แก้ให้เป็นเรื่องของเราได้เลย
      </p>
    </div>
  );
}

const FRAMES = [
  { th: "Mission: เข้าใจลูกค้า", en: "Before Day 2", body: Mission },
  { th: "ให้ AI ช่วยวางแผน", en: "Prompt", body: Prompt },
];

export const INTERVIEW_FRAME_COUNT = FRAMES.length;

export function ShiftPixelInterviewFrame({ n }: { n: number }) {
  const f = FRAMES[n - 1];
  const Body = f.body;
  return (
    <TopicFrame n={n} id="interview" th={f.th} en={f.en} tag="DAY 1 MISSION">
      <Body />
    </TopicFrame>
  );
}

export function ShiftPixelInterviewMission() {
  return (
    <div className="flex flex-col items-center gap-10">
      {FRAMES.map((_, i) => (
        <ShiftPixelInterviewFrame key={i} n={i + 1} />
      ))}
    </div>
  );
}
