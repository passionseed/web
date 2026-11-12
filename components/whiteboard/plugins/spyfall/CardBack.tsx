import { memo } from "react";

import { GrainBloom } from "../../chrome/Grain";

/** A small seeded random source (mulberry32 over a string hash): the same seed draws the same card. */
function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The stepped line across the bloom, in the card's 350 x 168 space. It always
 * runs from (98, 106) to (238, 60), where the periwinkle lead-in and lead-out
 * meet it; the steps in between come from the seed.
 */
function steppedLine(seed: string) {
  const rand = seeded(seed);
  const steps = 5 + Math.floor(rand() * 2);
  const run = (238 - 98) / (steps + 1);
  let x = 98;
  let y = 106;
  let d = `M${x} ${y}`;
  const corners: { x: number; y: number }[] = [];
  for (let i = 0; i < steps; i++) {
    x = Math.round(98 + run * (i + 1) + (rand() - 0.5) * run * 0.5);
    d += `H${x}`;
    // Mostly climbing, with the odd step back down.
    const target = 106 - ((106 - 60) * (i + 1)) / steps;
    y = i === steps - 1 ? 60 : Math.round(Math.min(118, Math.max(44, target + (rand() - 0.4) * 34)));
    d += `V${y}`;
    corners.push({ x, y });
  }
  d += "H238";
  const specks = Array.from({ length: 6 }, () => ({ x: Math.round(112 + rand() * 116), y: Math.round(38 + rand() * 84) }));
  return { d, corners, specks };
}

/**
 * Spyfall's face-down card: the grain bloom as a small data poster, with
 * dashed guides, tiny axis numerals and a white stepped line. Purely
 * decorative: nothing on it says anything about the card. Each round and seat
 * draws a slightly different line.
 */
export const CardBack = memo(function CardBack({ seed }: { seed: string }) {
  const { d, corners, specks } = steppedLine(seed);
  return (
    <>
      <svg className="wb-spy-art" viewBox="0 0 350 168" aria-hidden focusable="false">
        <g style={{ stroke: "var(--wb-peri)" }} strokeWidth={1} fill="none">
          <path d="M14 42H306M14 84H306M14 126H306" strokeDasharray="2 4" />
          <path d="M260 14V154" strokeDasharray="2 4" />
          <path d="M22 132H56V118H82V106H98" />
          <path d="M238 60H276V44H300V52H318" />
        </g>
        <g textAnchor="end">
          <text x="338" y="45">2.6</text>
          <text x="338" y="87">1.50</text>
          <text x="338" y="129">0.20</text>
        </g>
        <text x="14" y="158">01</text>
        <text x="255" y="164">{String(corners.length).padStart(2, "0")}</text>
      </svg>
      {/* At its natural 350 x 168, centred like the two line layers: cropped by the card, never scaled. */}
      <GrainBloom variant="mix" fixed />
      <svg className="wb-spy-art" viewBox="0 0 350 168" aria-hidden focusable="false">
        <path d={d} fill="none" stroke="#fff" strokeWidth={1.25} strokeLinejoin="miter" />
        <g fill="#fff">
          {corners.map((c, i) => (
            <circle key={i} cx={c.x} cy={c.y} r={1.9} />
          ))}
        </g>
        <g fill="#fff" opacity={0.9}>
          {specks.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={1} />
          ))}
        </g>
      </svg>
    </>
  );
});
