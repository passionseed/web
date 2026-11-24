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
  /** Included in a package. */
  check: [".........", "........#", ".......##", "......##.", "#....##..", "##..##...", ".####....", "..##.....", "........."],
  /** Request for Winners. */
  rocket: ["....#....", "...###...", "...#.#...", "...###...", "..#####..", "..#####..", ".##.#.##.", ".#..#..#.", "....#...."],
  /** Teams, followers. */
  people: [".##...##.", ".##...##.", ".........", "####.####", "####.####", "####.####", ".##...##.", ".##...##.", ".##...##."],
  /** Months of work. */
  calendar: [".#.....#.", "#########", "#########", "#.......#", "#.#.#.#.#", "#.......#", "#.#.#.#.#", "#.......#", "#########"],
  /** The gallery of projects. */
  frame: ["#########", "#.......#", "#.##....#", "#.##....#", "#.......#", "#.....#.#", "#..#.####", "#.#######", "#########"],
  /** Someone to listen (KOKORO). */
  heart: [".##...##.", "####.####", "#########", "#########", "#########", ".#######.", "..#####..", "...###...", "....#...."],
  /** Eyes on a screen (Pipo Care); accounts that saw a post. */
  eye: [".........", "..#####..", ".#.....#.", "#..###..#", "#..###..#", "#..###..#", ".#.....#.", "..#####..", "........."],
  /** Exercise (FitFiew). */
  dumbbell: [".........", ".#.....#.", "##.....##", "##.....##", "#########", "##.....##", "##.....##", ".#.....#.", "........."],
  /** Food in the fridge (FreshTrack). */
  fridge: [".#######.", ".#.....#.", ".#.#...#.", ".#.....#.", ".#######.", ".#.#...#.", ".#.#...#.", ".#.....#.", ".#######."],
  /** Older people at home (Aun Jai Wai Kao). */
  home: ["....#....", "...###...", "..#####..", ".#######.", "#########", ".#######.", ".###.###.", ".###.###.", ".###.###."],
  /** Blooming again after burnout (WeBloom). */
  flower: ["...###...", ".###.###.", ".##...##.", ".###.###.", "...###...", "....#....", ".##.#.##.", "..#####..", "....#...."],
  /** Promotion before the event. */
  megaphone: [".......##", ".....####", "#########", "#########", "#########", ".....####", ".##....##", ".##......", "........."],
  /** Views of posts and clips. */
  play: ["#########", "#.......#", "#..#....#", "#..##...#", "#..###..#", "#..##...#", "#..#....#", "#.......#", "#########"],
  /** The report after the event. */
  chart: [".........", "......##.", "......##.", "...##.##.", "...##.##.", "##.##.##.", "##.##.##.", "##.##.##.", "#########"],
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
