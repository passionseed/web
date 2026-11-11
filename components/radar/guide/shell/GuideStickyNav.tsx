"use client";

/**
 * Sticky bottom bar: back arrow (previous level, or the cover from level 1)
 * and "ต่อ ▶", which reveals the next step or clears the level and moves on.
 * Buttons only: no edge swipes (Instagram uses them for "back").
 */
import Link from "next/link";
import { prevLevelKey } from "@/lib/radar-guide/story";
import { coverHref, levelHref } from "./guide-routes";
import { BackGlyph, NextGlyph } from "./glyphs";
import { useGuideShell } from "./shell-context";

export function GuideStickyNav() {
  const { slug, index, pageKey, advance, advanceLabelTh, readyToAdvance } = useGuideShell();
  const prev = pageKey ? prevLevelKey(index.pages, pageKey) : null;
  const backHref = prev ? levelHref(slug, prev) : coverHref(slug);
  return (
    <nav className="rg-nav" aria-label="ไปด่านถัดไปหรือย้อนกลับ">
      <div className="rg-nav__inner">
        <Link href={backHref} className="rg-pixel-btn rg-nav__back" aria-label={prev ? "ย้อนกลับด่านก่อนหน้า" : "กลับหน้าปก"}>
          <BackGlyph />
        </Link>
        <button
          type="button"
          className="rg-pixel-btn rg-pixel-btn--accent rg-nav__next"
          data-ready={readyToAdvance ? "true" : "false"}
          data-demo="guide-next"
          data-testid="guide-next"
          onClick={advance}
          disabled={!pageKey}
        >
          <span>{advanceLabelTh}</span>
          <NextGlyph />
        </button>
      </div>
    </nav>
  );
}
