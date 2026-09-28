import type { ReactNode } from "react";

import {
  SHIFT_COHORT,
  formatThaiDate,
  priceLabel,
} from "@/lib/content/shift-cohort";

import { CELL, PX } from "../pixel/pixelKit";
import { MarkerHighlight } from "../riso";
import { PIXEL_FONT, Rects } from "../pixel/PixelRects";
import {
  BAND,
  HERO_TRANSFORM,
  PANO_W,
  TILE_H,
  TILE_W,
  heroRects,
  panoramaRects,
} from "./floodPanorama";

/**
 * SHIFT[1] IG grid: three carousel covers that join into one panorama on the
 * profile grid. Each cover also has to work alone in the feed, so every tile
 * carries its own complete line: the hook, the offer, the ask.
 *
 * Post order on IG is C, then B, then A, so A lands top-left.
 */

const COHORT = SHIFT_COHORT;
export const TILE_LETTERS = ["a", "b", "c"] as const;
export type TileLetter = (typeof TILE_LETTERS)[number];

const TILE_PX = TILE_W * CELL;
const TILE_PX_H = TILE_H * CELL;
const BAND_TOP = (BAND + 5) * CELL;

function PanoramaArt() {
  const { back, front } = panoramaRects();
  return (
    <svg
      className="absolute left-0 top-0"
      width={PANO_W * CELL}
      height={TILE_PX_H}
      viewBox={`0 0 ${PANO_W} ${TILE_H}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <Rects rects={back} />
      <g transform={HERO_TRANSFORM}>
        <Rects rects={heroRects()} />
      </g>
      <Rects rects={front} />
    </svg>
  );
}

/** Small pixel tag above each headline, the same height on all three tiles. */
function Tag({ children }: { children: ReactNode }) {
  return (
    <p className="text-[34px] leading-none tracking-[0.08em]" style={{ ...PIXEL_FONT, color: PX.ink }}>
      {children}
    </p>
  );
}

function Rule() {
  return <span className="mt-3 block h-[4px] w-[300px]" style={{ backgroundColor: PX.ink }} />;
}

const HEADLINE_SHADOW = `${CELL}px ${CELL}px 0 ${PX.cloudShade}`;

/** "คนใช้จริง", the one promise the whole grid leans on. Orange on the deep water. */
function RealUsers() {
  return <span style={{ color: PX.accentLight }}>คนใช้จริง</span>;
}

/**
 * Tiles A and C are often seen alone in the feed, so they say what SHIFT[1]
 * is and send people to the profile for the rest of the grid.
 */
const CONTEXT_LINE = (
  <>
    {COHORT.name} · 7 วัน ปั้นโปรเจกต์ที่มี<RealUsers />
  </>
);
const TO_PROFILE = "ดูทั้ง 3 โพสต์ที่โปรไฟล์ ↗";

/** Bottom band line: cream on the deep water, a note, and a swipe cue. */
function BandLine({ children, page, note }: { children: ReactNode; page: string; note?: ReactNode }) {
  return (
    <div
      className="absolute inset-x-0 bottom-0 flex flex-col justify-between px-[64px] pb-[40px]"
      style={{ top: BAND_TOP }}
    >
      <div className="font-kodchasan text-[42px] font-bold leading-[1.3]" style={{ color: PX.cream }}>
        {children}
      </div>
      <div className="flex items-center justify-between">
        {note ? (
          <p className="font-kodchasan text-[28px] font-semibold" style={{ color: `${PX.cream}cc` }}>
            {note}
          </p>
        ) : (
          <p className="text-[22px] tracking-[0.1em]" style={{ ...PIXEL_FONT, color: `${PX.cream}99` }}>
            passionseed.org/shift
          </p>
        )}
        <p className="text-[26px] tracking-[0.1em]" style={{ ...PIXEL_FONT, color: PX.accentLight }}>
          {page}
        </p>
      </div>
    </div>
  );
}

function CoverA() {
  return (
    <>
      <div className="absolute inset-x-0 top-[96px] flex flex-col items-center text-center">
        <Tag>TCAS1 · PORTFOLIO</Tag>
        <Rule />
        <h2
          className="mt-6 font-kodchasan text-[150px] font-bold leading-[1.02]"
          style={{ color: PX.ink, textShadow: HEADLINE_SHADOW }}
        >
          เลิกสะสม
          <br />
          ใบเซอร์
        </h2>
        <p className="mt-5 font-kodchasan text-[44px] font-semibold leading-[1.3]" style={{ color: PX.ink }}>
          ค่ายนั่งฟัง ใครก็มีเหมือนกัน
        </p>
      </div>
      <BandLine page="SWIPE →" note={TO_PROFILE}>
        {CONTEXT_LINE}
      </BandLine>
    </>
  );
}

function CoverB() {
  return (
    <>
      <div className="absolute inset-x-0 top-[96px] flex flex-col items-center text-center">
        <Tag>5-11 OCT · ONLINE</Tag>
        <Rule />
        <h1
          className="mt-4 text-[210px] leading-[0.95]"
          style={{ ...PIXEL_FONT, color: PX.ink, textShadow: HEADLINE_SHADOW }}
        >
          {COHORT.name}
        </h1>
        <p className="mt-3 font-kodchasan text-[54px] font-bold leading-[1.3]" style={{ color: PX.ink }}>
          7 วัน ปั้นโปรเจกต์ที่มี
        </p>
        <p className="mt-1 text-[104px] leading-[1.15]">
          <MarkerHighlight>คนใช้จริง</MarkerHighlight>
        </p>
      </div>
      <BandLine page="SWIPE →">
        ทำเสร็จยังไม่พอ ต้องมี<RealUsers />
      </BandLine>
    </>
  );
}

function CoverC() {
  const anchor = COHORT.anchorPriceBaht;
  return (
    <>
      <div className="absolute inset-x-0 top-[96px] flex flex-col items-center text-center">
        <Tag>{COHORT.seats} SEATS ONLY</Tag>
        <Rule />
        <h2
          className="mt-6 font-kodchasan text-[136px] font-bold leading-[1.05]"
          style={{ color: PX.ink, textShadow: HEADLINE_SHADOW }}
        >
          รับแค่ {COHORT.seats} คน
        </h2>
        <div className="mt-4 flex items-baseline gap-6">
          {anchor && (
            <span className="font-kodchasan text-[56px] font-bold line-through" style={{ color: PX.mid }}>
              ฿{anchor.toLocaleString("en-US")}
            </span>
          )}
          <span
            className="font-kodchasan text-[120px] font-bold leading-none"
            style={{ color: PX.accentDark, textShadow: `${CELL / 2}px ${CELL / 2}px 0 ${PX.cloudShade}` }}
          >
            {priceLabel(COHORT)}
          </span>
        </div>
      </div>
      <BandLine page="HOW TO →" note={`ปิดรับ ${formatThaiDate(COHORT.applyDeadline)} · ${TO_PROFILE}`}>
        {CONTEXT_LINE}
      </BandLine>
    </>
  );
}

const COVERS: Record<TileLetter, () => ReactNode> = { a: CoverA, b: CoverB, c: CoverC };

/** All three tiles side by side, exactly as the profile grid will show them. */
export function ShiftGridPanorama({ id }: { id?: string }) {
  return (
    <div
      id={id}
      className="relative shrink-0 overflow-hidden font-bai-jamjuree antialiased"
      style={{ width: PANO_W * CELL, height: TILE_PX_H, backgroundColor: PX.sky }}
    >
      <PanoramaArt />
      {TILE_LETTERS.map((letter, i) => {
        const Cover = COVERS[letter];
        return (
          <div key={letter} className="absolute top-0 h-full" style={{ left: i * TILE_PX, width: TILE_PX }}>
            <Cover />
          </div>
        );
      })}
    </div>
  );
}

/** One 1080x1440 cover: the panorama seen through its tile's window. */
export function ShiftGridCover({ letter }: { letter: TileLetter }) {
  const index = TILE_LETTERS.indexOf(letter);
  return (
    <div
      id={`shift1-grid-${letter}-1`}
      className="relative shrink-0 overflow-hidden"
      style={{ width: TILE_PX, height: TILE_PX_H }}
    >
      <div className="absolute top-0" style={{ left: -index * TILE_PX }}>
        <ShiftGridPanorama />
      </div>
    </div>
  );
}
