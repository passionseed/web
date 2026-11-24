import { EL } from "@/components/hackathon/poster/elemental/brand";

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

/**
 * Where a sponsor's logo shows up, as three pixel drawings: the poster
 * before the event, the slides during it, the report after it. The coloured
 * block in each is the logo, in the three package colours.
 */
const BENEFIT_POSTER = [
  "################",
  "#..............#",
  "#..........y...#",
  "#.........yy...#",
  "#.........oy...#",
  "#........ooo...#",
  "#........ooo...#",
  "#....s.........#",
  "#...sss........#",
  "#..sssss...s...#",
  "#.sssssss.sss..#",
  "#ssssssssssssss#",
  "#..............#",
  "#.#######......#",
  "#.#####........#",
  "#..............#",
  "#.oooooooooooo.#",
  "#.oooooooooooo.#",
  "#.oooooooooooo.#",
  "#..............#",
  "################",
];
const BENEFIT_SCREEN = [
  "##########################",
  "#........................#",
  "#.########...............#",
  "#.######.................#",
  "#........................#",
  "#.############...gggggg..#",
  "#.##########.....gggggg..#",
  "#.########.......gggggg..#",
  "#................gggggg..#",
  "#........................#",
  "##########################",
  "...........####...........",
  "...........####...........",
  "........##########........",
];
const BENEFIT_REPORT = [
  "################",
  "#..............#",
  "#.##########...#",
  "#.#######......#",
  "#..............#",
  "#.......#......#",
  "#....#..#..#...#",
  "#.#..#..#..#...#",
  "#.#..#..#..#...#",
  "#.##########...#",
  "#..............#",
  "#.cccccc....yy.#",
  "#.cccccc...yyyy#",
  "#.cccccc....yy.#",
  "#..............#",
  "################",
];
const BENEFIT_ARROW = ["..#..", "...#.", "#####", "...#.", "..#.."];

export function BenefitsArt({ cell = 5 }: { cell?: number }) {
  const fill: Record<string, string> = { "#": EL.ink, s: "rgba(29,33,31,0.38)", o: EL.flame, y: EL.toxicYellow, g: EL.toxicGreen, c: EL.toxicCyan, a: "rgba(29,33,31,0.5)" };
  const arrow = BENEFIT_ARROW.map((r) => r.replace(/#/g, "a"));
  // Each drawing stands on the same baseline, with an arrow between them.
  const parts: [readonly string[], number][] = [[BENEFIT_POSTER, 0], [arrow, 19], [BENEFIT_SCREEN, 27], [arrow, 56], [BENEFIT_REPORT, 64]];
  const height = BENEFIT_POSTER.length;
  const width = 80;
  return (
    <svg width={width * cell} height={height * cell} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" shapeRendering="crispEdges" style={{ display: "block" }}>
      {parts.flatMap(([rows, x0], p) => {
        // Arrows sit at mid height; everything else stands on the bottom line.
        const y0 = rows.length === 5 ? Math.round((height - 5) / 2) : height - rows.length;
        return rows.flatMap((row, y) => Array.from(row).map((c, x) => (fill[c] ? <rect key={`${p}-${x}-${y}`} x={x0 + x} y={y0 + y} width={1} height={1} fill={fill[c]} /> : null)));
      })}
    </svg>
  );
}
