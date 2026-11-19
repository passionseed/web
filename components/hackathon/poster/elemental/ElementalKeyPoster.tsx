import { Trirong } from "next/font/google";
import type { ReactNode } from "react";

import { EL, EL_FONT } from "./brand";
import { ELEMENTAL, thaiDateLine } from "./facts";

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

/** Serif capitals breaking out of the fire, as if it were made of text. */
function fireLetters() {
  let a = 1234567;
  const r = () => {
    a = (a * 1103515245 + 12345) % 2147483648;
    return a / 2147483648;
  };
  const word = "ELEMENTALFIRE";
  const colours = ["#f08a3c", "#f6e6c4", "#8a3a1c", "#8ecbe6", "#e2461b"];
  return Array.from({ length: 24 }, (_, i) => ({
    ch: word[i % word.length],
    x: 712 + r() * 190,
    y: 700 + r() * 200,
    size: 22 + Math.round(r() * 22),
    fill: colours[Math.floor(r() * colours.length)],
    rotate: (r() - 0.5) * 16,
  }));
}
const LETTERS = fireLetters();

function Detail({ tag, children }: { tag: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-[2px]">
      <span style={{ fontFamily: EL_FONT.mono, fontSize: 15, letterSpacing: "0.04em", color: EL.creamSoft }}>{tag}</span>
      <span style={{ fontFamily: EL_FONT.display, fontWeight: 300, fontSize: 27, lineHeight: "36px", color: EL.cream }}>{children}</span>
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
            <stop offset="1" stopColor="#0f0f0d" stopOpacity="0.7" />
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
        <rect y={1160} width={W} height={H - 1160} fill="url(#el-key-foot)" />
      </svg>

      {/* Title */}
      <div className="absolute left-[56px] top-[62px]" style={{ color: EL.ink }}>
        <h1 className="m-0" style={{ fontFamily: EL_FONT.display, lineHeight: 1.02, letterSpacing: "-0.01em" }}>
          <span className="block" style={{ fontWeight: 200, fontSize: 124 }}>
            {ELEMENTAL.edition}
          </span>
          <span className="block" style={{ fontWeight: 300, fontStyle: "italic", fontSize: 124 }}>
            Hackathon
          </span>
        </h1>
        <div className="mt-[14px] flex items-baseline gap-4" style={{ color: EL.inkSoft }}>
          <span style={{ fontFamily: EL_FONT.mono, fontSize: 15, letterSpacing: "0.16em" }}>{ELEMENTAL.series.toUpperCase()}</span>
          <span style={{ fontFamily: EL_FONT.display, fontWeight: 300, fontSize: 28 }}>{thai.join(" · ")}</span>
        </div>
      </div>

      {/* Details */}
      <div className="absolute inset-x-[52px] top-[1252px] flex justify-between border-t pt-[14px]" style={{ borderColor: "rgba(243,239,230,0.35)" }}>
        <Detail tag="[วันที่]">{thaiDateLine()}</Detail>
        <Detail tag="[ค่าสมัคร]">
          ฿{ELEMENTAL.priceBaht} / คน · มากับเพื่อน ฿{ELEMENTAL.groupPriceBaht}
        </Detail>
        <Detail tag="[สมัคร]">{ELEMENTAL.url}</Detail>
      </div>

      {/* Grain over the type too, so it sits in the same film */}
      <svg className="pointer-events-none absolute inset-0" width={W} height={H} aria-hidden="true">
        <rect width={W} height={H} filter="url(#el-key-grain)" opacity="0.1" style={{ mixBlendMode: "overlay" }} />
      </svg>
    </div>
  );
}
