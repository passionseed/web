"use client";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";

/** Saves the deck as a PDF through the browser's print dialog. */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="border px-6 py-3 text-[14px] tracking-[0.1em] transition-colors hover:bg-[rgba(243,239,230,0.12)]"
      style={{ borderColor: EL.cream, color: EL.cream, fontFamily: EL_FONT.mono }}
    >
      [ดาวน์โหลด PDF]
    </button>
  );
}
