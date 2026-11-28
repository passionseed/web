import type { OwnerElement } from "@/lib/hackathon/elemental/owner-link";

import { drawScene, ELEMENT_MARKS, type SceneName } from "./scenes";

/** One example frame, drawn as pixels. Width and height set the cell grid and the aspect; CSS scales it. */
export function PixelScene({
  scene,
  width,
  height,
  elements,
  accent,
  cell: cellSize,
  className,
}: {
  scene: SceneName;
  width: number;
  height: number;
  elements: readonly OwnerElement[];
  accent: string;
  /** Size of one pixel in width units; set it to keep pixels the same size across frames of different widths. */
  cell?: number;
  className?: string;
}) {
  const cell = cellSize ?? (width > 200 ? 6 : 4);
  const cols = Math.round(width / cell);
  const rows = Math.round(height / cell);
  const runs = drawScene(scene, cols, rows, width / height, elements, accent);
  return (
    <svg
      viewBox={`0 0 ${cols} ${rows}`}
      preserveAspectRatio="none"
      shapeRendering="crispEdges"
      aria-hidden="true"
      className={className}
      style={{ display: "block", width: "100%", height: "auto", aspectRatio: `${width} / ${height}` }}
    >
      {runs.map((r) => (
        <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w + 0.02} height={1.02} fill={r.c} />
      ))}
    </svg>
  );
}

export function ElementMark({ element, size }: { element: OwnerElement; size: number }) {
  const { color, rows } = ELEMENT_MARKS[element];
  return (
    <svg width={size} height={size} viewBox="0 0 9 9" shapeRendering="crispEdges" aria-hidden="true" style={{ display: "block", flex: "none" }}>
      {rows.flatMap((row, y) =>
        Array.from(row).map((c, x) => (c === "#" ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={color} /> : null))
      )}
    </svg>
  );
}

const PLAY = ["#......", "###....", "#####..", "#######", "#####..", "###....", "#......"];

/** Marks a frame as a video: a REC tag, a pixel play button and a scrub bar. */
export function VideoOverlay({ time }: { time: string }) {
  return (
    <>
      <span className="absolute left-[3%] top-[5%] flex items-center gap-2 bg-[rgba(30,28,26,0.72)] px-2 py-1 font-[family-name:var(--font-space-mono)] text-[12px] leading-none text-[#f3efe6] sm:text-[14px]">
        <i className="block h-2 w-2 bg-[#e2412b]" />
        REC {time}
      </span>
      <svg
        className="absolute left-1/2 top-1/2 h-[18%] w-auto -translate-x-1/2 -translate-y-1/2"
        viewBox="-1 -1 9 9"
        shapeRendering="crispEdges"
        aria-hidden="true"
      >
        <rect x={-1} y={-1} width={9} height={9} fill="rgba(30,28,26,0.6)" />
        {PLAY.flatMap((row, y) =>
          Array.from(row).map((c, x) => (c === "#" ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#f3efe6" /> : null))
        )}
      </svg>
      <span className="absolute bottom-[5%] left-[3%] right-[3%] h-1 bg-[rgba(243,239,230,0.35)]">
        <b className="block h-full w-[38%] bg-[#f3efe6]" />
      </span>
    </>
  );
}
