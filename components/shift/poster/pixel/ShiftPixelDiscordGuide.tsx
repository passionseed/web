import type { ReactNode } from "react";

import { SHIFT_COHORT } from "@/lib/content/shift-cohort";

import { PassionSeedMark } from "../riso";
import { PIXEL_FONT, PixelIcon, Rects } from "./PixelRects";
import {
  CHART,
  CREW,
  FLAG,
  ICON_PALETTE,
  QUESTION,
  ROCKET,
  SCREEN,
  SPROUT,
} from "./pixelIcons";
import {
  CELL,
  GULL,
  PX,
  STUDENT,
  STUDENT_PALETTE,
  bands,
  building,
  cloud,
  disc,
  glints,
  mix,
  reflect,
  sprite,
  waveBand,
  type Rect,
} from "./pixelKit";

/**
 * SHIFT[1] Discord guide for #อ่านก่อน: one wide 1200x600 image per topic,
 * so each shows large in Discord instead of one tall strip shown tiny.
 * Mindset, house rules, the week and the channel map, so the camp opens on
 * Discord without a slide deck. Same flooded city as the posters.
 */

export const DISCORD_FRAME_W = 1200;
export const DISCORD_FRAME_H = 600;

const COHORT = SHIFT_COHORT;
const W = DISCORD_FRAME_W / CELL;
const H = DISCORD_FRAME_H / CELL;
/** Top of the footer band on content frames, in grid rows. */
const FOOT = H - 10;

const MINDSET = [
  { icon: SPROUT, title: "ไม่มีเกรด", body: "ไม่มีใครบอกว่าถูกหรือผิด เราลองแล้วหาคำตอบเอง" },
  { icon: CREW, title: "กรรมการตัวจริงคือผู้ใช้จริง", body: "มีคนใช้ = ดี · ไม่มีคนใช้ = ได้เรียนรู้" },
  { icon: QUESTION, title: "พี่ ๆ คือเพื่อนร่วมทีม ไม่ใช่ครู", body: "ถามได้ทุกเรื่อง ทุกเวลา ใน Discord" },
];

const WORDS: [string, string][] = [
  ["การบ้าน", "Mission"],
  ["พรีเซนต์งาน", "เล่าสิ่งที่ค้นพบ"],
  ["คำตอบที่ถูก", "สิ่งที่ผู้ใช้บอก"],
  ["ส่งงานยัง?", "วันนี้ทดสอบอะไรไปบ้าง?"],
];

const SCORE = [
  { icon: CREW, body: "คุยกับคนจริงไปแล้วกี่คน" },
  { icon: ROCKET, body: "มีคนลองใช้ MVP ของเรากี่คน" },
  { icon: CHART, body: "เราเปลี่ยนอะไร เพราะสิ่งที่ผู้ใช้บอก" },
];

/** Mirrors the real SHIFT[1] server, top to bottom. */
const TEXT_CHANNELS: [string, string][] = [
  ["ประกาศ", "พี่ ๆ แจ้งข่าว (อ่านอย่างเดียว)"],
  ["#shift-chat", "คุยกันทั่วไป ทักทายเพื่อน ๆ"],
  ["#progress", "1 คน = 1 โพสต์ อัปเดตทุกวัน"],
  ["#ถามได้ทุกเรื่อง", "ลองถามเพื่อนก่อน พี่ตามมาช่วย"],
  ["#อ่านก่อน", "อ่านอันนี้ก่อน"],
  ["#first-contact", "โพสต์ Mission แรก"],
];

const VOICE_CHANNELS: [string, string][] = [
  ["🌲⛲🌲 Park", "เปิดวัน · ปิดวัน (สั้น ๆ)"],
  ["1 · 2 · 3 · 4", "ห้องกลุ่ม ทำงานกับทีม 3 คน"],
  ["🛋️🪴", "ห้องนั่งเล่น มานั่งทำงานด้วยกัน"],
];

