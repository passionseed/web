import { Trirong } from "next/font/google";

import { EL, EL_FONT } from "../brand";
import { ELEMENTAL, prizeTotal, thaiDayRange } from "../facts";

/**
 * One poster per element (1080x1350): the element's own calm photo,
 * corrupted by its pollution in pixels (scripts/render-elemental-element.mjs),
 * with the element's name, what it covers, and the hackathon's key facts.
 * Same rules as the key visual (../brand.ts); facts from ../facts.ts only.
 */

const trirong = Trirong({
  weight: ["200", "300", "400"],
  style: ["normal", "italic"],
  subsets: ["thai", "latin"],
  variable: "--font-trirong",
});

export const W = 1080;
export const H = 1350;

export const ELEMENT_KEYS = ["water", "earth", "air", "fire", "aether"] as const;
export type ElementKey = (typeof ELEMENT_KEYS)[number];

/** Per poster: its Thai name, what it covers (as on slide 2), and whether the sky behind the type is light. */
const ELEMENT: Record<ElementKey, { th: string; line: string; lightSky: boolean; accent: string }> = {
  water: { th: "น้ำ", line: "น้ำเสีย สารเคมีในน้ำ", lightSky: false, accent: EL.toxicGreen },
  earth: { th: "ดิน", line: "ขยะและสารพิษ", lightSky: true, accent: EL.toxicRust },
  air: { th: "ลม", line: "ฝุ่น PM2.5 ควันพิษ", lightSky: false, accent: EL.toxicYellow },
  fire: { th: "ไฟ", line: "อัคคีภัย การเผา", lightSky: true, accent: EL.flame },
  // Slide 2 calls Aether อีเธอร์ (Angpao, 2026-11-20).
  aether: { th: "อีเธอร์", line: "ภัยที่มองไม่เห็น", lightSky: false, accent: EL.aetherViolet },
};

export function ElementalElementPoster({ element, id = `elemental-${element}` }: { element: ElementKey; id?: string }) {
  const e = ELEMENT[element];
  const en = ELEMENTAL.elements.find((x) => x.key === element)?.en ?? element;
  const ink = e.lightSky ? EL.ink : EL.cream;
  const soft = e.lightSky ? EL.inkSoft : EL.creamSoft;
  return (
    <div id={id} className={`${trirong.variable} relative overflow-hidden`} style={{ width: W, height: H, backgroundColor: EL.char }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/hackathon/poster/elemental/elements/plate-${element}.png`} alt="" width={W} height={H} className="absolute inset-0 h-full w-full" />
      {/* A dark foot so the facts read on any ground. */}
      <div className="absolute inset-x-0 bottom-0" style={{ height: 300, background: "linear-gradient(180deg, rgba(15,15,13,0) 0%, rgba(15,15,13,0.6) 55%, rgba(15,15,13,0.85) 100%)" }} />

      <div className="absolute left-[56px] right-[56px] top-[48px]" style={{ color: ink, fontFamily: EL_FONT.display }}>
        <div className="flex items-center gap-[16px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hackathon/HackLogo.png" alt={ELEMENTAL.series} width={110} height={44} style={{ filter: e.lightSky ? "brightness(0)" : "brightness(0) invert(1)", opacity: 0.85 }} />
          <span style={{ fontFamily: EL_FONT.mono, fontSize: 18, color: soft }}>×</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/passion-seed-logo.png" alt="" width={44} height={44} />
          <span style={{ fontWeight: 400, fontSize: 25 }}>PassionSeed</span>
        </div>
        <p className="m-0 mt-[26px]" style={{ fontFamily: EL_FONT.mono, fontSize: 22, letterSpacing: "0.08em", color: soft }}>
          {ELEMENTAL.edition.toUpperCase()} HACKATHON
        </p>
        {/* Thai marks stack high above the letters (น้ำ, อีเธอร์), so the name gets room above it. */}
        <div className="mt-[22px] flex items-baseline gap-[22px]">
          <span style={{ fontWeight: 300, fontSize: element === "aether" ? 150 : 200, lineHeight: 1.3 }}>{e.th}</span>
          <span style={{ fontWeight: 200, fontStyle: "italic", fontSize: 72, color: soft }}>{en}</span>
        </div>
        <p className="m-0 mt-[4px] flex items-center gap-[14px]" style={{ fontWeight: 300, fontSize: 40 }}>
          <span aria-hidden="true" style={{ display: "inline-block", width: 16, height: 16, background: e.accent }} />
          {e.line}
        </p>
      </div>

      <div className="absolute inset-x-[56px] bottom-[44px] flex items-end justify-between" style={{ color: EL.cream, fontFamily: EL_FONT.display }}>
        <div>
          <p className="m-0" style={{ fontWeight: 300, fontSize: 24, color: EL.creamSoft }}>แข่งขันแก้ปัญหาสภาพแวดล้อม · ออนไลน์</p>
          <p className="m-0" style={{ fontWeight: 300, fontSize: 52, lineHeight: 1.2 }}>{thaiDayRange()}</p>
        </div>
        <div className="text-right">
          <p className="m-0" style={{ fontWeight: 300, fontSize: 24, color: EL.creamSoft }}>รางวัลรวมมูลค่า</p>
          <p className="m-0" style={{ fontWeight: 300, fontSize: 52, lineHeight: 1.2 }}>{prizeTotal()} บาท</p>
        </div>
      </div>
    </div>
  );
}
