import { Trirong } from "next/font/google";

import { EL, EL_FONT } from "../brand";
import { ELEMENTAL } from "../facts";

/**
 * One poster per element (1080x1350): the element's own calm photo,
 * corrupted by its pollution in pixels (scripts/render-elemental-element.mjs),
 * with the element's name and, in the middle, the problems it covers
 * (Angpao, 2026-11-21: the problem instead of the event facts).
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

/** Per poster: its Thai name, whether the sky behind the type is light, and its colour. */
const ELEMENT: Record<ElementKey, { th: string; lightSky: boolean; accent: string }> = {
  water: { th: "น้ำ", lightSky: false, accent: EL.toxicGreen },
  earth: { th: "ดิน", lightSky: true, accent: EL.toxicRust },
  air: { th: "ลม", lightSky: false, accent: EL.toxicYellow },
  fire: { th: "ไฟ", lightSky: true, accent: EL.flame },
  // Slide 2 calls Aether อีเธอร์ (Angpao, 2026-11-20).
  aether: { th: "อีเธอร์", lightSky: false, accent: EL.aetherViolet },
};

export function ElementalElementPoster({ element, id = `elemental-${element}` }: { element: ElementKey; id?: string }) {
  const e = ELEMENT[element];
  const facts = ELEMENTAL.elements.find((x) => x.key === element);
  const en = facts?.en ?? element;
  const ink = e.lightSky ? EL.ink : EL.cream;
  const soft = e.lightSky ? EL.inkSoft : EL.creamSoft;
  return (
    <div id={id} className={`${trirong.variable} relative overflow-hidden`} style={{ width: W, height: H, backgroundColor: EL.char }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/hackathon/poster/elemental/elements/plate-${element}.png`} alt="" width={W} height={H} className="absolute inset-0 h-full w-full" />

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
        {/* The problem, in the middle of the poster, before the picture shows it. */}
        <div className="mt-[18px]" style={{ maxWidth: 640 }}>
          <p className="m-0 flex items-center gap-[14px]" style={{ fontWeight: 400, fontSize: 44, lineHeight: 1.35 }}>
            <span aria-hidden="true" style={{ display: "inline-block", width: 18, height: 18, background: e.accent, flex: "none" }} />
            {facts?.problem}
          </p>
          <p className="m-0 mt-[8px]" style={{ fontWeight: 300, fontSize: 30, lineHeight: 1.5, color: soft }}>
            {facts?.examples}
          </p>
        </div>
      </div>
    </div>
  );
}
