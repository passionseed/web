import { Doto, Trirong } from "next/font/google";
import type { ReactNode } from "react";

import { ELEMENTAL, thaiDateLine } from "../facts";

/**
 * Elemental Hackathon A4 poster (1240x1754, A4 at 150 dpi).
 *
 * One circle split into four by white gutters, each quarter a pixel picture
 * of a real element: air (clouds over smog), fire, water (a toxic green
 * surface) and earth (dry, cracked soil). Each element's name sits in its
 * corner around the circle. Title at the top, details at the bottom.
 * The circle is built by scripts/render-elemental-a4.mjs.
 */

const doto = Doto({ weight: ["700", "900"], subsets: ["latin"], variable: "--font-doto" });
const trirong = Trirong({ weight: ["300", "400"], subsets: ["thai", "latin"], variable: "--font-trirong" });

export const A4_W = 1240;
export const A4_H = 1754;
const PAPER = "#0d0d0c";
const INK = "#f3f0e8";
const SOFT = "rgba(243,240,232,0.6)";
const MONO = "var(--font-space-mono), ui-monospace, monospace";
const DOTO = "var(--font-doto), monospace";
const SERIF = "var(--font-trirong), serif";

const CIRCLE = 960;
const CIRCLE_TOP = 424;
const CIRCLE_LEFT = (A4_W - CIRCLE) / 2;

function el(key: "air" | "fire" | "water" | "earth") {
  const e = ELEMENTAL.elements.find((x) => x.key === key);
  if (!e) throw new Error(`Unknown element ${key}`);
  return e;
}

/** An element's name in its corner around the circle. */
function Corner({ k, top, left }: { k: "air" | "fire" | "water" | "earth"; top: boolean; left: boolean }) {
  const e = el(k);
  return (
    <div
      className="absolute flex flex-col"
      style={{
        top: top ? CIRCLE_TOP - 4 : undefined,
        bottom: top ? undefined : A4_H - (CIRCLE_TOP + CIRCLE) - 4,
        left: left ? 72 : undefined,
        right: left ? undefined : 72,
        alignItems: left ? "flex-start" : "flex-end",
        flexDirection: top ? "column" : "column-reverse",
        color: INK,
      }}
    >
      <span style={{ fontFamily: DOTO, fontWeight: 900, fontSize: 58, lineHeight: 1 }}>{e.en.toUpperCase()}</span>
      <span style={{ fontFamily: SERIF, fontWeight: 300, fontSize: 34, lineHeight: "48px" }}>{e.th}</span>
    </div>
  );
}

function Rule({ y, children }: { y: number; children: ReactNode }) {
  return (
    <div
      className="absolute inset-x-[72px] flex items-center justify-between"
      style={{ top: y, height: 46, borderTop: `1.5px solid ${INK}`, borderBottom: `1.5px solid ${INK}`, color: INK, fontFamily: MONO, fontSize: 18, letterSpacing: "0.08em" }}
    >
      {children}
    </div>
  );
}

function Info({ tag, children }: { tag: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-[4px]">
      <span style={{ fontFamily: MONO, fontSize: 16, letterSpacing: "0.06em", color: SOFT }}>{tag}</span>
      <span style={{ fontFamily: SERIF, fontWeight: 400, fontSize: 26, lineHeight: "36px", color: INK }}>{children}</span>
    </div>
  );
}

export function ElementalA4Poster({ id = "elemental-a4" }: { id?: string }) {
  const [, , d1] = ELEMENTAL.startDate.split("-").map(Number);
  const [y, m, d2] = ELEMENTAL.endDate.split("-").map(Number);
  return (
    <div id={id} className={`${doto.variable} ${trirong.variable} relative overflow-hidden`} style={{ width: A4_W, height: A4_H, backgroundColor: PAPER }}>
      <Rule y={64}>
        <span>{ELEMENTAL.series.toUpperCase()}</span>
        <span>
          {d1}–{d2}.{m}.{y}
        </span>
        <span>PASSIONSEED</span>
      </Rule>

      {/* Title */}
      <h1 className="absolute inset-x-0 top-[140px] m-0 text-center" style={{ fontFamily: DOTO, fontWeight: 900, fontSize: 132, lineHeight: 1, letterSpacing: "-0.02em", color: INK }}>
        <span className="block">{ELEMENTAL.edition.toUpperCase()}</span>
        <span className="block">HACKATHON</span>
      </h1>

      {/* The four elements */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/hackathon/poster/elemental/a4/circle.png"
        alt=""
        width={CIRCLE}
        height={CIRCLE}
        className="absolute"
        style={{ top: CIRCLE_TOP, left: CIRCLE_LEFT, imageRendering: "pixelated" }}
      />
      <Corner k="air" top left />
      <Corner k="fire" top left={false} />
      <Corner k="water" top={false} left />
      <Corner k="earth" top={false} left={false} />

      {/* Details */}
      <div className="absolute inset-x-[72px] top-[1424px] grid grid-cols-[1fr_1fr_1.15fr] gap-x-8 gap-y-5 border-t pt-6" style={{ borderColor: INK, borderTopWidth: 1.5 }}>
        <Info tag="[วันที่]">
          {thaiDateLine()} · {ELEMENTAL.days} วัน
        </Info>
        <Info tag="[ค่าสมัคร]">
          ฿{ELEMENTAL.priceBaht} / คน
          <br />
          มากับเพื่อน ฿{ELEMENTAL.groupPriceBaht} / คน
        </Info>
        <Info tag="[สมัคร]">{ELEMENTAL.url}</Info>
        <Info tag="[ธีม]">{ELEMENTAL.theme}</Info>
        <Info tag="[โจทย์]">ดิน น้ำ ลม ไฟ และธาตุที่ 5</Info>
        <Info tag="[จัดโดย]">PassionSeed · {ELEMENTAL.series}</Info>
      </div>

      <svg className="pointer-events-none absolute inset-0" width={A4_W} height={A4_H} aria-hidden="true">
        <filter id={`${id}-paper`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width={A4_W} height={A4_H} filter={`url(#${id}-paper)`} opacity="0.07" style={{ mixBlendMode: "screen" }} />
      </svg>
    </div>
  );
}
