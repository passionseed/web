import type { CSSProperties, ReactNode } from "react";

import { MarkerHighlight, PassionSeedMark, REFUND_PROMISE } from "../../../riso";
import { SHIFT3 } from "../../../shift3/facts";
import { PIXEL_FONT, PixelIcon, Rects } from "../../PixelRects";
import { building, disc, waveBand, type Rect } from "../../pixelKit";
import { CommentBubble } from "../CommentBubble";
import { HX, craters, stars } from "../halloweenKit";

/**
 * Shell for the SHIFT[3] startup lab posters (1080x1350), laid out like
 * key art: one big pixel image fills the top, a Kodchasan headline sits on
 * the dark at the bottom, then the same quiet offer band as the Halloween
 * cover. Depth comes from scale, cropping, perspective and light, not from
 * stickers. Facts come from SHIFT_COHORT_3 via SHIFT3.
 */

export const W = 1080;
export const H = 1350;
export const CELL = 6;
export const MONO = "var(--font-space-mono), ui-monospace, monospace";
/** Top of the offer band's wave, in px. */
const BAND_TOP = 1092;

/** Flat night sky with pixel stars, the cover's sky. */
export function Night({ count = 70, light }: { count?: number; light?: [number, number] }) {
  const cols = W / CELL;
  const rows = BAND_TOP / CELL;
  return (
    <>
      <div className="absolute inset-0" style={{ backgroundColor: HX.sky }} />
      {light && (
        <div
          className="absolute inset-0"
          style={{ background: `radial-gradient(760px 620px at ${light[0]}px ${light[1]}px, #3a2763 0%, transparent 100%)` }}
        />
      )}
      <svg className="absolute inset-0" width={W} height={H} viewBox={`0 0 ${cols} ${H / CELL}`} shapeRendering="crispEdges" aria-hidden="true">
        <Rects rects={stars(0, rows - 30, count, cols)} />
      </svg>
    </>
  );
}

