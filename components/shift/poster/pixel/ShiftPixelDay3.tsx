import type { ReactNode } from "react";

import { MONO, MentorSays, Note, Steps } from "./ShiftPixelDay2";
import { ScheduleFrameBody, type ScheduleRow } from "./ShiftPixelDays";
import { Croc, Plate, TopicFrame, notch } from "./ShiftPixelDiscordGuide";
import { CELL, PX } from "./pixelKit";

/**
 * SHIFT[1] day 3 resources, "Build Fast": hear what users said, watch a
 * stranger try the MVP in a swap test, pick one fix and build it. One
 * 1200x600 frame per step; the schedule frame doubles as the mentor run sheet.
 */

/** Day 3 schedule, 19:00–21:00. Also the source for the mentor guide. */
export const DAY3_SCHEDULE: ScheduleRow[] = [
  ["19:00", "Park", "วันนี้: ทำให้คนนอกใช้ได้จริง"],
  ["19:05", "ผู้ใช้พูดอะไร?", "คุยในกลุ่ม 10 นาที แล้วแชร์ในห้องรวม"],
  ["19:25", "Swap test", "ลอง MVP ของกลุ่มข้าง ๆ ห้ามอธิบาย"],
  ["19:40", "เลือก 1 อย่างที่จะแก้", "คุยในกลุ่ม 5 นาที"],
  ["19:45", "สร้าง", "AI Studio หรือลอง OpenCode ครั้งแรก"],
  ["20:35", "Daily Show", "ก่อน → หลัง คนละ 30 วิ"],
  ["20:50", "Mission ก่อน Day 4", "เตรียมลิงก์ให้คนแปลกหน้า"],
];

export const FIX_PROMPT = `Here is my app. A real user tried it and got stuck at:
[where they got stuck, in their words]

Fix only that one thing. Keep everything else the same.
Then tell me in one sentence what you changed.`;

function Schedule() {
  return <ScheduleFrameBody rows={DAY3_SCHEDULE} />;
}

function BigQuestions({ qs }: { qs: string[] }) {
  return (
    <ul className="flex flex-col gap-[14px]">
      {qs.map((q, i) => (
        <li key={q} className="flex items-center gap-[20px]">
          <Plate label={String(i + 1)} size={48} />
          <span className="font-kodchasan text-[40px] font-bold leading-[1.2]" style={{ color: PX.cream }}>
            {q}
          </span>
        </li>
      ))}
    </ul>
  );
}

function UsersSaid() {
  return (
    <div className="flex h-full flex-col justify-between">
      <BigQuestions qs={["ผู้ใช้พูดอะไร? (คำพูดของเขาเอง)", "อะไรทำให้เราแปลกใจ?", "เราจะเปลี่ยนอะไร?"]} />
      <MentorSays>ยังไม่มีใครลอง? ไม่เป็นไร เดี๋ยวได้ฟีดแบ็กจริงใน Swap test 😉</MentorSays>
      <Note>คุยในกลุ่ม 10 นาที แล้วแชร์ในห้องรวม คนละ 1 คำพูด + 1 สิ่งที่จะเปลี่ยน</Note>
    </div>
  );
}

