import { MOTION_SPRITES } from "@/bot/assets/island/motion-sprites";
import { PALETTE, SPRITES } from "@/bot/assets/island/sprites";
import { Rects } from "@/components/shift/poster/pixel/PixelRects";
import { sprite } from "@/components/shift/poster/pixel/pixelKit";

import { ROOTS_H, ROOTS_W, rootsGrid } from "./roots";

/**
 * Static pixel pictures for the guide, drawn from the island's own sprites
 * (bot/assets/island) so the guide looks like the same world. Plain SVG rects,
 * no canvas and no client code: they render on the server and at any size.
 */

const TREE_W = 32;
const TREE_H = 40;

/** One tree (stage 4) over a slice of ground with its roots at `level`. */
export function TreeWithRoots({ level, className }: { level: number; className?: string }) {
  const height = TREE_H + ROOTS_H;
  return (
    <svg
      className={className}
      viewBox={`0 0 ${TREE_W} ${height}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      preserveAspectRatio="xMidYMax meet"
    >
      {/* The ground starts on the mound's last row, so the mound sits in it. */}
      <rect x={0} y={TREE_H - 1} width={ROOTS_W} height={ROOTS_H + 1} fill={PALETTE.b} />
      <rect x={0} y={TREE_H - 1} width={ROOTS_W} height={1} fill={PALETTE.c} />
      <Rects rects={sprite(SPRITES.stage_4, PALETTE, 0, 0)} />
      <Rects rects={sprite(rootsGrid(level), PALETTE, 0, TREE_H)} />
    </svg>
  );
}

/** Seats around the pit, as the plaza places them (lib/shift-island/live/plaza.ts), moved to start at 0,0. */
const PIT = { x: 10, y: 12 } as const;
const FLAME = { x: 12, y: 4 } as const;
const SEATS_BEHIND = [
  { name: "sit_c_0", x: 2, y: 0, flip: false },
  { name: "sit_d_0", x: 24, y: 0, flip: true },
] as const;
const SEATS_FRONT = [
  { name: "sit_a_0", x: 0, y: 20, flip: false },
  { name: "sit_b_0", x: 26, y: 20, flip: true },
] as const;
const SITTER_W = 8;
const FIRE_W = 34;
const FIRE_H = 30;

type Seat = (typeof SEATS_BEHIND)[number] | (typeof SEATS_FRONT)[number];

function Sitter({ seat }: { seat: Seat }) {
  const rects = sprite(MOTION_SPRITES[seat.name], PALETTE, 0, 0);
  // Sitters face right; the ones right of the fire turn to face it.
  const transform = seat.flip
    ? `translate(${seat.x + SITTER_W} ${seat.y}) scale(-1 1)`
    : `translate(${seat.x} ${seat.y})`;
  return (
    <g transform={transform}>
      <Rects rects={rects} />
    </g>
  );
}

/** The island's campfire with four people around it. Nobody in it is anyone in particular. */
export function Campfire({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox={`0 0 ${FIRE_W} ${FIRE_H}`} shapeRendering="crispEdges" aria-hidden="true">
      <Rects rects={sprite(MOTION_SPRITES.campfire_pit, PALETTE, PIT.x, PIT.y)} />
      {SEATS_BEHIND.map((seat) => (
        <Sitter key={seat.name} seat={seat} />
      ))}
      <Rects rects={sprite(MOTION_SPRITES.campfire_flame_0, PALETTE, FLAME.x, FLAME.y)} />
      {SEATS_FRONT.map((seat) => (
        <Sitter key={seat.name} seat={seat} />
      ))}
    </svg>
  );
}
