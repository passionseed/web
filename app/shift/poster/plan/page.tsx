import type { Metadata } from "next";
import type { ReactNode } from "react";

import { FitFrame } from "@/components/shift/poster/pixel/FitFrame";
import { DAY2_FRAME_COUNT, ShiftPixelDay2Frame } from "@/components/shift/poster/pixel/ShiftPixelDay2";
import { DAY3_FRAME_COUNT, DAY3_SCHEDULE, ShiftPixelDay3Frame } from "@/components/shift/poster/pixel/ShiftPixelDay3";
import { DAYS, ShiftPixelDayFrame, type ScheduleRow } from "@/components/shift/poster/pixel/ShiftPixelDays";
import {
  DISCORD_FRAME_COUNT,
  DISCORD_FRAME_H,
  DISCORD_FRAME_W,
  ShiftPixelDiscordFrame,
} from "@/components/shift/poster/pixel/ShiftPixelDiscordGuide";
import { INTERVIEW_FRAME_COUNT, ShiftPixelInterviewFrame } from "@/components/shift/poster/pixel/ShiftPixelInterviewMission";
import { MISSION_FRAME_COUNT, ShiftPixelMissionFrame } from "@/components/shift/poster/pixel/ShiftPixelSecretMission";
import { SHIFT_COHORT } from "@/lib/content/shift-cohort";

/**
 * SHIFT[1] run plan for mentors: every day's schedule and every card, on one
 * page, scaled to fit any screen. Not indexed; contains no student data.
 */

export const metadata: Metadata = {
  title: `${SHIFT_COHORT.name} Run Plan`,
  robots: { index: false, follow: false },
};

const DAY2_SCHEDULE: ScheduleRow[] = [
  ["19:00", "Park", "วันนี้สร้างของจริง เริ่มจากของเมื่อวาน"],
  ["19:05", "เช็ก Mission เมื่อวาน", "คุยในกลุ่ม 10 นาที → แชร์ 5 นาที"],
  ["19:20", "ทักคนจริง", "ใครยังไม่ได้คุย ทัก 3 คนตอนนี้"],
  ["19:30", "ติดตั้ง OpenCode + gstack", "ทำระหว่างรอเขาตอบ"],
  ["19:50", "เขียนปัญหา", "คุยในกลุ่ม 10 นาที → แชร์ 5 นาที"],
  ["20:05", "/office-hours", "จดคำถามที่ตอบไม่ได้"],
  ["20:20", "สร้างใน AI Studio", "1 จอ 1 ฟีเจอร์"],
  ["20:45", "Daily Show", "คนละ 30 วิ"],
  ["20:55", "Mission ก่อน Day 3", ""],
];

interface Section {
  id: string;
  title: string;
  goal?: string;
  schedule?: ScheduleRow[];
  frames: ReactNode[];
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

const SECTIONS: Section[] = [
  {
    id: "day1",
    title: "Day 1 · Discord guide, ice break, interview Mission",
    goal: "รู้จักกัน เลือกปัญหาจริง และทักคนจริงคนแรก",
    frames: [
      ...range(DISCORD_FRAME_COUNT).map((n) => <ShiftPixelDiscordFrame key={`g${n}`} n={n} />),
      ...range(MISSION_FRAME_COUNT).map((n) => <ShiftPixelMissionFrame key={`m${n}`} n={n} />),
      ...range(INTERVIEW_FRAME_COUNT).map((n) => <ShiftPixelInterviewFrame key={`i${n}`} n={n} />),
    ],
  },
  {
    id: "day2",
    title: "Day 2 · Build the first prototype",
    goal: "เริ่มจาก Mission เมื่อวาน แล้วสร้าง MVP ด้วย /office-hours + AI Studio",
    schedule: DAY2_SCHEDULE,
    frames: range(DAY2_FRAME_COUNT).map((n) => <ShiftPixelDay2Frame key={n} n={n} />),
  },
  {
    id: "day3",
    title: "Day 3 · Build Fast",
    goal: "MVP ที่คนนอกกลุ่มใช้ได้จริง + เปลี่ยนตามคำพูดผู้ใช้",
    schedule: DAY3_SCHEDULE,
    frames: range(DAY3_FRAME_COUNT).map((n) => <ShiftPixelDay3Frame key={n} n={n} />),
  },
  ...DAYS.map((d) => ({
    id: `day${d.day}`,
    title: `Day ${d.day} · ${d.name}`,
    goal: d.goal,
    schedule: d.schedule,
    frames: d.frames.map((f, i) => <ShiftPixelDayFrame key={f.slug} day={d.day} n={i + 1} />),
  })),
];

function Schedule({ rows }: { rows: ScheduleRow[] }) {
  return (
    <table className="w-full text-left text-sm sm:text-base">
      <tbody>
        {rows.map(([time, topic, detail]) => (
          <tr key={time} className="border-b border-white/10 align-top">
            <td className="whitespace-nowrap py-2 pr-4 font-mono text-amber-300">{time}</td>
            <td className="py-2 pr-4 font-semibold">{topic}</td>
            <td className="py-2 text-white/60">{detail}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function Shift1PlanPage() {
  return (
    <div className="min-h-screen bg-neutral-950 font-bai-jamjuree text-white">
      <style>{"nextjs-portal{display:none!important}"}</style>
      <header className="sticky top-0 z-10 border-b border-white/10 bg-neutral-950/90 px-4 py-3 backdrop-blur">
        <h1 className="text-lg font-bold">{SHIFT_COHORT.name} · Run plan</h1>
        <nav className="mt-2 flex flex-wrap gap-2 text-sm">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="rounded bg-white/10 px-2 py-1 hover:bg-white/20">
              {s.id.replace("day", "Day ")}
            </a>
          ))}
        </nav>
      </header>
      <main className="mx-auto flex max-w-[1240px] flex-col gap-16 px-4 py-8">
        {SECTIONS.map((s) => (
          <section key={s.id} id={s.id} className="scroll-mt-28">
            <h2 className="text-2xl font-bold">{s.title}</h2>
            {s.goal && <p className="mt-1 text-white/70">{s.goal}</p>}
            {s.schedule && (
              <div className="mt-4 rounded-lg bg-white/5 p-4">
                <Schedule rows={s.schedule} />
              </div>
            )}
            <div className="mt-6 flex flex-col gap-6">
              {s.frames.map((frame, i) => (
                <FitFrame key={i} width={DISCORD_FRAME_W} height={DISCORD_FRAME_H}>
                  {frame}
                </FitFrame>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