const HOUSE_RULES = [
  "อัปเดตใน #progress ทุกวัน แม้วันที่ไม่มีพี่ ๆ",
  "ช่วยเพื่อนก่อน แล้วค่อยรอพี่",
  "เบลอชื่อและรูปของคนอื่นก่อนโพสต์ทุกครั้ง",
  "เปิดกล้องหรือไม่ก็ได้ เปิดไมค์คุยกันได้เลย",
];

/** Mentor face: the student's build with glasses and a teal shirt. */
const MENTOR = [
  "...HHHHHH...",
  "..HHHHHHHH..",
  ".HHSSSSSSHH.",
  ".HSSSSSSSSH.",
  ".SGGGSSGGGS.",
  ".SGEGGGGEGS.",
  ".SGGGSSGGGS.",
  "..SSSMMSSS..",
  "...SSSSSS...",
  "..TTTTTTTT..",
];
const MENTOR_PALETTE = { H: PX.near, S: PX.skin, G: PX.ink, E: PX.foam, M: PX.accentDark, T: PX.waterLight };

/** The student from the cover boat, head and shoulders, with a smile. */
const STUDENT_FACE = [...STUDENT.slice(0, 6), "...SMMMMS...", ...STUDENT.slice(7, 10)];
const STUDENT_FACE_PALETTE = { ...STUDENT_PALETTE, M: PX.accentDark };

/** Stepped bubble tail, pointing down-left; mirrored for the right side. */
const TAIL = ["XXXX", "XXX.", "XX..", "X..."];

/** Crocodile cruising the flood, facing left with a toothy grin. */
const CROC = [
  "........GGG.......................",
  ".......GEEKG..D.D.D.D.D.D.D.......",
  "...KGGGGGGGGGGGGGGGGGGGGGGGGGG....",
  "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG.",
  "GWGWGWGGDDGGGGGGGGGGGGGGGGGGGGGGGG",
  "W.W.W.GLLLLLLLLLLLLLLLLLLLLGGG....",
  "GGGGGGGLLLLLLLLLLLLLLLLLLLLGG.....",
  ".......DDD....DDD.......DDD...DDD.",
];
const CROC_PALETTE = {
  G: PX.plant,
  D: mix(PX.plant, PX.ink, 0.45),
  L: mix(PX.plant, PX.cream, 0.45),
  E: PX.cream,
  K: PX.ink,
  W: PX.cream,
};

/** Notched corners, the pixel-art way to round a box. */
export const notch = (n: number) =>
  `polygon(0 ${n}px, ${n}px ${n}px, ${n}px 0, calc(100% - ${n}px) 0, calc(100% - ${n}px) ${n}px, 100% ${n}px, 100% calc(100% - ${n}px), calc(100% - ${n}px) calc(100% - ${n}px), calc(100% - ${n}px) 100%, ${n}px 100%, ${n}px calc(100% - ${n}px), 0 calc(100% - ${n}px))`;

