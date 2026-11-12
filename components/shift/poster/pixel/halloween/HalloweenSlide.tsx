import type { ReactNode } from "react";

import type { StudioPoint } from "@/lib/marketing/types";

import { SHIFT3 } from "../../shift3/facts";
import { LATIN } from "../../shift3/parts";
import { PIXEL_FONT, Rects } from "../PixelRects";
import { CELL, GRID_H, GRID_W, bands, building, disc, sprite, waveBand, type Rect } from "../pixelKit";
import { BAT, BAT_PALETTE, HX, PUMPKIN, PUMPKIN_PALETTE, craters, lanternGlow, stars, tombstone } from "./halloweenKit";

/**
 * Shared frame for the SHIFT[3] Halloween carousel slides (1080x1350): flat
 * night sky, a small moon, a low skyline and graveyard strip, and a footer
 * that repeats the call to action ("คอมเมนต์ SHIFT") on every slide.
 * Slides pass their copy as children and may add pixel `decor` above the ground.
 */

/** Ground line and top of the footer band, in grid rows. */
export const SLIDE_GROUND = 192;
const BAND = 206;
/** Copy ends above the skyline (row 176), so content never runs into it. */
const CONTENT_TOP = 80;
const CONTENT_BOTTOM = 170 * CELL;

function frameScene(): Rect[] {
  const out: Rect[] = [[0, 0, GRID_W, SLIDE_GROUND, HX.sky], ...stars(0, 170, 34, GRID_W)];
  out.push(
    ...disc(160, 16, 9, HX.moonGlow),
    ...disc(160, 16, 7, HX.moon),
    ...craters(160, 16).filter(([, y]) => y > 9 && y < 23),
    ...sprite(BAT, BAT_PALETTE, 146, 22),
  );
  const tops = [182, 178, 184, 176, 180, 183, 177, 181, 179, 184, 178, 182];
  let x = 0;
  tops.forEach((top, i) => {
    const w = 12 + ((i * 7) % 8);
    out.push(...building(x, top, w, SLIDE_GROUND, { body: HX.far }));
    x += w;
  });
  out.push(
    ...bands(0, GRID_W, [
      [SLIDE_GROUND, HX.groundTop],
      [SLIDE_GROUND + 3, HX.ground],
      [BAND + 3, HX.ground],
    ]),
    ...lanternGlow(34, 201, 6, HX.ground),
    ...lanternGlow(148, 202, 6, HX.ground),
    ...tombstone(12, 203, 6, 7),
    ...tombstone(164, 204, 7, 8),
    ...sprite(PUMPKIN, PUMPKIN_PALETTE, 30, 198),
    ...sprite(PUMPKIN, PUMPKIN_PALETTE, 144, 199),
  );
  return out;
}

function Scene({ decor }: { decor?: Rect[] }) {
  return (
    <svg
      className="absolute inset-0"
      width={GRID_W * CELL}
      height={GRID_H * CELL}
      viewBox={`0 0 ${GRID_W} ${GRID_H}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <Rects rects={frameScene()} />
      {decor && <Rects rects={decor} />}
      <Rects rects={waveBand(BAND, HX.ink)} />
    </svg>
  );
}

/** `==word==` in pumpkin, `**word**` in flame yellow, newlines kept. */
export function Marked({ text }: { text: string }) {
  const parts = text.split(/(==[^=]+==|\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("==")) return <span key={i} style={{ color: HX.pumpkin }}>{part.slice(2, -2)}</span>;
        if (part.startsWith("**")) return <span key={i} style={{ color: HX.flame }}>{part.slice(2, -2)}</span>;
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

/** Title-and-body points, optionally numbered with pixel badges. */
export function Points({ points, numbered }: { points: StudioPoint[]; numbered?: boolean }) {
  return (
    <ol className="flex flex-col gap-[36px]">
      {points.map((point, i) => (
        <li key={point.title} className="flex gap-[24px]">
          {numbered ? (
            <span
              className="flex h-[54px] w-[54px] shrink-0 items-center justify-center text-[30px] font-bold"
              style={{ fontFamily: LATIN, backgroundColor: HX.pumpkin, color: HX.ink }}
            >
              {i + 1}
            </span>
          ) : (
            <span className="mt-[16px] h-[18px] w-[18px] shrink-0" style={{ backgroundColor: HX.pumpkin }} />
          )}
          <div className="min-w-0">
            <p className="font-kodchasan text-[37px] font-bold leading-[1.35]" style={{ color: HX.cream }}>
              <Marked text={point.title} />
            </p>
            {point.body && (
              <p className="mt-[6px] whitespace-pre-line text-[26px] leading-[1.55]" style={{ color: `${HX.cream}bf` }}>
                <Marked text={point.body} />
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

function Footer({ page, total }: { page: number; total: number }) {
  return (
    <div
      className="absolute inset-x-0 bottom-0 flex items-center justify-between px-[72px]"
      style={{ top: (BAND + 3) * CELL }}
    >
      <p className="font-kodchasan text-[26px] font-bold" style={{ color: HX.cream }}>
        คอมเมนต์{" "}
        <span className="text-[34px]" style={{ ...PIXEL_FONT, color: HX.pumpkin }}>
          {SHIFT3.keyword}
        </span>{" "}
        รับลิงก์สมัครทาง DM
      </p>
      <p className="text-[22px] font-semibold tracking-[0.1em]" style={{ fontFamily: LATIN, color: HX.lavender }}>
        {SHIFT3.name} · {page}/{total}
      </p>
    </div>
  );
}

export function HalloweenSlide({
  id,
  page,
  total,
  tag,
  title,
  decor,
  align = "center",
  children,
}: {
  id: string;
  page: number;
  /** Slides in the carousel, for the "page/total" footer. */
  total: number;
  tag: string;
  title: string;
  /** Extra pixel art in grid cells, drawn over the frame scene. */
  decor?: Rect[];
  /** "center" sits the body midway between the title and the skyline;
   *  "top" keeps it under the title, for slides whose art fills the lower half. */
  align?: "center" | "top";
  children?: ReactNode;
}) {
  return (
    <div
      id={id}
      lang="th"
      className="relative shrink-0 overflow-hidden font-bai-jamjuree antialiased"
      style={{ width: GRID_W * CELL, height: GRID_H * CELL, backgroundColor: HX.sky }}
    >
      <Scene decor={decor} />
      <div className="absolute inset-x-[72px] flex flex-col" style={{ top: CONTENT_TOP, height: CONTENT_BOTTOM - CONTENT_TOP }}>
        <p className="text-[24px] font-semibold uppercase tracking-[0.14em]" style={{ fontFamily: LATIN, color: HX.lavender }}>
          {tag}
        </p>
        <h2
          className="mt-[18px] whitespace-pre-line font-kodchasan text-[76px] font-bold leading-[1.2]"
          style={{ color: HX.cream }}
        >
          <Marked text={title} />
        </h2>
        {children && (
          <div className={align === "center" ? "mt-[28px] flex flex-1 flex-col justify-center pb-[20px]" : "mt-[44px]"}>{children}</div>
        )}
      </div>
      <Footer page={page} total={total} />
    </div>
  );
}
