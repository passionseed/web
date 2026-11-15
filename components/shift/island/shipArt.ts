/**
 * The ship that waits offshore behind the invite's letter (ShoreBackdrop) and
 * carries the student to the island in the voyage cutscene. One drawing, two
 * renderers: SVG rects on the beach, canvas runs at sea.
 *
 * 40x26, bow to the left, lit from the sun setting to its right.
 * h: hull, H: its lit rail, d: masts and rigging, s: sail, S: sail in the
 * sun, m: mast behind a sail, f: flag, l: lit window, p: gun port,
 * w: a glint on the water below.
 */
export const SHIP = [
  ".............dff........................",
  ".............df.........................",
  "........ddddddddddd.....................",
  ".........ssssmssSS.....dff..............",
  ".........ssssmssSS.....d................",
  ".........ssssmssSS.ddddddddd............",
  "........sssssmsssSS.sssmsSS.............",
  "........sssssmsssSS.sssmsSS.............",
  ".............d.....ssssmssSS............",
  ".......ddddddddddddssssmssSS............",
  "........sssssmsssSS....d................",
  "........sssssmsssSddddddddddd...........",
  "........sssssmsssSSssssmssSS............",
  ".......ssssssmssssSssssmssSS............",
  ".......ssssssmssssSssssmssSS........l...",
  ".......ssssssmsssssssssmsssSS.......d...",
  "d............d....sssssmsssSSHHHHHHH....",
  ".dd..........d.........d.....hhlhlhh....",
  "...dd........d.........d.....hhhhhhh....",
  "....HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH....",
  "....hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh....",
  ".....hhphhhphhhphhhphhhphhhphhhphhhh....",
  "......hhhhhhhhhhhhhhhhhhhhhhhhhhhhh.....",
  "........hhhhhhhhhhhhhhhhhhhhhhhhhh......",
  "..........hhhhhhhhhhhhhhhhhhhhhh........",
  "........w..w..w..w..w..w..w..w..........",
] as const;

export const SHIP_W = SHIP[0].length;
export const SHIP_H = SHIP.length;
/** The row the hull meets the water: the glint row sits just under it. */
export const SHIP_WATERLINE = SHIP_H - 1;

/** The ship's colours for the canvas; the same values as islandInvite.module.css's .ship* rules. */
export const SHIP_COLORS: Readonly<Record<string, string>> = {
  h: "#2a1a2e",
  H: "#5c343c",
  d: "#22162a",
  s: "#c9aa96",
  S: "#ffd6a0",
  m: "#78596a",
  f: "#b8322f",
  l: "#ffc96b",
  p: "#1a101e",
  w: "rgba(246, 239, 226, 0.35)",
};

export interface PixelRun {
  x: number;
  y: number;
  w: number;
  key: string;
}

/** One run per stretch of the same character in a row; "." is transparent. */
export function pixelRuns(grid: readonly string[]): PixelRun[] {
  return grid.flatMap((row, y) => {
    const runs: PixelRun[] = [];
    let x = 0;
    while (x < row.length) {
      const key = row[x];
      let end = x + 1;
      while (end < row.length && row[end] === key) end++;
      if (key !== ".") runs.push({ x, y, w: end - x, key });
      x = end;
    }
    return runs;
  });
}
