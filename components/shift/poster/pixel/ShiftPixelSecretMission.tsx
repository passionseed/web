import type { ReactNode } from "react";

import { SHIFT_COHORT } from "@/lib/content/shift-cohort";

import {
  Croc,
  DISCORD_FRAME_H,
  DISCORD_FRAME_W,
  Frame,
  PixelSvg,
  Plate,
  TopicFrame,
  notch,
} from "./ShiftPixelDiscordGuide";
import { PIXEL_FONT, PixelIcon, Rects } from "./PixelRects";
import { CREW, ICON_PALETTE, QUESTION } from "./pixelIcons";
import { CELL, PX, waveBand } from "./pixelKit";

/**
 * SHIFT[1] day 1 ice break game, "Secret Mission". Each student gets one
 * mission card by DM and plays it through three rounds of small-group talk.
 * Every mission is an interview habit in disguise; the reveal frame says so
 * at the end. Frames: how to play, rules, 3 round topics, 8 mission cards,
 * reveal.
 */

const COHORT = SHIFT_COHORT;
const W = DISCORD_FRAME_W / CELL;
const H = DISCORD_FRAME_H / CELL;

/**
 * Each mission and the interview habit it trains, kept secret until the reveal.
 * `\n` sets the card line break, so Thai compounds never split mid-word.
 */
export const MISSIONS: { text: string; skill: string }[] = [
  { text: "ทำให้ใครสักคนเล่า\n“เรื่องที่เกิดขึ้นจริง” ให้ฟัง 1 เรื่อง\nไม่ใช่แค่ความเห็น", skill: "ฟังเรื่องจริง ไม่ใช่ความเห็น" },
  { text: "ถาม “ทำไม” ต่อกันให้ได้ 3 ครั้ง กับคนเดียว", skill: "ขุดให้ลึก" },
  { text: "หาให้ได้ว่าอีกคนหงุดหงิด\nกับอะไรในชีวิตประจำวัน", skill: "หาปัญหาจริง" },
  { text: "พูดน้อยที่สุดในห้อง\nแต่ห้ามให้บทสนทนาเงียบ", skill: "ฟังมากกว่าพูด" },
  { text: "หาสิ่งที่เรากับอีกคนมีเหมือนกัน\nโดยไม่ถามตรง ๆ", skill: "รู้โดยไม่ต้องถามตรง ๆ" },
  { text: "จำรายละเอียดเล็ก ๆ ที่อีกคนพูด\nแล้วหยิบมาถามต่อให้ได้ 3 ครั้ง", skill: "จำแล้วถามต่อ" },
  { text: "ห้ามพูดเรื่องตัวเอง\nจนกว่าจะมีคนถาม", skill: "โฟกัสที่เขา ไม่ใช่เรา" },
  { text: "ทำให้คนในกลุ่มหัวเราะ 1 ครั้ง", skill: "ทำให้เขาสบายใจก่อน" },
];

/** One shared fun topic per rotation, on top of each student's own question. */
export const ROUND_TOPICS = [
  "แอปหรือของที่ใช้ทุกวัน\nแต่หงุดหงิดทุกครั้งที่ใช้",
  "ถ้ามีพลังวิเศษได้ 1 อย่าง\nแต่ใช้ได้แค่กับเรื่องน่าเบื่อในชีวิตประจำวัน\nจะเอาพลังอะไร?",
  "เรื่องที่เคยทำพลาด\nแต่ตอนนี้เล่าแล้วขำ",
];

const ROUND = [
  { label: "1", title: "ทักทาย", time: "1 นาที", body: "ชื่อ · โรงเรียน · สิ่งที่ชอบ 1 อย่าง" },
  { label: "2", title: "ถาม-ตอบ", time: "5–6 นาที", body: "ถามคำถามของเรา + คุยหัวข้อประจำรอบ แล้วแอบทำภารกิจลับไปด้วย" },
  { label: "3", title: "ทาย", time: "1 นาที", body: "ใครมีภารกิจลับอะไร? ทายได้ แต่ยังไม่เฉลย" },
];

const RULES = [
  "ห้ามบอกใครว่าภารกิจของเราคืออะไร",
  "ใช้ภารกิจเดิมทั้ง 3 รอบ ทำให้ได้ก่อนจบ",
  "ไม่มีคะแนน ไม่มีผู้ชนะ สนุกอย่างเดียว",
  "จบ 3 รอบ: แปะรูปใต้ชื่อเพื่อนใน Excalidraw (5 นาที)",
  "แล้วมาเฉลยกันที่ Park",
];