export function PixelSvg({ w, h, scale = CELL, className, children }: { w: number; h: number; scale?: number; className?: string; children: ReactNode }) {
  return (
    <svg
      className={className}
      width={w * scale}
      height={h * scale}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** The crocodile wading through the flood, feet under the waterline. */
export function Croc({ scale = 10 }: { scale?: number }) {
  const w = CROC[0].length + 4;
  const feet = CROC.length - 1;
  const water: Rect[] = [
    [0, feet, w, 1, PX.waterLight],
    [0, feet + 1, w, 2, PX.waterDeep],
    [1, feet, 3, 1, PX.foam],
    [w - 5, feet, 4, 1, PX.foam],
  ];
  return (
    <PixelSvg w={w} h={feet + 3} scale={scale}>
      <Rects rects={sprite(CROC, CROC_PALETTE, 2, 0)} />
      <Rects rects={water} />
    </PixelSvg>
  );
}

export function Frame({ n, id = "discord", children }: { n: number; id?: string; children: ReactNode }) {
  return (
    <div
      id={`shift1-${id}-${n}`}
      className="relative shrink-0 overflow-hidden font-bai-jamjuree antialiased"
      style={{ width: DISCORD_FRAME_W, height: DISCORD_FRAME_H, backgroundColor: PX.ink }}
    >
      {children}
    </div>
  );
}

/** Content frame: big two-language title, body, and the deep-water footer. */
export function TopicFrame({
  n,
  th,
  en,
  id,
  tag,
  children,
}: {
  n: number;
  th: string;
  en: string;
  id?: string;
  /** Footer label; defaults to the guide's page count. */
  tag?: string;
  children: ReactNode;
}) {
  return (
    <Frame n={n} id={id}>
      <PixelSvg w={W} h={H} className="absolute inset-0">
        <Rects rects={waveBand(FOOT, PX.waterDeep, 12, W, H)} />
      </PixelSvg>
      <div className="absolute inset-x-[64px] top-[52px] flex items-baseline gap-5">
        <span className="h-[18px] w-[18px] shrink-0 self-center" style={{ backgroundColor: PX.accent }} />
        <h2 className="font-kodchasan text-[52px] font-bold leading-none" style={{ color: PX.cream }}>
          {th}
        </h2>
        <p className="text-[36px] leading-none tracking-[0.06em]" style={{ ...PIXEL_FONT, color: PX.accentLight }}>
          {en}
        </p>
      </div>
      <div className="absolute inset-x-[64px] top-[140px]" style={{ bottom: (H - FOOT) * CELL + 26 }}>
        {children}
      </div>
      <div
        className="absolute inset-x-[64px] bottom-0 flex items-center justify-between"
        style={{ height: (H - FOOT - 3) * CELL }}
      >
        <p className="text-[22px] tracking-[0.1em]" style={{ ...PIXEL_FONT, color: `${PX.cream}b3` }}>
          {COHORT.name} · {tag ?? `${n}/${FRAMES.length}`}
        </p>
        <PassionSeedMark size={24} />
      </div>
    </Frame>
  );
}

export function Plate({ label, size = 48 }: { label: string; size?: number }) {
  return (
    <span
      className="relative z-10 flex shrink-0 items-center justify-center leading-none"
      style={{
        ...PIXEL_FONT,
        width: size,
        height: size,
        fontSize: Math.round(size * 0.57),
        color: PX.ink,
        backgroundColor: PX.accentLight,
        boxShadow: `${CELL / 2}px ${CELL / 2}px 0 ${PX.accentDark}`,
      }}
    >
      {label}
    </span>
  );
}

/** 1. Welcome: the flooded city with the crocodile wading through it. */
function Welcome() {
  const WATER = 74;
  const CROC_X = 128;
  const CROC_S = 2;
  const tops = [52, 58, 48, 60, 54, 50, 58, 46, 56, 60, 52, 58, 50, 56, 54];
  const city: Rect[] = [];
  let x = 0;
  tops.forEach((top, i) => {
    const w = 10 + ((i * 7) % 8);
    city.push(...building(x, top, w, WATER, { body: PX.far }));
    x += w;
  });
  city.push(
    ...building(4, 48, 16, WATER, { body: PX.mid, window: PX.windowDark, lit: 0.25, roof: "tank" }),
    ...building(178, 30, 18, WATER, { body: PX.near, window: PX.windowDark, lit: 0.3, roof: "antenna" }),
  );
  const scene: Rect[] = [
    ...bands(0, W, [
      [0, PX.skyTop],
      [24, PX.sky],
      [56, PX.skyHaze],
      [WATER, PX.skyHaze],
    ]),
    ...disc(160, 50, 9, PX.sun),
    ...cloud(140, 26, [3, 5, 4]),
    ...cloud(20, 18, [3, 4]),
    ...sprite(GULL, { W: PX.mid }, 40, 10),
    ...sprite(GULL, { W: PX.mid }, 48, 15),
    ...city,
    ...bands(0, W, [
      [WATER, PX.waterLight],
      [WATER + 6, PX.water],
      [WATER + 16, PX.waterDeep],
      [H, PX.waterDeep],
    ]),
    ...reflect(city, WATER, 14),
    ...glints(WATER + 1, H, 26, W),
  ];
  const crocTop = WATER - (CROC.length - 1) * CROC_S;
  const crocW = CROC[0].length * CROC_S;
  return (
    <Frame n={1}>
      <PixelSvg w={W} h={H} className="absolute inset-0">
        <Rects rects={scene} />
        <g transform={`translate(${CROC_X} ${crocTop}) scale(${CROC_S})`}>
          <Rects rects={sprite(CROC, CROC_PALETTE, 0, 0)} />
        </g>
        <Rects
          rects={[
            [CROC_X - 3, WATER, crocW + 6, CROC_S, PX.waterLight],
            [CROC_X - 4, WATER, 4, 1, PX.foam],
            [CROC_X + crocW, WATER, 5, 1, PX.foam],
          ]}
        />
      </PixelSvg>
      <div className="absolute left-[64px] top-[64px]">
        <p className="text-[30px] leading-none tracking-[0.08em]" style={{ ...PIXEL_FONT, color: PX.ink }}>
          {COHORT.name} · START HERE
        </p>
        <h1
          className="mt-3 font-kodchasan text-[84px] font-bold leading-[1.1]"
          style={{ color: PX.ink, textShadow: `${CELL}px ${CELL}px 0 ${PX.cloudShade}` }}
        >
          ยินดีต้อนรับสู่ SHIFT
        </h1>
        <p className="mt-2 font-kodchasan text-[40px] font-bold leading-[1.3]" style={{ color: PX.accentDark }}>
          7 วัน ปั้น 1 โปรเจกต์จริง
        </p>
      </div>
      <p
        className="absolute bottom-[34px] left-[64px] font-kodchasan text-[30px] font-semibold"
        style={{ color: PX.cream }}
      >
        อ่าน {FRAMES.length - 1} รูปถัดไปก่อนเริ่มนะ →
      </p>
    </Frame>
  );
}

/** 2. Mindset: three cards side by side. */
function Mindset() {
  return (
    <ul className="grid h-full grid-cols-3 gap-[24px]">
      {MINDSET.map((m) => (
        <li
          key={m.title}
          className="flex flex-col px-[28px] pb-[24px] pt-[26px]"
          style={{ backgroundColor: PX.near, clipPath: notch(CELL) }}
        >
          <span className="flex h-[90px] items-end">
            <PixelIcon grid={m.icon} palette={ICON_PALETTE} scale={6} />
          </span>
          <span className="mt-[18px] font-kodchasan text-[32px] font-bold leading-[1.25]" style={{ color: PX.cream }}>
            {m.title}
          </span>
          <span className="mt-[10px] text-[26px] leading-[1.4]" style={{ color: `${PX.cream}cc` }}>
            {m.body}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** 3. Words: school word struck out, SHIFT word beside it. */
function Words() {
  return (
    <ul className="flex h-full flex-col justify-between">
      {WORDS.map(([school, shift]) => (
        <li
          key={school}
          className="grid grid-cols-[1fr_80px_1.5fr] items-center pb-[10px]"
          style={{ borderBottom: `${CELL / 2}px dashed ${PX.cream}26` }}
        >
          <span className="text-[36px] line-through" style={{ color: `${PX.cream}66` }}>
            {school}
          </span>
          <span className="text-[34px]" style={{ ...PIXEL_FONT, color: PX.accent }}>
            →
          </span>
          <span className="font-kodchasan text-[42px] font-bold leading-[1.2]" style={{ color: PX.accentLight }}>
            {shift}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Bubble({ side, fill, children }: { side: "left" | "right"; fill: string; children: ReactNode }) {
  return (
    <div className="relative mb-[30px]">
      <div
        className="px-[34px] py-[18px] font-kodchasan text-[42px] font-bold leading-[1.25]"
        style={{ backgroundColor: fill, color: PX.ink, clipPath: notch(CELL) }}
      >
        {children}
      </div>
      <PixelSvg
        w={TAIL[0].length}
        h={TAIL.length}
        scale={CELL + 2}
        className={`absolute top-full ${side === "left" ? "left-[22px]" : "right-[22px] -scale-x-100"}`}
      >
        <Rects rects={sprite(TAIL, { X: fill }, 0, 0)} />
      </PixelSvg>
    </div>
  );
}

function Speaker({ face, palette, name }: { face: string[]; palette: Record<string, string>; name: string }) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-[6px]">
      <span className="p-[10px]" style={{ backgroundColor: PX.near, clipPath: notch(CELL / 2) }}>
        <PixelIcon grid={face} palette={palette} scale={8} />
      </span>
      <span className="font-kodchasan text-[22px] font-semibold leading-none" style={{ color: `${PX.cream}b3` }}>
        {name}
      </span>
    </div>
  );
}

/** 4. The one mentor rule, as a two-line exchange between faces. */
function AskRule() {
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="flex items-end gap-[24px]">
        <Speaker face={STUDENT_FACE} palette={STUDENT_FACE_PALETTE} name="น้อง" />
        <Bubble side="left" fill={PX.cream}>
          “แบบนี้ถูกไหมคะ/ครับ?”
        </Bubble>
      </div>
      <div className="flex items-end justify-end gap-[24px]">
        <p
          className="mr-auto self-end pb-[4px] font-kodchasan text-[28px] font-semibold leading-[1.35]"
          style={{ color: `${PX.cream}cc` }}
        >
          คำตอบไม่ได้อยู่ที่พี่
          <br />
          คำตอบอยู่ที่ผู้ใช้
        </p>
        <Bubble side="right" fill={PX.accent}>
          “ลองไปเทสกับผู้ใช้ดูนะ”
        </Bubble>
        <Speaker face={MENTOR} palette={MENTOR_PALETTE} name="พี่" />
      </div>
    </div>
  );
}

/** 5. Scoreboard: three evidence cards. */
function Score() {
  return (
    <div className="flex h-full flex-col">
      <ul className="grid flex-1 grid-cols-3 gap-[24px]">
        {SCORE.map((s) => (
          <li
            key={s.body}
            className="flex flex-col justify-between px-[28px] pb-[24px] pt-[24px]"
            style={{ backgroundColor: PX.near, clipPath: notch(CELL) }}
          >
            <PixelIcon grid={s.icon} palette={ICON_PALETTE} scale={6} />
            <span className="font-kodchasan text-[32px] font-bold leading-[1.3]" style={{ color: PX.cream }}>
              {s.body}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-[16px] text-[24px]" style={{ color: `${PX.cream}a6` }}>
        ไม่ได้วัดจากความสวยของงาน หรือความพอใจของพี่ ๆ
      </p>
    </div>
  );
}

/** 6. The week as a route of buoys on a rope, one column per day. */
function Week() {
  const days = COHORT.schedule;
  return (
    <div className="relative grid h-full grid-cols-7 pt-[24px]">
      <div
        className="absolute top-[46px] h-[6px]"
        style={{
          left: `${100 / 14}%`,
          right: `${100 / 14}%`,
          backgroundImage: `repeating-linear-gradient(90deg, ${PX.water} 0 14px, transparent 14px 22px)`,
        }}
      />
      {days.map((d) => (
        <div key={d.day} className="relative flex flex-col items-center px-[8px] text-center">
          <Plate label={String(d.day)} />
          {d.day === days.length && (
            <PixelIcon className="absolute -top-[30px] left-1/2 ml-[18px]" grid={FLAG} palette={ICON_PALETTE} scale={6} />
          )}
          <p className="mt-[20px] text-[20px] leading-[1.15] tracking-[0.02em]" style={{ ...PIXEL_FONT, color: PX.accentLight }}>
            {d.label}
          </p>
          <p className="mt-[12px] font-kodchasan text-[27px] font-semibold leading-[1.35]" style={{ color: PX.cream }}>
            {d.title}
          </p>
        </div>
      ))}
    </div>
  );
}

function ChannelList({ icon, title, rows }: { icon: string[]; title: string; rows: [string, string][] }) {
  return (
    <div className="h-full px-[26px] py-[22px]" style={{ backgroundColor: PX.near, clipPath: notch(CELL) }}>
      <div className="flex items-center gap-[12px]">
        <PixelIcon grid={icon} palette={ICON_PALETTE} scale={3} />
        <span className="text-[22px] tracking-[0.1em]" style={{ ...PIXEL_FONT, color: PX.foam }}>
          {title}
        </span>
      </div>
      <ul className="mt-[18px] flex flex-col gap-[20px]">
        {rows.map(([name, use]) => (
          <li key={name}>
            <span className="block font-kodchasan text-[31px] font-bold leading-[1.2]" style={{ color: PX.cream }}>
              {name}
            </span>
            <span className="mt-[2px] block text-[22px] leading-[1.3]" style={{ color: `${PX.cream}b3` }}>
              {use}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 7. Channels: text split in two columns, voice in the third. */
function Channels() {
  return (
    <div className="grid h-full grid-cols-3 gap-[20px]">
      <ChannelList icon={SCREEN} title="TEXT" rows={TEXT_CHANNELS.slice(0, 3)} />
      <ChannelList icon={SCREEN} title="TEXT" rows={TEXT_CHANNELS.slice(3)} />
      <ChannelList icon={CREW} title="VOICE" rows={VOICE_CHANNELS} />
    </div>
  );
}

/** 8. House rules, the crocodile, and the community line to close on. */
function HouseRules() {
  return (
    <div className="flex h-full items-stretch justify-between gap-[32px]">
      <div className="flex flex-col justify-between">
        <ol className="flex flex-col gap-[16px]">
          {HOUSE_RULES.map((rule, i) => (
            <li key={rule} className="flex items-center gap-[20px]">
              <Plate label={String(i + 1)} size={42} />
              <span className="text-[29px] leading-[1.3]" style={{ color: PX.cream }}>
                {rule}
              </span>
            </li>
          ))}
        </ol>
        <p className="font-kodchasan text-[30px] font-bold" style={{ color: PX.accentLight }}>
          ค่ายจบ แต่ Discord นี้ไม่ปิด — ที่นี่คือคอมมูนิตี้ของเรา
        </p>
      </div>
      <span className="shrink-0 self-start pt-[10px]">
        <Croc scale={7} />
      </span>
    </div>
  );
}

const FRAMES: { th: string; en: string; body: () => ReactNode }[] = [
  { th: "", en: "", body: () => null },
  { th: "SHIFT ไม่ใช่ห้องเรียน", en: "Mindset", body: Mindset },
  { th: "เปลี่ยนคำ เปลี่ยนวิธีคิด", en: "Words we use", body: Words },
  { th: "กติกาของพี่ ๆ ตลอด 7 วัน", en: "Ask users", body: AskRule },
  { th: "คะแนน = หลักฐานจากโลกจริง", en: "Scoreboard", body: Score },
  { th: "7 วันของเรา", en: "The week", body: Week },
  { th: "แผนที่ Discord", en: "Channels", body: Channels },
  { th: "กติกาบ้านเรา", en: "House rules", body: HouseRules },
];

export const DISCORD_FRAME_COUNT = FRAMES.length;

/** One frame by number (1-based), for exporting a single image. */
export function ShiftPixelDiscordFrame({ n }: { n: number }) {
  if (n === 1) return <Welcome />;
  const f = FRAMES[n - 1];
  const Body = f.body;
  return (
    <TopicFrame n={n} th={f.th} en={f.en}>
      <Body />
    </TopicFrame>
  );
}

export function ShiftPixelDiscordGuide() {
  return (
    <div className="flex flex-col items-center gap-10">
      {FRAMES.map((_, i) => (
        <ShiftPixelDiscordFrame key={i} n={i + 1} />
      ))}
    </div>
  );
}
