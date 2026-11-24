import { EL } from "./brand";

/**
 * The five element icons: 9x9 flat stepped pixel shapes, first drawn for
 * Instagram slide 2 (info/ElementalInfoPoster.tsx) and shared from here so
 * the quiz and its cards use the same ones.
 */

export type ElementIconKey = "earth" | "water" | "air" | "fire" | "aether";

export const ELEMENT_ICON_ROWS: Record<ElementIconKey, readonly string[]> = {
  earth: [".........", ".........", "....#....", "...###...", "..##.##..", ".#######.", "##.###.##", "#########", "#########"],
  // One column left of centre: flush with the left edge like the others, so it lines up with its name (Angpao, 2026-11-24: "why water position look off").
  water: ["...#.....", "...#.....", "..###....", ".#####...", "#######..", "##.####..", "#.#####..", ".#####...", "..###...."],
  air: [".........", "..####...", ".#....#..", "......#..", "######...", ".........", "#######..", ".......#.", "..####..."],
  fire: ["....#....", "...##....", "...###.#.", "..####.#.", ".#######.", ".###.###.", "###...###", "###...###", ".#######."],
  aether: ["#.....#..", "...#.....", ".......##", "..#......", "#....#...", ".........", "...#...#.", ".#.......", "......#.."],
};

/** Each element's colour on slide 2. */
export const ELEMENT_ICON_COLOR: Record<ElementIconKey, string> = {
  earth: EL.toxicRust,
  water: EL.toxicCyan,
  air: EL.toxicYellow,
  fire: EL.flame,
  aether: EL.aetherViolet,
};

/** The filled cells of an icon, as [x, y] on its 9x9 grid. */
export function iconCells(key: ElementIconKey): [number, number][] {
  return ELEMENT_ICON_ROWS[key].flatMap((row, y) => Array.from(row).flatMap((c, x): [number, number][] => (c === "#" ? [[x, y]] : [])));
}

export function Pixels({ rows, color, size }: { rows: readonly string[]; color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 9 9" shapeRendering="crispEdges" aria-hidden="true" style={{ display: "block" }}>
      {rows.flatMap((row, y) => Array.from(row).map((c, x) => (c === "#" ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={color} /> : null)))}
    </svg>
  );
}

/**
 * Aether: the same scattered pixels, but glowing and half there. Lilac and
 * violet at uneven strengths over a violet aura, so it reads as something
 * you can't quite see. `id` must be unique on the page (it names the filters).
 */
export function AetherPixels({ rows, size, id }: { rows: readonly string[]; size: number; id: string }) {
  const cells = rows.flatMap((row, y) => Array.from(row).flatMap((c, x) => (c === "#" ? [{ x, y }] : [])));
  return (
    <svg width={size} height={size} viewBox="0 0 9 9" aria-hidden="true" style={{ display: "block", overflow: "visible" }}>
      <filter id={`${id}-aura`} x="-1" y="-1" width="3" height="3">
        <feGaussianBlur stdDeviation="2.2" />
      </filter>
      <filter id={`${id}-glow`} x="-1" y="-1" width="3" height="3">
        <feGaussianBlur stdDeviation="0.9" />
      </filter>
      <rect x={-1} y={-1} width={11} height={11} fill={EL.aetherViolet} opacity={0.35} filter={`url(#${id}-aura)`} />
      <g filter={`url(#${id}-glow)`}>
        {cells.map(({ x, y }) => (
          <rect key={`g${x}-${y}`} x={x - 0.3} y={y - 0.3} width={1.6} height={1.6} fill={EL.aetherViolet} />
        ))}
      </g>
      <g shapeRendering="crispEdges">
        {cells.map(({ x, y }, i) => (
          <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={i % 3 === 0 ? EL.aetherLilac : EL.aetherViolet} opacity={[1, 0.55, 0.8, 0.4][i % 4]} />
        ))}
      </g>
    </svg>
  );
}

/** One element's icon in its own colour (or `color`), with Aether's glow. */
export function ElementIcon({ element, size, id, color }: { element: ElementIconKey; size: number; id?: string; color?: string }) {
  if (element === "aether" && !color) return <AetherPixels rows={ELEMENT_ICON_ROWS.aether} size={size} id={id ?? "aether"} />;
  return <Pixels rows={ELEMENT_ICON_ROWS[element]} color={color ?? ELEMENT_ICON_COLOR[element]} size={size} />;
}
