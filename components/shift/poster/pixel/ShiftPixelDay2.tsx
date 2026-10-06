import type { ReactNode } from "react";

import {
  Croc,
  MENTOR,
  MENTOR_PALETTE,
  PixelSvg,
  Plate,
  TAIL,
  TopicFrame,
  notch,
} from "./ShiftPixelDiscordGuide";
import { PIXEL_FONT, PixelIcon, Rects } from "./PixelRects";
import { CELL, PX, sprite } from "./pixelKit";

/**
 * SHIFT[1] day 2 resources: build the first prototype, starting from what
 * day 1's Mission turned up. One 1200x600 frame per step, shown in Park or
 * posted in #shift-chat. Prompts are also posted as text so students can copy.
 */

export const INSTALL_PROMPT =
  "I'm a high school student on [Windows/Mac]. I've never used a terminal. Help me install OpenCode, then gstack for OpenCode (https://github.com/garrytan/gstack). Give me one step at a time, and wait for me to tell you what I see before the next step.";

export const MONO = { fontFamily: "ui-monospace, Menlo, monospace" };

/** Numbered cards; `compact` puts the number beside the title so two rows fit. */
export function Steps({ items, cols = 3, compact }: { items: [string, string][]; cols?: number; compact?: boolean }) {
  return (
    <ul className="grid h-full gap-[20px]" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {items.map(([title, body], i) => (
        <li
          key={title}
          className="flex flex-col px-[24px] pb-[20px] pt-[20px]"
          style={{ backgroundColor: PX.near, clipPath: notch(CELL) }}
        >
          <span className={compact ? "flex items-center gap-[14px]" : "flex flex-col gap-[14px]"}>
            <Plate label={String(i + 1)} size={40} />
            <span className="font-kodchasan text-[29px] font-bold leading-[1.2]" style={{ color: PX.cream }}>
              {title}
            </span>
          </span>
          {body && (
            <span className="mt-[8px] text-[22px] leading-[1.4]" style={{ color: `${PX.cream}cc` }}>
              {body}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

/** The mentor's face with a speech bubble: the cards talk like a person, not a syllabus. */
export function MentorSays({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-end gap-[18px]">
      <span className="shrink-0 p-[8px]" style={{ backgroundColor: PX.near, clipPath: notch(CELL / 2) }}>
        <PixelIcon grid={MENTOR} palette={MENTOR_PALETTE} scale={6} />
      </span>
      <div className="relative mb-[22px]">
        <div
          className="px-[24px] py-[12px] font-kodchasan text-[26px] font-bold leading-[1.35]"
          style={{ backgroundColor: PX.cream, color: PX.ink, clipPath: notch(CELL) }}
        >
          {children}
        </div>
        <PixelSvg w={TAIL[0].length} h={TAIL.length} scale={CELL} className="absolute left-[18px] top-full">
          <Rects rects={sprite(TAIL, { X: PX.cream }, 0, 0)} />
        </PixelSvg>
      </div>
    </div>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return (
    <p className="font-kodchasan text-[26px] font-semibold leading-[1.3]" style={{ color: PX.accentLight }}>
      {children}
    </p>
  );
}

function Today() {
  return (
    <Steps
      compact
      items={[
        ["เช็ก Mission", "เมื่อวานทำได้แค่ไหน ติดอะไร"],
        ["ทักคนจริง", "ใครยังไม่ได้คุย ทัก 3 คนตอนนี้เลย"],
        ["ติดตั้งเครื่องมือ", "OpenCode + gstack ทำระหว่างรอเขาตอบ"],
        ["เขียนปัญหา", "ใคร · อะไร · ตอนไหน · เพราะอะไร"],
        ["/office-hours", "ให้ AI ถามคำถามยาก ๆ ก่อนสร้าง"],
        ["สร้าง MVP", "ใน AI Studio แล้วโชว์ให้ทุกคนดู 30 วิ"],
      ]}
    />
  );
}

function CheckIn() {
  const qs = ["เมื่อวานทำ Mission ได้แค่ไหน?", "ติดอะไร?", "จะผ่านมันยังไง?"];
  return (
    <div className="flex h-full flex-col justify-between">
      <ul className="flex flex-col gap-[12px]">
        {qs.map((q, i) => (
          <li key={q} className="flex items-center gap-[20px]">
            <Plate label={String(i + 1)} size={48} />
            <span className="font-kodchasan text-[40px] font-bold leading-[1.2]" style={{ color: PX.cream }}>
              {q}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex items-end justify-between gap-[24px]">
        <MentorSays>ยังไม่ได้ทำ = ปกติ ไม่มีใครดุ 😄 วันนี้ทำด้วยกัน</MentorSays>
        <span className="shrink-0">
          <Croc scale={6} />
        </span>
      </div>
      <Note>คุยในกลุ่ม 10 นาที แล้วเล่าให้ทั้งห้องฟัง กลุ่มละ 1 เรื่อง</Note>
    </div>
  );
}

function Install() {
  return (
    <div className="flex h-full flex-col">
      <MentorSays>แค่พิมพ์ prompt นี้ไปเลย จะย่อเอง หรือ search เองก็ได้นะ 😎</MentorSays>
      <div
        className="mt-[6px] flex-1 px-[28px] py-[18px] text-[22px] leading-[1.45]"
        style={{ ...MONO, backgroundColor: PX.near, color: PX.cream, clipPath: notch(CELL) }}
      >
        {INSTALL_PROMPT}
      </div>
      <p className="mt-[10px] text-[22px]" style={{ color: `${PX.cream}b3` }}>
        ต้องใช้คอม (มือถือไม่ได้) · ก๊อปข้อความได้ใน #shift-chat · เสร็จก่อน ช่วยเพื่อนด้วย
      </p>
    </div>
  );
}

function ProblemStatement() {
  const slot = (label: string) => (
    <span
      className="mx-[6px] inline-block px-[14px] font-kodchasan font-bold"
      style={{ backgroundColor: PX.accentLight, color: PX.ink }}
    >
      {label}
    </span>
  );
  return (
    <div className="flex h-full flex-col justify-between">
      <p className="text-[40px] leading-[1.6]" style={{ color: PX.cream }}>
        {slot("ใคร")} เจอปัญหา {slot("อะไร")} ตอน {slot("สถานการณ์")} เพราะ {slot("ทำไม")}
      </p>
      <div className="px-[24px] py-[16px]" style={{ backgroundColor: PX.near, clipPath: notch(CELL) }}>
        <p className="text-[18px] tracking-[0.08em]" style={{ ...PIXEL_FONT, color: PX.waterLight }}>
          EXAMPLE
        </p>
        <p className="mt-[6px] font-kodchasan text-[26px] font-semibold leading-[1.35]" style={{ color: PX.cream }}>
          คนเล่น Roblox เจอปัญหาหาเพื่อนเล่นด้วยไม่ได้ ตอนดึก เพราะเพื่อนนอนหมดแล้ว (เดา)
        </p>
      </div>
      <MentorSays>ไม่แน่ใจ? ลอง search “problem statement” ดูตัวอย่างเองเลย 🔍</MentorSays>
    </div>
  );
}

function OfficeHours() {
  return (
    <Steps
      cols={4}
      items={[
        ["ทำอะไร", "ถามคำถามยาก ๆ ว่าไอเดียเราแก้ปัญหาจริงไหม"],
        ["ใช้ตอนไหน", "หลังเขียนปัญหา ก่อนเริ่มสร้าง"],
        ["ให้อะไรมัน", "problem statement + สิ่งที่ได้ยินจากคนจริง"],
        ["จดไว้", "คำถามที่ตอบไม่ได้ = คำถามที่ต้องไปถามผู้ใช้"],
      ]}
    />
  );
}

function Build() {
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="h-[160px]">
        <Steps
          compact
          items={[
            ["1 จอ 1 ฟีเจอร์", "ทำแค่สิ่งที่แก้ปัญหาหลัก"],
            ["ไม่ต้องสวย", "ขอแค่คนอื่นกดใช้ได้จริง"],
            ["บอก AI ให้ชัด", "แปะ problem statement ไปเลย"],
          ]}
        />
      </div>
      <MentorSays>
        เขียนโค้ดเป็น และทำ MVP เสร็จใน 1 วันได้? เขียนเองเลย 💪
        <br />
        ขอแค่มั่นใจว่าทันนะ · วันหลัง ๆ เราใช้ OpenCode สร้างกันด้วย
      </MentorSays>
      <Note>
        <span style={MONO}>aistudio.google.com</span> · ทำเกม? ใช้ Roblox Studio ได้เลย 🎮
      </Note>
    </div>
  );
}

function Mission() {
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="h-[220px]">
        <Steps
          compact
          items={[
            ["เก็บตกเมื่อวาน", "ตอบ 3 ข้อในเธรดตัวเอง + first contact + คุยกับคนจริง"],
            ["ส่ง MVP ให้ 3 คน", "คนในกลุ่มเป้าหมาย แล้วถามคำถามที่ /office-hours ถามแต่เราตอบไม่ได้"],
            ["โพสต์ในเธรด", "สิ่งที่เขาพูด เป็นคำพูดของเขาเอง ใน #progress"],
          ]}
        />
      </div>
      <MentorSays>ติดตรงไหน ทักมาใน #ถามได้ทุกเรื่อง ได้ตลอด พี่ ๆ รออยู่ 🙌</MentorSays>
    </div>
  );
}

const FRAMES: { th: string; en: string; body: () => ReactNode }[] = [
  { th: "Day 2: สร้างของจริง", en: "Today", body: Today },
  { th: "Mission เมื่อวาน ไปถึงไหน?", en: "Check-in", body: CheckIn },
  { th: "ติดตั้ง OpenCode + gstack", en: "Setup", body: Install },
  { th: "เขียนปัญหาให้ชัด", en: "Problem", body: ProblemStatement },
  { th: "/office-hours", en: "Shape it", body: OfficeHours },
  { th: "สร้างใน Google AI Studio", en: "Build", body: Build },
  { th: "Mission ก่อน Day 3", en: "Before Day 3", body: Mission },
];

export const DAY2_FRAME_COUNT = FRAMES.length;

export function ShiftPixelDay2Frame({ n }: { n: number }) {
  const f = FRAMES[n - 1];
  const Body = f.body;
  return (
    <TopicFrame n={n} id="day2" th={f.th} en={f.en} tag={`DAY 2 · ${n}/${FRAMES.length}`}>
      <Body />
    </TopicFrame>
  );
}

export function ShiftPixelDay2() {
  return (
    <div className="flex flex-col items-center gap-10">
      {FRAMES.map((_, i) => (
        <ShiftPixelDay2Frame key={i} n={i + 1} />
      ))}
    </div>
  );
}
