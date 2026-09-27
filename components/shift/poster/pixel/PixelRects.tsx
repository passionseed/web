import { sprite, type Rect } from "./pixelKit";

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

/** An ASCII sprite as a standalone inline icon, `scale` px per cell. */
export function PixelIcon({
  grid,
  palette,
  scale,
  className,
}: {
  grid: string[];
  palette: Record<string, string>;
  scale: number;
  className?: string;
}) {
  const w = Math.max(...grid.map((row) => row.length));
  const h = grid.length;
  return (
    <svg
      className={className}
      width={w * scale}
      height={h * scale}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <Rects rects={sprite(grid, palette, 0, 0)} />
    </svg>
  );
}