/** Pixel moon from the kit's stepped disc, so it matches the cover. */
export function Moon({ x, y, r, cell = 10 }: { x: number; y: number; r: number; cell?: number }) {
  const R = Math.round(r / cell);
  const c = R + 3;
  const size = c * 2 * cell;
  return (
    <svg
      className="absolute"
      style={{ left: x - size / 2, top: y - size / 2 }}
      width={size}
      height={size}
      viewBox={`0 0 ${c * 2} ${c * 2}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <Rects rects={[...disc(c, c, R + 3, HX.moonGlow), ...disc(c, c, R, HX.moon), ...craters(c, c)]} />
    </svg>
  );
}

/** A row of pixel buildings from `top` (px) down to `bottom` (px). */
export function Skyline({
  top,
  bottom,
  color = HX.far,
  lit,
  seed = 0,
}: {
  top: number;
  bottom: number;
  color?: string;
  /** Share of windows lit, for nearer rows. */
  lit?: number;
  seed?: number;
}) {
  const t = Math.round(top / CELL);
  const b = Math.round(bottom / CELL);
  const rects: Rect[] = [];
  let x = 0;
  let i = seed;
  while (x < W / CELL) {
    const w = 10 + ((i * 7) % 9);
    const h = ((i * 13) % 11) - 5;
    rects.push(...building(x, t + h, w, b, lit ? { body: color, window: HX.windowDark, lit } : { body: color }));
    x += w;
    i++;
  }
  return (
    <svg className="absolute inset-0" width={W} height={H} viewBox={`0 0 ${W / CELL} ${H / CELL}`} shapeRendering="crispEdges" aria-hidden="true">
      <Rects rects={rects} />
    </svg>
  );
}

/** A sprite at any size; `glow` adds a soft light around it. */
export function Sprite({
  grid,
  palette,
  cell,
  x,
  y,
  rotate = 0,
  glow,
  flip,
}: {
  grid: string[];
  palette: Record<string, string>;
  cell: number;
  x: number;
  y: number;
  rotate?: number;
  glow?: string;
  flip?: boolean;
}) {
  return (
    <div
      className="absolute"
      style={{
        left: x,
        top: y,
        transform: `rotate(${rotate}deg)${flip ? " scaleX(-1)" : ""}`,
        filter: glow ? `drop-shadow(0 0 ${cell * 2}px ${glow})` : undefined,
      }}
    >
      <PixelIcon grid={grid} palette={palette} scale={cell} />
    </div>
  );
}

/** Y2K desktop window used inside a scene: purple title bar, pixel buttons, hard shadow. */
export function Win({
  title,
  x,
  y,
  w,
  rotate = 0,
  children,
  style,
}: {
  title: string;
  x: number;
  y: number;
  w: number;
  rotate?: number;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div className="absolute" style={{ left: x, top: y, width: w, transform: `rotate(${rotate}deg)`, boxShadow: `12px 12px 0 ${HX.ink}`, ...style }}>
      <div style={{ border: `4px solid ${HX.ink}`, backgroundColor: HX.cream }}>
        <div className="flex h-[40px] items-center justify-between gap-3 pl-[12px] pr-[8px]" style={{ backgroundColor: HX.hat, borderBottom: `4px solid ${HX.ink}` }}>
          <span className="truncate text-[18px] font-bold" style={{ fontFamily: MONO, color: HX.cream }}>
            {title}
          </span>
          <span className="flex shrink-0 gap-[5px]">
            {["_", "□", "×"].map((b) => (
              <span
                key={b}
                className="flex h-[22px] w-[24px] items-center justify-center text-[15px] font-bold leading-none"
                style={{ fontFamily: MONO, backgroundColor: HX.cream, color: HX.ink, boxShadow: `inset -3px -3px 0 ${HX.stone}` }}
              >
                {b}
              </span>
            ))}
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Dark falling off the bottom of the art so the headline sits on night. */
function Fade() {
  return (
    <div
      className="absolute inset-x-0"
      style={{ top: 640, height: BAND_TOP - 640 + 20, background: `linear-gradient(180deg, transparent 0%, ${HX.ink}e6 55%, ${HX.ink} 100%)` }}
    />
  );
}

/** Headline, bottom left, Kodchasan; `==word==` takes the pumpkin accent. */
function Headline({ text, sub }: { text: string; sub?: string }) {
  const parts = text.split(/(==[^=]+==)/g).filter(Boolean);
  return (
    <div className="absolute inset-x-[64px]" style={{ bottom: H - BAND_TOP + 26 }}>
      <h2 className="whitespace-pre-line font-kodchasan text-[98px] font-bold leading-[1.12] tracking-[-0.01em]" style={{ color: HX.cream }}>
        {parts.map((p, i) =>
          p.startsWith("==") ? (
            <span key={i} style={{ color: HX.pumpkin }}>
              {p.slice(2, -2)}
            </span>
          ) : (
            <span key={i}>{p}</span>
          ),
        )}
      </h2>
      {sub && (
        <p className="mt-[12px] text-[28px] font-medium leading-[1.45]" style={{ color: `${HX.cream}c7` }}>
          {sub}
        </p>
      )}
    </div>
  );
}

/** The offer, identical on all five: the Halloween cover's band. */
function Band() {
  const cols = W / CELL;
  const top = BAND_TOP / CELL;
  return (
    <>
      <svg className="absolute inset-0" width={W} height={H} viewBox={`0 0 ${cols} ${H / CELL}`} shapeRendering="crispEdges" aria-hidden="true">
        <Rects rects={waveBand(top, HX.ink, 12, cols, H / CELL)} />
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex flex-col px-[64px] pb-[28px]" style={{ top: BAND_TOP + 30 }}>
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="font-kodchasan text-[36px] font-bold leading-[1.3]" style={{ color: HX.cream }}>
              <span className="text-[42px]" style={{ ...PIXEL_FONT, color: HX.pumpkin }}>
                {SHIFT3.name}
              </span>{" "}
              แล็บสตาร์ทอัพเล็กๆ {SHIFT3.days} คืน
            </p>
            <p className="mt-[2px] text-[22px] leading-[1.5]" style={{ color: `${HX.cream}bf` }}>
              <span className="font-kodchasan text-[34px] font-bold" style={{ color: HX.flame }}>
                {SHIFT3.price}
              </span>{" "}
              · {SHIFT3.dates} · ออนไลน์ทุกเย็น {SHIFT3.time} น.
            </p>
            <p className="mt-[8px] flex items-center gap-4 text-[21px]">
              <MarkerHighlight>{REFUND_PROMISE}</MarkerHighlight>
              <span className="font-kodchasan font-semibold" style={{ color: HX.pumpkin }}>
                ■ ปิดรับสมัคร {SHIFT3.deadline}
              </span>
            </p>
          </div>
          <div className="shrink-0 text-center">
            <CommentBubble keyword={SHIFT3.keyword} />
            <p className="font-kodchasan text-[19px] font-bold" style={{ color: HX.cream }}>
              รับลิงก์สมัครทาง DM
            </p>
          </div>
        </div>
        <div className="mt-auto flex items-center justify-between">
          <PassionSeedMark size={30} />
          <p className="text-[17px] tracking-[0.08em]" style={{ ...PIXEL_FONT, color: `${HX.cream}99` }}>
            {SHIFT3.link}
          </p>
        </div>
      </div>
    </>
  );
}

export function Poster({
  id,
  headline,
  sub,
  children,
  front,
}: {
  id: string;
  headline: string;
  sub?: string;
  children: ReactNode;
  /** Labels that must stay full contrast, drawn above the fade. */
  front?: ReactNode;
}) {
  return (
    <div
      id={id}
      lang="th"
      className="relative shrink-0 overflow-hidden font-bai-jamjuree antialiased"
      style={{ width: W, height: H, backgroundColor: HX.ink }}
    >
      {children}
      <Fade />
      {front}
      <Headline text={headline} sub={sub} />
      <Band />
    </div>
  );
}
