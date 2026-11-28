import { Doto, Trirong } from "next/font/google";

import { ELEMENTAL } from "../facts";

/**
 * Elemental quad: four square tiles, one element each. Side by side they
 * make one circle, split by paper-white gutters. Each tile carries a
 * quarter of the circle, the title in its outer corner (mirrored on the
 * top row, so the four corners read outward from the centre), and a thin
 * info rule. The art is built by scripts/render-elemental-quad.mjs.
 */

const doto = Doto({ weight: ["700", "800"], subsets: ["latin"], variable: "--font-doto" });
const trirong = Trirong({ weight: ["300"], subsets: ["thai", "latin"], variable: "--font-trirong" });

export const TILE = 1080;
const PAPER = "#f3f0e9";
const INK = "#26231f";
const GUTTER = 48;

type Key = "air" | "fire" | "water" | "earth";
const POSITION: Record<Key, { top: boolean; left: boolean }> = {
  air: { top: true, left: true },
  fire: { top: true, left: false },
  water: { top: false, left: true },
  earth: { top: false, left: false },
};
export const QUAD_KEYS: Key[] = ["air", "fire", "water", "earth"];

function element(key: Key) {
  const e = ELEMENTAL.elements.find((x) => x.key === key);
  if (!e) throw new Error(`Unknown element ${key}`);
  return e;
}

/** "4–12.12.2026". */
function shortDates(): string {
  const [, , d1] = ELEMENTAL.startDate.split("-").map(Number);
  const [y, m, d2] = ELEMENTAL.endDate.split("-").map(Number);
  return `${d1}–${d2}.${m}.${y}`;
}

function InfoRule({ k, top }: { k: Key; top: boolean }) {
  const e = element(k);
  return (
    <div
      className="absolute inset-x-[64px] flex items-center justify-between"
      style={{
        top: top ? 52 : undefined,
        bottom: top ? undefined : 52,
        height: 44,
        borderTop: `1.5px solid ${INK}`,
        borderBottom: `1.5px solid ${INK}`,
        color: INK,
        fontFamily: "var(--font-space-mono), ui-monospace, monospace",
        fontSize: 17,
        letterSpacing: "0.06em",
      }}
    >
      <span>THE NEXT DECADE</span>
      <span>{shortDates()}</span>
      <span className="flex items-baseline gap-2">
        {e.en.toUpperCase()}
        <span style={{ fontFamily: "var(--font-trirong), serif", fontSize: 21, letterSpacing: 0 }}>{e.th}</span>
      </span>
    </div>
  );
}

export function ElementalQuadTile({ k, id }: { k: Key; id?: string }) {
  const { top, left } = POSITION[k];
  const lines = top ? ["HACKATHON", "ELEMENTAL"] : ["ELEMENTAL", "HACKATHON"];
  return (
    <div
      id={id}
      className={`${doto.variable} ${trirong.variable} relative overflow-hidden`}
      style={{ width: TILE, height: TILE, backgroundColor: PAPER }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/hackathon/poster/elemental/quad/${k}.png`} alt="" width={TILE} height={TILE} className="absolute inset-0" style={{ imageRendering: "pixelated" }} />
      <InfoRule k={k} top={top} />
      <h2
        className="absolute m-0"
        style={{
          top: top ? 116 : undefined,
          bottom: top ? undefined : 116,
          left: left ? 60 : undefined,
          right: left ? undefined : 60,
          textAlign: left ? "left" : "right",
          fontFamily: "var(--font-doto), monospace",
          fontWeight: 800,
          fontSize: 88,
          lineHeight: 0.98,
          letterSpacing: "-0.02em",
          color: INK,
        }}
      >
        {lines.map((l) => (
          <span key={l} className="block">
            {l}
          </span>
        ))}
      </h2>
      <svg className="pointer-events-none absolute inset-0" width={TILE} height={TILE} aria-hidden="true">
        <filter id={`${id ?? k}-paper`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width={TILE} height={TILE} filter={`url(#${id ?? k}-paper)`} opacity="0.09" style={{ mixBlendMode: "multiply" }} />
      </svg>
    </div>
  );
}

export const SHEET = TILE * 2 + GUTTER * 3;

/** All four tiles together: one circle on paper-white, no grey between. */
export function ElementalQuadSheet({ id = "elemental-quad" }: { id?: string }) {
  return (
    <div id={id} className="grid" style={{ width: SHEET, height: SHEET, backgroundColor: PAPER, padding: GUTTER, gap: GUTTER, gridTemplateColumns: `${TILE}px ${TILE}px` }}>
      {QUAD_KEYS.map((k) => (
        <ElementalQuadTile key={k} k={k} id={`${id}-${k}`} />
      ))}
    </div>
  );
}
