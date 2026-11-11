"use client";

/**
 * Two small chips:
 * - LandingChip: "เริ่มจากด่านแรก (1/11)" when a link drops the student mid-guide.
 *   An offer, never a redirect: every level plays with empty progress.
 * - CoverResumeChip: "เล่นต่อ LV 4" on the cover when this device has progress.
 */
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import type { GuideIndexPage } from "@/lib/radar-guide/guide-types";
import { readGuideState } from "@/lib/radar-guide/guide-state";
import { isDemoMode } from "@/lib/radar-guide/demo";
import { levelHref } from "./guide-routes";
import { NextGlyph } from "./glyphs";

export function LandingChip({ slug, firstKey, total }: { slug: string; firstKey: string; total: number }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="rg-landing-chip" role="note">
      <Link href={levelHref(slug, firstKey)} className="rg-landing-chip__link">
        เริ่มจากด่านแรก (1/{total})
      </Link>
      <button type="button" className="rg-landing-chip__close" aria-label="ปิด" onClick={() => setDismissed(true)}>
        ×
      </button>
    </div>
  );
}

const noop = () => () => {};

/** The level this device last played, read once on the client (null on the server). */
function useLastLevel(slug: string): string | null {
  return useSyncExternalStore(
    noop,
    () => (isDemoMode() ? null : readGuideState(slug).last ?? null),
    () => null
  );
}

export function CoverResumeChip({ slug, pages }: { slug: string; pages: readonly GuideIndexPage[] }) {
  const last = useLastLevel(slug);
  const page = last ? pages.find((p) => p.key === last) : null;
  if (!page || page.order <= 1) return null;
  return (
    <Link href={levelHref(slug, page.key)} className="rg-pixel-btn rg-cover__resume" data-testid="cover-resume">
      <span>เล่นต่อ LV {page.order}</span>
      <NextGlyph />
    </Link>
  );
}
