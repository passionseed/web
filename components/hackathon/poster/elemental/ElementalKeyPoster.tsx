import { Trirong } from "next/font/google";
import type { ReactNode } from "react";

import { EL, EL_FONT } from "./brand";
import { ELEMENTAL, prizeTotal, thaiDateLine, thaiDayRange } from "./facts";

/**
 * Elemental Hackathon key visual, 1080x1350.
 *
 * The image is a plate built by scripts/render-elemental-plate.mjs: a calm
 * river valley poisoned by four pixel elements, spread across the frame.
 * Fire on the right bank (the hero), toxic green water on the left bank,
 * a smog over the hill, and dumped waste on the mound. This component adds
 * the letters breaking out of the fire and the type. Rules: ./brand.ts.
 */

const trirong = Trirong({
  weight: ["200", "300", "600"],
  style: ["normal", "italic"],
  subsets: ["thai", "latin"],
  variable: "--font-trirong",
});

export const W = 1080;
export const H = 1350;
const PLATES = {
  grey: "/hackathon/poster/elemental/plate-key.png",
  blue: "/hackathon/poster/elemental/plate-key-blue.png",
} as const;

/**
 * Serif capitals breaking out of each element, as if it were made of text:
 * the element's own name, in its own colours, scattered inside its area.
 */
function elementLetters(word: string, box: [number, number, number, number], colours: string[], count: number, seed: number) {
  let a = seed;
  const r = () => {
    a = (a * 1103515245 + 12345) % 2147483648;
    return a / 2147483648;
  };
  const [x0, y0, w, h] = box;
  return Array.from({ length: count }, (_, i) => ({
    ch: word[i % word.length],
    x: x0 + r() * w,
    y: y0 + r() * h,
    size: 22 + Math.round(r() * 22),
    fill: colours[Math.floor(r() * colours.length)],
    rotate: (r() - 0.5) * 16,
  }));
}
const LETTERS = [
  // Fire: in the flame.
  ...elementLetters("ELEMENTALFIRE", [712, 700, 190, 200], ["#f08a3c", "#f6e6c4", "#8a3a1c", "#8ecbe6", "#e2461b"], 24, 1234567),
  // Air: in the smog over the ridge.
  ...elementLetters("AIRAIRELEMENTAL", [200, 470, 360, 170], ["#efe7c4", "#a89155", "#5f4f33", "#d8cb9c"], 18, 7654321),
  // Earth: in the waste on the bank.
  ...elementLetters("EARTHEARTH", [100, 880, 480, 100], ["#f3efe6", "#9c4a1f", "#2b2824", "#c9c3b8"], 16, 2468135),
  // Water: in the toxic green.
  ...elementLetters("WATERWATER", [40, 1040, 380, 110], ["#e9f6d4", "#c8ee64", "#1f3d12", "#9fe22b"], 16, 1357913),
];

/**
 * One of the three facts at the bottom: a small line, the big number, a
 * small line. Three facts, three sizes, so the eye knows what leads.
 */
function Fact({ above, big, below, align = "left" }: { above?: ReactNode; big: ReactNode; below?: ReactNode; align?: "left" | "center" | "right" }) {
  return (
    <div className="flex flex-col" style={{ textAlign: align, color: EL.cream, fontFamily: EL_FONT.display }}>
      {/* Both small lines always take their space, so the three big numbers share one baseline. */}
      <span style={{ fontWeight: 300, fontSize: 24, lineHeight: "32px", color: EL.creamSoft }}>{above ?? "\u00a0"}</span>
      <span style={{ fontWeight: 300, fontSize: 58, lineHeight: "66px", letterSpacing: "-0.01em" }}>{big}</span>
      <span style={{ fontWeight: 300, fontSize: 24, lineHeight: "32px", color: EL.creamSoft }}>{below ?? "\u00a0"}</span>
    </div>
  );
}

