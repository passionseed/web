import { Trirong } from "next/font/google";
import type { ReactNode } from "react";

import { formatThaiDate } from "@/lib/content/shift-cohort";

import { EL, EL_FONT } from "../brand";
import { ELEMENTAL, prizeTotal, thaiDayRange } from "../facts";

/**
 * Elemental Hackathon, Instagram slide 2 (1080x1350): every fact in one
 * place, after the key visual on slide 1. Dark ground, cream type, the
 * key visual's grain, and the five elements as flat stepped pixel shapes
 * (brand.ts: "a few flat, one-colour stepped shapes"). Facts come from
 * ../facts.ts only.
 */

const trirong = Trirong({
  weight: ["200", "300", "400"],
  style: ["normal", "italic"],
  subsets: ["thai", "latin"],
  variable: "--font-trirong",
});

export const W = 1080;
export const H = 1350;
const PAD = 72;
/** Slide 1's picture with no type, so the carousel reads as one piece. */
const PLATE = "/hackathon/poster/elemental/plate-key.png";
/** How much of the dark ground covers the picture (1 hides it). */
const VEIL = 0.8;
const YEAR_TH = Number(ELEMENTAL.startDate.slice(0, 4)) + 543;

/** 9x9 pixel shapes, one per element. */
const SHAPES = {
  earth: [".........", ".........", "....#....", "...###...", "..##.##..", ".#######.", "##.###.##", "#########", "#########"],
  water: ["....#....", "....#....", "...###...", "..#####..", ".#######.", ".##.####.", ".#.#####.", "..#####..", "...###..."],
  air: [".........", "..####...", ".#....#..", "......#..", "######...", ".........", "#######..", ".......#.", "..####..."],
  fire: ["....#....", "...##....", "...###.#.", "..####.#.", ".#######.", ".###.###.", "###...###", "###...###", ".#######."],
  aether: ["#.....#..", "...#.....", ".......##", "..#......", "#....#...", ".........", "...#...#.", ".#.......", "......#.."],
} as const;

/** What each element covers, in the words students use. */
const ELEMENTS: { key: keyof typeof SHAPES; color: string; line: string }[] = [
  { key: "earth", color: EL.toxicRust, line: "ขยะและสารพิษ" },
  { key: "water", color: EL.toxicCyan, line: "น้ำเสีย สารเคมีในน้ำ" },
  { key: "air", color: EL.toxicYellow, line: "ฝุ่น PM2.5 ควันพิษ" },
  { key: "fire", color: EL.flame, line: "อัคคีภัย การเผา" },
  { key: "aether", color: EL.ash, line: "ภัยที่มองไม่เห็น เช่น ข่าวปลอม" },
];

const SLOT_COLOR = { open: EL.ash, workshop: EL.toxicCyan, due: EL.flame } as const;

function Pixels({ rows, color, size }: { rows: readonly string[]; color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 9 9" shapeRendering="crispEdges" aria-hidden="true" style={{ display: "block" }}>
      {rows.flatMap((row, y) => Array.from(row).map((c, x) => (c === "#" ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={color} /> : null)))}
    </svg>
  );
}

/** A section heading: display face, so the Thai reads whole. */
function Head({ children }: { children: ReactNode }) {
  return <p style={{ margin: 0, fontFamily: EL_FONT.display, fontWeight: 400, fontSize: 27, lineHeight: "34px", color: EL.cream }}>{children}</p>;
}

function Tag({ children }: { children: ReactNode }) {
  return <p style={{ margin: 0, fontFamily: EL_FONT.mono, fontSize: 20, color: EL.creamSoft }}>[{children}]</p>;
}

/** One fact: a tag, the big value, one quiet line under it. */
function Fact({ tag, big, below }: { tag: string; big: ReactNode; below: ReactNode }) {
  return (
    <div style={{ borderTop: `1px solid rgba(243,239,230,0.28)`, paddingTop: 16 }}>
      <Tag>{tag}</Tag>
      <p style={{ margin: "6px 0 0", fontFamily: EL_FONT.display, fontWeight: 300, fontSize: 42, lineHeight: "50px" }}>{big}</p>
      <p style={{ margin: "4px 0 0", fontFamily: EL_FONT.display, fontWeight: 300, fontSize: 23, lineHeight: "32px", color: EL.creamSoft }}>{below}</p>
    </div>
  );
}

