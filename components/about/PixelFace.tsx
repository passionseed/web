/**
 * Tiny riso pixel people for the toys. Drawn, not emoji: an 8x8 grid where
 * h is hair (the ink), f skin, e eyes, m mouth, s shirt.
 */
const FACES = [
  ["..hhhh..", ".hhhhhh.", "hhffffhh", "hfeffefh", "hffffffh", ".ffmmff.", "..ffff..", ".ssssss."],
  ["........", "..hhhh..", ".hffffh.", ".feffef.", ".ffffff.", ".ffmmff.", "..ffff..", ".ssssss."],
  [".hhhhhh.", "hhhhhhhh", "hhffffhh", "hfeffefh", "hffffffh", "hffmmffh", "h.ffff.h", ".ssssss."],
  ["..h..h..", ".hhhhhh.", ".hffffh.", ".feffef.", ".ffffff.", "..fmmf..", "..ffff..", ".ssssss."],
] as const;

const SKIN = "#f1c9a0";
const DARK = "#17151c";
const MOUTH = "#c2410c";

export function PixelFace({
  ink,
  shirt = "#f2ead9",
  variant = 0,
  size = 40,
}: {
  ink: string;
  shirt?: string;
  variant?: number;
  size?: number;
}) {
  const rows = FACES[variant % FACES.length];
  const color: Record<string, string> = { h: ink, f: SKIN, e: DARK, m: MOUTH, s: shirt };
  return (
    <svg
      viewBox="0 0 8 8"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      aria-hidden="true"
      className="shrink-0"
    >
      {rows.flatMap((row, y) =>
        [...row].map((cell, x) =>
          cell === "." ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={color[cell]} />,
        ),
      )}
    </svg>
  );
}
