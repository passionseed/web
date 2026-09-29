import { PIXEL_FONT, Rects } from "@/components/shift/poster/pixel/PixelRects";
import {
  BIRD,
  BIRD_PALETTE,
  GULL,
  PX,
  STUDENT,
  STUDENT_PALETTE,
  bands,
  boat,
  building,
  cloud,
  disc,
  glints,
  mix,
  reflect,
  sprite,
  waveBand,
  type Rect,
} from "@/components/shift/poster/pixel/pixelKit";

import type { ShiftPalette } from "./tokens";
import type { ShiftHeroProps, ShiftTheme } from "./types";

/**
 * SHIFT[1]: pixel art, a flooded city the morning after the storm. Same
 * OKLCH palette as the pixel poster (see pixelKit.ts), so the ad and the
 * page read as one world. The page is the deep water under the scene: ink
 * background, cream text, the orange boat as the only loud colour.
 *
 * Contrast on ink (#172836): cream 13.8:1, cream at 60% 5.9:1, orange 5.3:1,
 * light orange 9.7:1, water teal 6.7:1.
 */

const PALETTE: ShiftPalette = {
  bg: PX.ink,
  text: PX.cream,
  accent1: PX.accent,
  accent2: PX.waterLight,
  accent3: PX.accentLight,
  accent4: PX.water,
  hair: "rgba(248,245,236,0.12)",
  // Hard one-cell drop, the pixel way to lift a heading.
  headingShadow: `3px 3px 0 ${PX.waterDeep}`,
  bar: "rgba(23,40,54,0.9)",
  button: {
    bg: PX.accentLight,
    fg: PX.ink,
    shadow: `4px 4px 0 0 ${PX.accentDark}`,
    shadowHover: `6px 6px 0 0 ${PX.accentDark}`,
  },
};

/** Scene grid in cells. The SVG slices to fill, so pixels stay square. */
const W = 240;
const H = 110;
const WATER = 88;
const BOAT = { x: 170, scale: 2, w: 24, gunwale: 14, keel: 18, draft: 6 };
const BOAT_TOP = WATER + BOAT.draft - BOAT.keel * BOAT.scale;

function sky(): Rect[] {
  return [
    ...bands(0, W, [
      [0, PX.skyTop],
      [40, PX.sky],
      [70, PX.skyHaze],
      [WATER, PX.skyHaze],
    ]),
    ...disc(92, 80, 9, PX.sun),
    ...cloud(30, 34, [3, 5, 4]),
    ...cloud(176, 22, [3, 4, 3]),
    ...sprite(GULL, { W: PX.mid }, 60, 20),
    ...sprite(GULL, { W: PX.mid }, 68, 26),
  ];
}

function city(): Rect[] {
  const far: Rect[] = [];
  const tops = [72, 68, 74, 66, 70, 64, 72, 68, 74, 66, 70, 68, 72, 66, 70, 74, 68];
  let x = 0;
  tops.forEach((top, i) => {
    const w = 10 + ((i * 7) % 8);
    far.push(...building(x, top, w, WATER, { body: PX.far }));
    x += w;
  });
  const midOpts = { body: PX.mid, window: mix(PX.mid, PX.near, 0.5), lit: 0.12 };
  const nearOpts = { body: PX.near, window: PX.windowDark, lit: 0.3 };
  return [
    ...far,
    ...building(44, 50, 8, WATER, { body: PX.far, roof: "antenna" }),
    ...building(56, 70, 14, WATER, midOpts),
    ...building(126, 72, 14, WATER, midOpts),
    ...building(186, 66, 14, WATER, midOpts),
    ...building(0, 40, 22, WATER, { ...nearOpts, roof: "tank" }),
    ...building(22, 62, 12, WATER, { ...nearOpts, roof: "garden" }),
    ...building(206, 70, 12, WATER, { ...nearOpts, roof: "garden" }),
    ...building(218, 60, 22, WATER, { ...nearOpts, roof: "antenna" }),
  ];
}

function boatRects(): Rect[] {
  return [
    ...sprite(STUDENT, STUDENT_PALETTE, 6, BOAT.gunwale - STUDENT.length),
    ...boat(0, BOAT.gunwale, BOAT.w),
    ...sprite(BIRD, BIRD_PALETTE, BOAT.w - 6, BOAT.gunwale - BIRD.length),
  ];
}

/**
 * The scene slices to fill, so on a narrow phone only a strip of it shows.
 * `anchor` picks which strip: phones keep the right side, where the boat is.
 */
function FloodScene({ anchor, className }: { anchor: "xMid" | "xMax"; className: string }) {
  const above = city();
  return (
    <svg
      className={`absolute inset-0 h-full w-full ${className}`}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio={`${anchor}YMax slice`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <Rects rects={sky()} />
      <Rects rects={above} />
      <Rects
        rects={[
          ...bands(0, W, [
            [WATER, PX.waterLight],
            [WATER + 7, PX.water],
            [H, PX.water],
          ]),
          ...reflect(above, WATER, 12),
          ...glints(WATER + 1, H - 6, 30, W),
          ...waveBand(H - 5, PX.ink, 12, W, H),
        ]}
      />
      <g transform={`translate(${BOAT.x} ${BOAT_TOP}) scale(${BOAT.scale})`}>
        <Rects rects={boatRects()} />
      </g>
    </svg>
  );
}

const SCENE_HEIGHT = "clamp(520px, 78svh, 760px)";

function PixelHero({ cohort, headline, children }: ShiftHeroProps) {
  return (
    <header className="relative">
      <div className="relative overflow-hidden" style={{ height: SCENE_HEIGHT }}>
        <FloodScene anchor="xMax" className="sm:hidden" />
        <FloodScene anchor="xMid" className="hidden sm:block" />
        <div className="relative mx-auto flex max-w-5xl flex-col items-center px-5 pt-24 text-center sm:px-8 sm:pt-28">
          <p
            className="text-[clamp(14px,2vw,20px)] tracking-[0.12em]"
            style={{ ...PIXEL_FONT, color: PX.ink }}
          >
            COHORT {String(cohort.round).padStart(2, "0")} · {cohort.seats} SEATS
          </p>
          <h1
            className="mt-3 text-[clamp(72px,15vw,168px)] leading-[0.9]"
            style={{ ...PIXEL_FONT, color: PX.ink, textShadow: `6px 6px 0 ${PX.cloudShade}` }}
          >
            {cohort.name}
          </h1>
          <p
            className="mt-4 font-kodchasan text-[clamp(28px,4.4vw,48px)] font-bold leading-[1.3]"
            style={{ color: PX.ink }}
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

/** Water glints drifting past the final CTA. */
function PixelBookend() {
  const rects: Rect[] = [
    ...bands(0, W, [
      [0, PX.water],
      [10, PX.waterDeep],
      [40, PX.waterDeep],
    ]),
    ...glints(1, 30, 26, W),
    ...waveBand(-1, PX.ink, 12, W, 2),
  ];
  return (
    <svg
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[240px] w-full"
      viewBox={`0 0 ${W} 40`}
      preserveAspectRatio="xMidYMax slice"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <Rects rects={rects} />
    </svg>
  );
}

export const PIXEL_THEME: ShiftTheme = {
  kind: "pixel",
  palette: PALETTE,
  Hero: PixelHero,
  Bookend: PixelBookend,
};
