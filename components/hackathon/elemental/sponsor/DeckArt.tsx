/**
 * Small pixel-art icons for the sponsor deck, drawn as SVG squares so they
 * stay sharp in print and match the key visual's pixel look.
 */

const ICONS = {
  /** Understanding the problem. */
  magnifier: ["..####...", ".#....#..", "#......#.", "#......#.", "#......#.", ".#....#..", "..####...", "......##.", ".......##"],
  /** One real person. */
  person: ["...###...", "...###...", "...###...", "....#....", ".#######.", "....#....", "....#....", "...#.#...", "..#...#.."],
  /** Growing after the event. */
  sprout: [".##...##.", "####.####", ".###.###.", "...#.#...", "....#....", "....#....", "....#....", "..#####..", ".#######."],
  /** Beginners climb step by step. */
  stairs: ["........#", ".......##", "......###", ".....####", "....#####", "...######", "..#######", ".########", "#########"],
  /** Workshops. */
  board: ["#########", "#.......#", "#.##....#", "#....##.#", "#.###...#", "#.......#", "#########", "...#.#...", "..#...#.."],
  /** Self-study resources. */
  book: ["##.....##", "#.##.##.#", "#...#...#", "#.#.#.#.#", "#...#...#", "#.#.#.#.#", "#...#...#", "#########", "....#...."],
  /** A Q&A forum. */
  bubble: [".#######.", "#.......#", "#.#####.#", "#.......#", "#.###...#", "#.......#", ".###.###.", "...##....", "...#....."],
  /** Request for Winners. */
  rocket: ["....#....", "...###...", "...#.#...", "...###...", "..#####..", "..#####..", ".##.#.##.", ".#..#..#.", "....#...."],
} as const;

export type IconName = keyof typeof ICONS;

export function PixelIcon({ name, color, size = 36 }: { name: IconName; color: string; size?: number }) {
  const rows = ICONS[name];
  return (
    <svg width={size} height={size} viewBox="0 0 9 9" aria-hidden="true" shapeRendering="crispEdges" style={{ display: "block" }}>
      {rows.flatMap((row, y) => Array.from(row).map((c, x) => (c === "#" ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={color} /> : null)))}
    </svg>
  );
}

/** A right-pointing pixel arrow between steps. */
export function PixelArrow({ color, size = 18 }: { color: string; size?: number }) {
  const rows = ["..#..", "...#.", "#####", "...#.", "..#.."];
  return (
    <svg width={size} height={size} viewBox="0 0 5 5" aria-hidden="true" shapeRendering="crispEdges" style={{ display: "block" }}>
      {rows.flatMap((row, y) => Array.from(row).map((c, x) => (c === "#" ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={color} /> : null)))}
    </svg>
  );
}
