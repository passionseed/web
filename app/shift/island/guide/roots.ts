/**
 * Roots for the guide's picture, as an ASCII grid in the island's sprite
 * format (one char per native pixel, "." transparent, PALETTE keys only).
 * Drawn from straight branches so each level adds to the one before it.
 * Decoration for the guide only: the island itself draws roots in its own
 * renderer.
 */

/** The ground under a 32 x 40 tree sprite, in native pixels. */
export const ROOTS_W = 32;
export const ROOTS_H = 14;

/** Soil, root and root tip keys from the island PALETTE. */
const ROOT = "k";
const TIP = "i";

type Branch = readonly [x0: number, y0: number, x1: number, y1: number];

/** Branches by level; a level draws its own and every level below it. */
const BRANCHES: readonly (readonly Branch[])[] = [
  [
    [15, 0, 15, 4],
    [16, 0, 16, 4],
    [15, 2, 12, 4],
    [16, 2, 19, 4],
  ],
  [
    [15, 4, 15, 8],
    [16, 4, 16, 8],
    [15, 5, 9, 8],
    [16, 5, 22, 8],
    [12, 4, 10, 5],
    [19, 4, 21, 5],
  ],
  [
    [15, 8, 15, 12],
    [16, 8, 16, 12],
    [15, 9, 5, 12],
    [16, 9, 26, 12],
    [9, 8, 6, 9],
    [22, 8, 25, 9],
    [15, 11, 12, 13],
    [16, 11, 19, 13],
  ],
];

export const ROOT_LEVELS = BRANCHES.length;

function line(grid: string[][], [x0, y0, x1, y1]: Branch) {
  // Bresenham: every pixel on the way, so a branch never has gaps.
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    if (y >= 0 && y < ROOTS_H && x >= 0 && x < ROOTS_W) grid[y][x] = ROOT;
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

/** The roots at `level` (1..ROOT_LEVELS; out-of-range levels clamp), tips lit in a lighter colour. */
export function rootsGrid(level: number): string[] {
  const grid = Array.from({ length: ROOTS_H }, () => Array<string>(ROOTS_W).fill("."));
  const upTo = Math.min(Math.max(Math.trunc(level), 1), ROOT_LEVELS);
  const drawn = BRANCHES.slice(0, upTo).flat();
  for (const branch of drawn) line(grid, branch);
  // Light only the outer ends of the deepest level's side branches.
  for (const [, , x1, y1] of BRANCHES[upTo - 1]) {
    if (x1 !== 15 && x1 !== 16) grid[y1][x1] = TIP;
  }
  return grid.map((row) => row.join(""));
}
