import { PIXEL_FONT, Rects } from "@/components/shift/poster/pixel/PixelRects";
import { bands, building, disc, sprite, waveBand, type Rect } from "@/components/shift/poster/pixel/pixelKit";
import {
  BAT,
  BAT_PALETTE,
  CAT,
  CAT_PALETTE,
  GHOST,
  GHOST_DIM_PALETTE,
  HX,
  PUMPKIN,
  PUMPKIN_PALETTE,
  bigSprite,
  craters,
  deadTree,
  fogWisps,
  lanternGlow,
  latinDateRange,
  spire,
  stars,
  tombstone,
  witchStudent,
} from "@/components/shift/poster/pixel/halloween/halloweenKit";
import { LATIN } from "@/components/shift/poster/shift3/parts";

import type { ShiftPalette } from "./tokens";
import type { ShiftHeroProps, ShiftTheme } from "./types";

/**
 * SHIFT[3]: the Halloween night of SHIFT[1]'s pixel world, the same night as
 * the SHIFT[3] cover, banner and register page (halloweenKit.ts), so the ad,
 * the round page and the form read as one place. The page is the poster's
 * footer ink under the scene: cream text, pumpkin as the one loud colour,
 * lavender for quiet lines.
 *
 * Contrast on ink (#0d0919): cream 18.6:1, cream at 60% 7.4:1, pumpkin 6.4:1,
 * flame 14.6:1, lavender 9.8:1.
 */

const PALETTE: ShiftPalette = {
  bg: HX.ink,
  text: HX.cream,
  accent1: HX.pumpkin,
  accent2: HX.lavender,
  accent3: HX.flame,
  accent4: HX.screen,
  hair: "rgba(248,245,236,0.12)",
  // Hard one-cell drop in witch-hat purple, the pixel way to lift a heading.
  headingShadow: `3px 3px 0 ${HX.hat}`,
  bar: "rgba(13,9,25,0.9)",
  button: {
    bg: HX.pumpkin,
    fg: HX.ink,
    shadow: `4px 4px 0 0 ${HX.pumpkinDark}`,
    shadowHover: `6px 6px 0 0 ${HX.pumpkinDark}`,
  },
};

/** Scene grid in cells. The SVG slices to fill, so pixels stay square. */
const W = 240;
const H = 110;
const GROUND = 88;
const MOON = { cx: 206, cy: 28, r: 11 };
/** The student stands right of the title; phones crop to this side. */
const HERO = { x: 186, bottom: 104, scale: 2 };

function sky(): Rect[] {
  return [
    // One flat night: no dithered seams behind the title.
    [0, 0, W, GROUND, HX.sky],
    ...stars(0, 74, 60, W),
    ...disc(MOON.cx, MOON.cy, MOON.r + 2, HX.moonGlow),
    ...disc(MOON.cx, MOON.cy, MOON.r, HX.moon),
    ...craters(MOON.cx, MOON.cy),
    ...sprite(BAT, BAT_PALETTE, 194, 20),
    ...sprite(BAT, BAT_PALETTE, 212, 36),
    ...sprite(BAT, BAT_PALETTE, 30, 30),
    ...sprite(GHOST, GHOST_DIM_PALETTE, 22, 52),
  ];
}

/** Far skyline across the full width, a church spire as the landmark. */
function farCity(): Rect[] {
  const tops = [74, 70, 76, 68, 72, 66, 74, 70, 76, 68, 72, 70, 74, 68, 72, 76, 70];
  const out: Rect[] = [];
  let x = 0;
  tops.forEach((top, i) => {
    const w = 10 + ((i * 7) % 8);
    out.push(...building(x, top, w, GROUND, { body: HX.far }));
    x += w;
  });
  out.push(...building(62, 56, 8, GROUND, { body: HX.far }), ...spire(60, 56, 12, HX.far));
  return out;
}

/** A haunted house mid-left, near towers framing both edges, a tree by the student. */
function nearCity(): Rect[] {
  const midOpts = { body: HX.mid, window: HX.windowDark, lit: 0.25 };
  const nearOpts = { body: HX.near, window: HX.windowDark, lit: 0.3 };
  return [
    ...building(40, 72, 14, GROUND, midOpts),
    ...building(132, 70, 20, GROUND, midOpts),
    ...spire(132, 70, 10, HX.mid),
    ...spire(142, 70, 10, HX.mid),
    ...building(0, 50, 22, GROUND, { ...nearOpts, roof: "antenna" }),
    ...deadTree(176, GROUND + 1, HX.near),
    ...building(222, 54, 18, GROUND, { ...nearOpts, roof: "tank" }),
  ];
}