/** Padlock, for the mission cards. */
const LOCK = [
  "...MMMMM...",
  "..MM...MM..",
  "..M.....M..",
  "..M.....M..",
  "LLLLLLLLLLL",
  "LOOOOOOOOOL",
  "LOOOODOOOOL",
  "LOOOODOOOOL",
  "LOOOOOOOOOL",
  "LLLLLLLLLLL",
];

/** 1. How one round runs, as three steps on a rope. */
function HowToPlay() {
  return (
    <div className="flex h-full flex-col">
      <ul className="grid flex-1 grid-cols-3 gap-[24px]">
        {ROUND.map((r) => (
          <li
            key={r.label}
            className="flex flex-col px-[28px] pb-[22px] pt-[24px]"
            style={{ backgroundColor: PX.near, clipPath: notch(CELL) }}
          >
            <div className="flex items-center gap-[16px]">
              <Plate label={r.label} size={44} />
              <span className="text-[24px] tracking-[0.04em]" style={{ ...PIXEL_FONT, color: PX.accentLight }}>
                {r.time}
              </span>
            </div>
            <span className="mt-[18px] font-kodchasan text-[38px] font-bold leading-none" style={{ color: PX.cream }}>
              {r.title}
            </span>
            <span className="mt-[14px] text-[28px] leading-[1.4]" style={{ color: `${PX.cream}cc` }}>
              {r.body}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-[18px] flex items-center gap-[16px]">
        <PixelIcon grid={CREW} palette={ICON_PALETTE} scale={4} />
        <p className="font-kodchasan text-[28px] font-bold" style={{ color: PX.accentLight }}>
          กลุ่มละ 3 คน · รอบละ 8 นาที · 3 รอบ เปลี่ยนกลุ่มทุกรอบ
        </p>
      </div>
    </div>
  );
}

/** 2. House rules for the game, with the crocodile keeping the secret. */
function Rules() {
  return (
    <div className="flex h-full items-start justify-between gap-[32px]">
      <ol className="flex flex-col gap-[16px]">
        {RULES.map((rule, i) => (
          <li key={rule} className="flex items-center gap-[20px]">
            <Plate label={String(i + 1)} size={42} />
            <span className="text-[30px] leading-[1.3]" style={{ color: PX.cream }}>
              {rule}
            </span>
          </li>
        ))}
      </ol>
      <span className="shrink-0 self-end">
        <Croc scale={7} />
      </span>
    </div>
  );
}

/** A mission card: what a student gets in their DM. */
function MissionCard({ n, index }: { n: number; index: number }) {
  const mission = MISSIONS[index];
  return (
    <Frame n={n} id="mission">
      <PixelSvg w={W} h={H} className="absolute inset-0">
        <Rects rects={waveBand(H - 10, PX.waterDeep, 12, W, H)} />
      </PixelSvg>
      {/* Inner border, like the edge of a sealed envelope. */}
      <div
        className="absolute inset-x-[28px] bottom-[84px] top-[28px] flex flex-col justify-between px-[44px] py-[34px]"
        style={{ border: `${CELL}px solid ${PX.accent}` }}
      >
        <div className="flex items-center justify-between">
          <p className="text-[30px] tracking-[0.1em]" style={{ ...PIXEL_FONT, color: PX.accentLight }}>
            SECRET MISSION · {index + 1}/{MISSIONS.length}
          </p>
          <p
            className="-rotate-[8deg] px-[18px] py-[6px] text-[34px] tracking-[0.12em]"
            style={{ ...PIXEL_FONT, color: PX.accent, border: `${CELL / 2}px solid ${PX.accent}` }}
          >
            TOP SECRET
          </p>
        </div>
        <div className="flex items-center gap-[48px]">
          <PixelIcon className="shrink-0" grid={LOCK} palette={ICON_PALETTE} scale={14} />
          <p className="whitespace-pre-line font-kodchasan text-[52px] font-bold leading-[1.3]" style={{ color: PX.cream }}>
            {mission.text}
          </p>
        </div>
        <p className="font-kodchasan text-[28px] font-semibold" style={{ color: `${PX.cream}b3` }}>
          อย่าบอกใครนะ 🤫 ทำให้ได้ภายใน 3 รอบ
        </p>
      </div>
      <p
        className="absolute bottom-[22px] left-[64px] text-[22px] tracking-[0.1em]"
        style={{ ...PIXEL_FONT, color: `${PX.cream}b3` }}
      >
        {COHORT.name} · ICE BREAK
      </p>
    </Frame>
  );
}

/** Round topic: posted in Park as each rotation starts. */
function RoundTopicCard({ n, index }: { n: number; index: number }) {
  return (
    <Frame n={n} id="mission">
      <PixelSvg w={W} h={H} className="absolute inset-0">
        <Rects rects={waveBand(H - 10, PX.waterDeep, 12, W, H)} />
      </PixelSvg>
      <div
        className="absolute inset-x-[28px] bottom-[84px] top-[28px] flex flex-col justify-between px-[44px] py-[34px]"
        style={{ border: `${CELL}px solid ${PX.waterLight}` }}
      >
        <div className="flex items-center justify-between">
          <p className="text-[30px] tracking-[0.1em]" style={{ ...PIXEL_FONT, color: PX.waterLight }}>
            ROUND {index + 1}/{ROUND_TOPICS.length} · หัวข้อประจำรอบ
          </p>
          <PixelIcon grid={CREW} palette={ICON_PALETTE} scale={5} />
        </div>
        <p className="whitespace-pre-line font-kodchasan text-[54px] font-bold leading-[1.3]" style={{ color: PX.cream }}>
          {ROUND_TOPICS[index]}
        </p>
        <p className="font-kodchasan text-[28px] font-semibold" style={{ color: `${PX.cream}b3` }}>
          คุยเรื่องนี้ด้วย นอกจากคำถามของตัวเอง · อย่าลืมภารกิจลับ 🤫
        </p>
      </div>
      <p
        className="absolute bottom-[22px] left-[64px] text-[22px] tracking-[0.1em]"
        style={{ ...PIXEL_FONT, color: `${PX.cream}b3` }}
      >
        {COHORT.name} · ICE BREAK
      </p>
    </Frame>
  );
}

/** Last frame: every mission was an interview habit. */
function Reveal() {
  return (
    <div className="flex h-full flex-col">
      <ul className="grid flex-1 grid-cols-2 gap-x-[40px] gap-y-[12px]">
        {MISSIONS.map((m, i) => (
          <li key={m.skill} className="flex items-center gap-[16px]">
            <Plate label={String(i + 1)} size={36} />
            <span className="font-kodchasan text-[28px] font-bold leading-[1.2]" style={{ color: PX.cream }}>
              {m.skill}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-[12px] flex items-center gap-[16px]">
        <PixelIcon grid={QUESTION} palette={ICON_PALETTE} scale={4} />
        <p className="font-kodchasan text-[28px] font-bold" style={{ color: PX.accentLight }}>
          พรุ่งนี้ ใช้ทุกข้อนี้ตอนคุยกับผู้ใช้จริง
        </p>
      </div>
    </div>
  );
}

type FrameSpec =
  | { kind: "topic"; th: string; en: string; body: () => ReactNode }
  | { kind: "card"; index: number }
  | { kind: "round"; index: number };

const FRAMES: FrameSpec[] = [
  { kind: "topic", th: "ภารกิจลับ เล่นยังไง", en: "Secret Mission", body: HowToPlay },
  { kind: "topic", th: "กติกา", en: "Rules", body: Rules },
  ...ROUND_TOPICS.map((_, index): FrameSpec => ({ kind: "round", index })),
  ...MISSIONS.map((_, index): FrameSpec => ({ kind: "card", index })),
  { kind: "topic", th: "เฉลย: ภารกิจลับคืออะไร", en: "Reveal", body: Reveal },
];

export const MISSION_FRAME_COUNT = FRAMES.length;

/** One frame by number (1-based), for exporting a single image. */
export function ShiftPixelMissionFrame({ n }: { n: number }) {
  const f = FRAMES[n - 1];
  if (f.kind === "card") return <MissionCard n={n} index={f.index} />;
  if (f.kind === "round") return <RoundTopicCard n={n} index={f.index} />;
  const Body = f.body;
  return (
    <TopicFrame n={n} id="mission" th={f.th} en={f.en} tag="ICE BREAK">
      <Body />
    </TopicFrame>
  );
}

export function ShiftPixelSecretMission() {
  return (
    <div className="flex flex-col items-center gap-10">
      {FRAMES.map((_, i) => (
        <ShiftPixelMissionFrame key={i} n={i + 1} />
      ))}
    </div>
  );
}
