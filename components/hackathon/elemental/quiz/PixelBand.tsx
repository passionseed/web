import type { ElementKey } from "@/components/hackathon/elemental/media";
import { pixelBandCells } from "@/lib/hackathon/elemental/quiz";

const COLS = 27;
const ROWS = 6;

/** The result card's pixel band, across the top of the result page. */
export function PixelBand({ element }: { element: ElementKey }) {
  return (
    <svg viewBox={`0 0 ${COLS} ${ROWS}`} preserveAspectRatio="none" shapeRendering="crispEdges" aria-hidden="true" className="mb-8 block h-24 w-full sm:h-32">
      {pixelBandCells(element, COLS, ROWS).map(([c, r, color]) => (
        <rect key={`${c}-${r}`} x={c} y={r} width={1} height={1} fill={color} />
      ))}
    </svg>
  );
}