function graveyard(): Rect[] {
  return [
    ...bands(0, W, [
      [GROUND, HX.groundTop],
      [GROUND + 3, HX.ground],
      [H, HX.ground],
    ]),
    ...fogWisps(GROUND + 1, GROUND + 9, 14, W),
    ...lanternGlow(HERO.x + 12, 90, 14, HX.ground, HX.screen),
    ...lanternGlow(161, 99, 7, HX.ground),
    ...lanternGlow(233, 100, 6, HX.ground),
    ...tombstone(16, 100, 7, 8),
    ...tombstone(96, 101, 9, 9),
    ...tombstone(146, 100, 7, 8),
    ...tombstone(202, 102, 6, 7),
    ...bigSprite(CAT, CAT_PALETTE, 212, 86, 2),
    ...bigSprite(PUMPKIN, PUMPKIN_PALETTE, 152, 96, 2),
    ...sprite(PUMPKIN, PUMPKIN_PALETTE, 229, 98),
    ...sprite(PUMPKIN, PUMPKIN_PALETTE, 60, 99),
    ...sprite(PUMPKIN, PUMPKIN_PALETTE, 118, 100),
  ];
}

/**
 * The scene slices to fill, so on a narrow phone only a strip of it shows.
 * `anchor` picks which strip: phones keep the right side, where the student is.
 */
export function NightScene({ anchor, className }: { anchor: "xMid" | "xMax"; className: string }) {
  return (
    <svg
      className={`absolute inset-0 h-full w-full ${className}`}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio={`${anchor}YMax slice`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <Rects rects={sky()} />
      <Rects rects={[...farCity(), ...nearCity()]} />
      <Rects rects={graveyard()} />
      <Rects rects={witchStudent(HERO.x, HERO.bottom, HERO.scale)} />
      <Rects rects={waveBand(H - 4, HX.ink, 12, W, H)} />
    </svg>
  );
}

const SCENE_HEIGHT = "clamp(520px, 78svh, 760px)";

function HalloweenHero({ cohort, headline, children }: ShiftHeroProps) {
  return (
    <header className="relative">
      <div className="relative overflow-hidden" style={{ height: SCENE_HEIGHT }}>
        <NightScene anchor="xMax" className="sm:hidden" />
        <NightScene anchor="xMid" className="hidden sm:block" />
        {/* Phones crop to the moon side, so night settles over the copy there. */}
        <div
          className="absolute inset-0 sm:hidden"
          style={{ background: `linear-gradient(180deg, ${HX.sky}e6 0%, ${HX.sky}cc 55%, transparent 78%)` }}
          aria-hidden="true"
        />
        <div className="relative mx-auto flex max-w-5xl flex-col items-center px-5 pt-24 text-center sm:px-8 sm:pt-28">
          {/* Latin font for the date: Tiny5 turns "9-15 NOV" into "3-15 HOY". */}
          <p
            className="text-[clamp(14px,1.8vw,20px)] font-semibold tracking-[0.14em]"
            style={{ fontFamily: LATIN, color: HX.lavender }}
          >
            {latinDateRange(cohort.startDate, cohort.endDate)} · ONLINE · {cohort.seats} SEATS
          </p>
          <h1
            className="mt-3 text-[clamp(72px,15vw,168px)] leading-[0.9]"
            style={{ ...PIXEL_FONT, color: HX.cream, textShadow: `6px 6px 0 ${HX.hat}` }}
          >
            {cohort.name}
          </h1>
          <p
            className="mt-4 font-kodchasan text-[clamp(28px,4.4vw,48px)] font-bold leading-[1.3]"
            style={{ color: HX.cream, textShadow: `3px 3px 0 ${HX.ink}` }}
          >
            {headline}
          </p>
        </div>
      </div>
      <div className="relative mx-auto flex max-w-5xl flex-col items-center px-5 pb-24 pt-10 text-center sm:px-8 sm:pt-14">
        {children}
      </div>
    </header>
  );
}

/** Graveyard strip, 240x40 cells: fog, headstones, lit lanterns, a cat. */
export const STRIP = { w: W, h: 40 };

export function graveyardStrip(): Rect[] {
  const top = 14;
  return [
    ...waveBand(top - 3, HX.groundTop, 12, W, STRIP.h),
    [0, top, W, STRIP.h - top, HX.ground],
    ...fogWisps(top + 1, top + 8, 12, W),
    ...lanternGlow(40, top + 9, 7, HX.ground),
    ...lanternGlow(128, top + 9, 7, HX.ground),
    ...lanternGlow(206, top + 9, 7, HX.ground),
    ...tombstone(20, top + 10, 7, 8),
    ...tombstone(88, top + 11, 9, 9),
    ...tombstone(168, top + 10, 7, 8),
    ...sprite(PUMPKIN, PUMPKIN_PALETTE, 36, top + 5),
    ...sprite(PUMPKIN, PUMPKIN_PALETTE, 124, top + 5),
    ...sprite(PUMPKIN, PUMPKIN_PALETTE, 202, top + 5),
    ...sprite(CAT, CAT_PALETTE, 150, top + 2),
  ];
}

/** The graveyard strip behind the final CTA. */
function HalloweenBookend() {
  return (
    <svg
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[240px] w-full"
      viewBox={`0 0 ${STRIP.w} ${STRIP.h}`}
      preserveAspectRatio="xMidYMax slice"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <Rects rects={graveyardStrip()} />
    </svg>
  );
}

export const HALLOWEEN_THEME: ShiftTheme = {
  kind: "pixel",
  palette: PALETTE,
  Hero: HalloweenHero,
  Bookend: HalloweenBookend,
};