export function ElementalKeyPoster({ id = "elemental-key", sky = "grey" }: { id?: string; sky?: keyof typeof PLATES }) {
  // The order every Thai student says them: ดิน น้ำ ลม ไฟ.
  const thai = (["earth", "water", "air", "fire"] as const).map((k) => ELEMENTAL.elements.find((e) => e.key === k)?.th ?? "");
  return (
    <div id={id} className={`${trirong.variable} relative overflow-hidden`} style={{ width: W, height: H, backgroundColor: "#2a2b26" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={PLATES[sky]} alt="" width={W} height={H} className="absolute inset-0 h-full w-full" />

      <svg className="absolute inset-0" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        <defs>
          <linearGradient id="el-key-foot" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0f0f0d" stopOpacity="0" />
            <stop offset="0.55" stopColor="#0f0f0d" stopOpacity="0.55" />
            <stop offset="1" stopColor="#0f0f0d" stopOpacity="0.85" />
          </linearGradient>
          <filter id="el-key-grain" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
        </defs>
        {LETTERS.map((l, i) => (
          <text
            key={i}
            x={l.x}
            y={l.y}
            fill={l.fill}
            fontFamily={EL_FONT.display}
            fontWeight={600}
            fontSize={l.size}
            opacity={0.95}
            transform={`rotate(${l.rotate} ${l.x} ${l.y})`}
          >
            {l.ch}
          </text>
        ))}
        <rect y={1040} width={W} height={H - 1040} fill="url(#el-key-foot)" />
      </svg>

      {/* Title lockup: series above, English title, the Thai elements as its second half */}
      <div className="absolute left-[56px] top-[46px]" style={{ color: EL.ink }}>
        {/* Co-brand lockup: The Next Decade × PassionSeed */}
        <div className="flex items-center gap-[18px]" style={{ marginLeft: 4 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hackathon/HackLogo.png" alt={ELEMENTAL.series} width={125} height={50} style={{ filter: "brightness(0)", opacity: 0.85 }} />
          <span style={{ fontFamily: EL_FONT.mono, fontSize: 20, color: EL.inkSoft }}>×</span>
          <span className="flex items-center gap-[10px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/passion-seed-logo.png" alt="" width={50} height={50} />
            <span style={{ fontFamily: EL_FONT.display, fontWeight: 400, fontSize: 28, color: EL.ink }}>PassionSeed</span>
          </span>
        </div>
        <h1 className="m-0 mt-[10px]" style={{ fontFamily: EL_FONT.display, lineHeight: 1.02, letterSpacing: "-0.01em" }}>
          <span className="block" style={{ fontWeight: 200, fontSize: 124 }}>
            {ELEMENTAL.edition}
          </span>
          <span className="block" style={{ fontWeight: 300, fontStyle: "italic", fontSize: 124 }}>
            Hackathon
          </span>
        </h1>
        <div className="mt-[8px]" style={{ fontFamily: EL_FONT.display, fontWeight: 300, fontSize: 42, lineHeight: "56px", marginLeft: 4 }}>
          {thai.join(" · ")}
        </div>
      </div>

      {/* Three facts: when, the prize, the price with the friend deal leading */}
      <div className="absolute inset-x-[56px] bottom-[44px] flex items-end justify-between">
        <Fact big={thaiDayRange()} below={`${thaiDateLine().split(" ").pop()} · ${ELEMENTAL.days} วัน`} />
        <Fact align="center" above="รางวัลรวมมูลค่า" big={`${prizeTotal()} บาท`} />
        <Fact align="right" above="มากับเพื่อน" big={`฿${ELEMENTAL.groupPriceBaht} / คน`} below={`คนเดียว ฿${ELEMENTAL.priceBaht}`} />
      </div>

      {/* Grain over the type too, so it sits in the same film */}
      <svg className="pointer-events-none absolute inset-0" width={W} height={H} aria-hidden="true">
        <rect width={W} height={H} filter="url(#el-key-grain)" opacity="0.1" style={{ mixBlendMode: "overlay" }} />
      </svg>
    </div>
  );
}