export function ElementalInfoPoster({ id = "elemental-info" }: { id?: string }) {
  const el = (k: string) => ELEMENTAL.elements.find((e) => e.key === k);
  const days = Array.from(new Set(ELEMENTAL.schedule.map((s) => s.date)));
  return (
    <div
      id={id}
      className={`${trirong.variable} relative overflow-hidden`}
      style={{ width: W, height: H, backgroundColor: EL.char, color: EL.cream, padding: PAD, boxSizing: "border-box", display: "flex", flexDirection: "column" }}
    >
      {/* Slide 1's picture, behind a see-through dark veil so the type stays readable. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={PLATE} alt="" width={W} height={H} className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-0" style={{ backgroundColor: EL.char, opacity: VEIL }} />

      {/* Grain, like the key visual's film. */}
      <svg className="pointer-events-none absolute inset-0" width={W} height={H} aria-hidden="true" style={{ opacity: 0.16, mixBlendMode: "screen" }}>
        <filter id={`${id}-grain`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" />
          <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.4 -0.5" />
        </filter>
        <rect width={W} height={H} filter={`url(#${id}-grain)`} />
      </svg>

      <div className="relative" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: EL_FONT.mono, fontSize: 20, letterSpacing: "0.08em", color: EL.creamSoft }}>
          <span>{ELEMENTAL.series.toUpperCase()} × PASSIONSEED</span>
          <span>{ELEMENTAL.edition.toUpperCase()} HACKATHON</span>
        </div>
        <h1 style={{ margin: "26px 0 0", fontFamily: EL_FONT.display, fontWeight: 200, fontSize: 84, lineHeight: "96px" }}>รายละเอียดการแข่งขัน</h1>
        <p style={{ margin: "6px 0 0", fontFamily: EL_FONT.display, fontWeight: 300, fontSize: 30, lineHeight: "40px", color: EL.creamSoft }}>
          มือใหม่ก็ร่วมได้ ไม่ต้องมีพื้นฐานมาก่อน เราสอนให้ตั้งแต่ต้น
        </p>

        {/* Facts, 3 x 2 */}
        <div style={{ marginTop: 30, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", columnGap: 36, rowGap: 22 }}>
          <Fact tag="วันแข่ง" big={thaiDayRange()} below={`${YEAR_TH} · หยุดยาว ${ELEMENTAL.days} วัน`} />
          <Fact tag="รูปแบบ" big="ออนไลน์" below={`${ELEMENTAL.venueTh.replace("ออนไลน์", "").trim()} อยู่ที่ไหนก็ร่วมได้`} />
          <Fact tag="ทีม" big={`${ELEMENTAL.teamMin}–${ELEMENTAL.teamMax} คน`} below="มาคนเดียวได้ เราหาทีมให้" />
          <Fact tag="ค่าสมัคร" big={`฿${ELEMENTAL.groupPriceBaht} / คน`} below={`มากับเพื่อน · คนเดียว ฿${ELEMENTAL.priceBaht}`} />
          <Fact tag="รางวัลรวม" big={`${prizeTotal()} บาท`} below="ผู้ชนะได้ต่อยอดใน Request for Winners" />
          <Fact tag="ปิดรับสมัคร" big={formatThaiDate(ELEMENTAL.registrationClosesOn, false)} below={ELEMENTAL.url} />
        </div>

        {/* The five elements */}
        <div style={{ marginTop: 32 }}>
          <Head>
            โจทย์ 5 ธาตุ <span style={{ fontWeight: 300, color: EL.creamSoft }}>เลือกปัญหาไหนก็ได้ในธาตุนั้น</span>
          </Head>
          <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(5, 1fr)", columnGap: 22 }}>
            {ELEMENTS.map(({ key, color, line }) => (
              <div key={key}>
                <Pixels rows={SHAPES[key]} color={color} size={48} />
                <p style={{ margin: "10px 0 0", fontFamily: EL_FONT.display, fontWeight: 400, fontSize: 32, lineHeight: "40px" }}>{el(key)?.th}</p>
                <p style={{ margin: "4px 0 0", fontFamily: EL_FONT.display, fontWeight: 300, fontSize: 21, lineHeight: "30px", color: EL.creamSoft }}>{line}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Schedule */}
        <div style={{ marginTop: 30 }}>
          <Head>กำหนดการ</Head>
          <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: `repeat(${days.length}, 1fr)`, columnGap: 14 }}>
            {days.map((d) => (
              <div key={d} style={{ borderTop: `2px solid ${EL.cream}`, paddingTop: 12 }}>
                <p style={{ margin: 0, fontFamily: EL_FONT.display, fontWeight: 400, fontSize: 25, lineHeight: "32px" }}>{formatThaiDate(d)}</p>
                {ELEMENTAL.schedule
                  .filter((s) => s.date === d)
                  .map((s) => (
                    <div key={s.time + s.th} style={{ marginTop: 10, paddingLeft: 12, borderLeft: `4px solid ${SLOT_COLOR[s.kind]}` }}>
                      <p style={{ margin: 0, fontFamily: EL_FONT.mono, fontSize: 18, color: SLOT_COLOR[s.kind] }}>{s.time}</p>
                      <p style={{ margin: "2px 0 0", fontFamily: EL_FONT.display, fontWeight: 300, fontSize: 21, lineHeight: "28px" }}>{s.th}</p>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </div>

        {/* Foot */}
        <div style={{ marginTop: "auto", paddingBottom: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, borderTop: `1px solid rgba(243,239,230,0.28)`, paddingTop: 20 }}>
          <p style={{ margin: 0, fontFamily: EL_FONT.display, fontWeight: 300, fontSize: 24, lineHeight: "32px", color: EL.creamSoft }}>
            มีเวิร์กช็อปสด แหล่งเรียนรู้ และฟอรัมถาม-ตอบตลอดการแข่งขัน
          </p>
          <p style={{ margin: 0, fontFamily: EL_FONT.display, fontWeight: 400, fontSize: 28, color: EL.flameLight, whiteSpace: "nowrap" }}>สมัครที่ลิงก์ในไบโอ</p>
        </div>
      </div>
    </div>
  );
}
