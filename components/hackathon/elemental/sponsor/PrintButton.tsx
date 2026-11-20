"use client";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";

/** Saves the deck as a PDF through the browser's print dialog. */
export function PrintButton({ light = false }: { light?: boolean }) {
  const color = light ? EL.ink : EL.cream;
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={`border px-6 py-3 text-[14px] tracking-[0.1em] transition-colors ${light ? "hover:bg-[rgba(29,33,31,0.08)]" : "hover:bg-[rgba(243,239,230,0.12)]"}`}
      style={{ borderColor: color, color, fontFamily: EL_FONT.mono }}
    >
      [ดาวน์โหลด PDF]
    </button>
  );
}
