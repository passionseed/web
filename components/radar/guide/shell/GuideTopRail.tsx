"use client";

/**
 * Sticky game header: level-map button, "LV 3/5" with the minutes left, and
 * the XP bar (with a short "+50 XP" pop when XP is gained).
 */
import { XpBar } from "@/components/radar/guide/story";
import { minutesLeft } from "@/lib/radar-guide/story";
import { positionInTier } from "@/lib/radar-guide/tiers";
import { levelLabel, minutesLeftLabel } from "./guide-format";
import { MapGlyph } from "./glyphs";
import { useGuideShell } from "./shell-context";

export interface GuideTopRailProps {
  /** XP just gained, shown briefly next to the bar. */
  xpPop: number | null;
  xpPopId: number;
}

export function GuideTopRail({ xpPop, xpPopId }: GuideTopRailProps) {
  const { index, page, xp, openMap } = useGuideShell();
  // "LV 3/5" counts within the page's own Level (Level 1 is a run of its own).
  const position = page ? positionInTier(index.pages, page.key) : null;
  return (
    <header className="rg-rail" data-testid="guide-top-rail">
      <div className="rg-rail__inner">
        <button type="button" className="rg-pixel-btn rg-rail__map" onClick={openMap} aria-label="เปิดแผนที่ด่าน">
          <MapGlyph />
        </button>
        <div className="rg-rail__lv">
          {page ? (
            <>
              <span className="rg-rail__lvnum">{position?.tier === 2 ? "L2 · " : ""}
                {levelLabel(position?.index ?? page.order, position?.total ?? index.pages.length)}</span>
              <span className="rg-rail__left" data-testid="guide-minutes-left">
                {minutesLeftLabel(minutesLeft(index.pages, page.key))}
              </span>
            </>
          ) : (
            <span className="rg-rail__lvnum">{index.nameTh}</span>
          )}
        </div>
        <div className="rg-rail__xp">
          <XpBar xp={xp.xp} max={xp.max} />
          {xpPop ? (
            <span key={xpPopId} className="rg-rail__xppop" aria-live="polite">
              +{xpPop} XP
            </span>
          ) : null}
        </div>
      </div>
    </header>
  );
}