function RoleCard({ title, lines, accent }: { title: string; lines: string[]; accent: string }) {
  return (
    <div className="flex flex-col px-[26px] py-[20px]" style={{ backgroundColor: PX.near, clipPath: notch(CELL) }}>
      <span className="font-kodchasan text-[32px] font-bold" style={{ color: accent }}>
        {title}
      </span>
      <ul className="mt-[10px] flex flex-col gap-[6px]">
        {lines.map((l) => (
          <li key={l} className="text-[24px] leading-[1.35]" style={{ color: PX.cream }}>
            ▪ {l}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SwapTest() {
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="grid grid-cols-2 gap-[20px]">
        <RoleCard
          title="🧪 คนลอง"
          accent={PX.accentLight}
          lines={["กดลิงก์ ลองใช้เองเลย ไม่ต้องถาม", "คิดอะไรอยู่ พูดออกมาดัง ๆ", "งงตรงไหน บอกตรง ๆ ไม่ต้องเกรงใจ"]}
        />
        <RoleCard
          title="🤐 เจ้าของ"
          accent={PX.accent}
          lines={["ห้ามอธิบาย ห้ามช่วย", "นั่งดูเฉย ๆ", "จดว่าเขาติดตรงไหน (คำพูดเขาเอง)"]}
        />
      </div>
      <MentorSays>ถ้าต้องอธิบาย แปลว่าผู้ใช้จริงก็งงเหมือนกัน 😅</MentorSays>
      <Note>สลับกับกลุ่มข้าง ๆ · คนละ 5 นาที แล้วสลับบทบาท</Note>
    </div>
  );
}

function OneFix() {
  return (
    <div className="flex h-full items-stretch justify-between gap-[32px]">
      <div className="flex flex-col justify-between">
        <p className="font-kodchasan text-[52px] font-bold leading-[1.25]" style={{ color: PX.cream }}>
          ถ้าแก้ได้อย่างเดียว
          <br />
          แก้อะไร?
        </p>
        <Note>เลือกจุดที่คนติดบ่อยที่สุด ไม่ใช่ฟีเจอร์ใหม่</Note>
        <MentorSays>ฟีเจอร์ใหม่ไว้ทีหลัง ทำให้ของเดิมใช้ได้ก่อน 🛠️</MentorSays>
      </div>
      <span className="shrink-0 self-end pb-[8px]">
        <Croc scale={7} />
      </span>
    </div>
  );
}

function Build() {
  return (
    <div className="flex h-full flex-col">
      <MentorSays>เพิ่งเคยใช้ OpenCode? ลองเลย พังได้ ไม่เป็นไร 😆 จะอยู่ AI Studio ต่อก็ได้</MentorSays>
      <div
        className="mt-[6px] flex-1 whitespace-pre-line px-[28px] py-[16px] text-[21px] leading-[1.45]"
        style={{ ...MONO, backgroundColor: PX.near, color: PX.cream, clipPath: notch(CELL) }}
      >
        {FIX_PROMPT}
      </div>
      <p className="mt-[10px] text-[22px]" style={{ color: `${PX.cream}b3` }}>
        เอาโค้ดจาก AI Studio มาเปิดใน OpenCode แล้วใช้ prompt นี้ · ก๊อปได้ใน #shift-chat
      </p>
    </div>
  );
}

function DailyShow() {
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="h-[170px]">
        <Steps
          compact
          items={[
            ["ก่อน", "เมื่อวานหน้าตาเป็นยังไง"],
            ["ผู้ใช้พูดว่า…", "คำพูดที่ทำให้เราเปลี่ยน"],
            ["หลัง", "วันนี้แก้อะไรไป"],
          ]}
        />
      </div>
      <MentorSays>ยังไม่เสร็จ? โชว์ได้เลย ไม่มีใครตัดสิน 🎤</MentorSays>
      <Note>คนละ 30 วิ · แชร์จอใน Park</Note>
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
            ["ลิงก์ที่ใช้ได้จริง", "คนนอกกลุ่มกดแล้วใช้ได้ ไม่ต้องอธิบาย"],
            ["ลิสต์ 5 คน", "คนในกลุ่มเป้าหมาย ที่ไม่ใช่เพื่อนสนิท พรุ่งนี้ส่งให้"],
            ["โพสต์ในเธรด", "ลิงก์ + คำพูดผู้ใช้ที่ทำให้เราแก้"],
          ]}
        />
      </div>
      <MentorSays>พรุ่งนี้ Ship to Strangers 🚀 ส่งให้คนที่ไม่รู้จักเราลองจริง</MentorSays>
    </div>
  );
}

const FRAMES: { th: string; en: string; body: () => ReactNode }[] = [
  { th: "Day 3: ทำให้คนนอกใช้ได้", en: "Build Fast", body: Schedule },
  { th: "ผู้ใช้พูดอะไร?", en: "Feedback", body: UsersSaid },
  { th: "Swap test", en: "No explaining", body: SwapTest },
  { th: "เลือก 1 อย่างที่จะแก้", en: "One fix", body: OneFix },
  { th: "ลงมือแก้", en: "Build", body: Build },
  { th: "Daily Show", en: "Before → After", body: DailyShow },
  { th: "Mission ก่อน Day 4", en: "Before Day 4", body: Mission },
];

export const DAY3_FRAME_COUNT = FRAMES.length;

export function ShiftPixelDay3Frame({ n }: { n: number }) {
  const f = FRAMES[n - 1];
  const Body = f.body;
  return (
    <TopicFrame n={n} id="day3" th={f.th} en={f.en} tag={`DAY 3 · ${n}/${FRAMES.length}`}>
      <Body />
    </TopicFrame>
  );
}

export function ShiftPixelDay3() {
  return (
    <div className="flex flex-col items-center gap-10">
      {FRAMES.map((_, i) => (
        <ShiftPixelDay3Frame key={i} n={i + 1} />
      ))}
    </div>
  );
}
