import type { Rect } from "./pixelKit";

/** Pixel font for Latin labels; Thai falls back to the page font. */
export const PIXEL_FONT = { fontFamily: "var(--font-tiny5)" };

/** Draws kit rects inside an SVG whose viewBox is in grid cells. */
export function Rects({ rects }: { rects: Rect[] }) {
  return (
    <>
      {rects.map(([x, y, w, h, fill], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill={fill} />
      ))}
    </>
  );
}
