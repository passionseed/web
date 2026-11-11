/**
 * The guide's title screen at /radar/[slug] (server component): a pixel
 * scene with the career name, the host saying the hook in a dialogue box,
 * "เริ่มเกม ▶", "เล่นต่อ" when this device has progress, the level map
 * (cleared, current, ahead; every level tappable), the "ข้อมูล ณ ..." chip,
 * and the full DB deck one tap away (?view=deck).
 *
 * `data-site-chrome="off"` hides the site header on this screen (shell.css);
 * the deck at the same path keeps it.
 */
import type { CSSProperties } from "react";
import Link from "next/link";
import { PixelScene } from "@/components/radar/guide/story";
import type { GuideIndexEntry } from "@/lib/radar-guide/guide-types";
import { levelSceneSrc } from "@/lib/radar-guide/story";
import { asOfLabel, roundMinutes } from "./guide-format";
import { CoverHost, CoverLevelMap } from "./CoverMap";
import { deckHref, firstLevelKey, levelHref } from "./guide-routes";
import { NextGlyph } from "./glyphs";
import { GuideCoverClient } from "./LegacyHashRedirect";
import { CoverResumeChip } from "./ResumeChip";
import "./shell.css";

export interface GuideCoverProps {
  index: GuideIndexEntry;
  /** One line under the name: the first level's OG headline. */
  hookTh: string;
}

/**
 * Cover art: the first level's scene (public/radar/guides/<slug>/<first>.webp),
 * so the title screen opens on the world the run starts in. PixelScene draws a
 * CSS night scene if the file is missing.
 */
export function coverSceneSrc(index: GuideIndexEntry): string | null {
  const first = firstLevelKey(index);
  if (!first) return null;
  return index.pages.find((p) => p.key === first)?.scene ?? levelSceneSrc(index.slug, first);
}

export function GuideCover({ index, hookTh }: GuideCoverProps) {
  const pages = [...index.pages].sort((a, b) => a.order - b.order);
  const first = firstLevelKey(index);
  const minutes = roundMinutes(pages.reduce((s, p) => s + p.minutes, 0));
  const asOf = asOfLabel(index.asOf);

  return (
    <main
      className="rg-shell rg-cover"
      data-site-chrome="off"
      style={{ "--radar-accent": index.accent } as CSSProperties}
    >
      <PixelScene src={coverSceneSrc(index)} titleTh={index.nameTh} />

      <div className="rg-cover__body">
        <CoverHost lineTh={hookTh} />

        <div className="rg-cover__actions">
          {first ? (
            <Link href={levelHref(index.slug, first)} className="rg-pixel-btn rg-pixel-btn--accent rg-cover__start" data-testid="cover-start">
              <span>เริ่มเกม</span>
              <NextGlyph />
            </Link>
          ) : null}
          <CoverResumeChip slug={index.slug} pages={pages} />
        </div>

        <p className="rg-cover__meta">
          {pages.length} ด่าน · ราว {minutes} นาที{asOf ? ` · ${asOf}` : ""}
        </p>

        <CoverLevelMap index={index} />

        <Link href={deckHref(index.slug)} className="rg-link rg-cover__deck" data-testid="cover-deck">
          ดูข้อมูลทั้งหมดในหน้าเดียว
        </Link>
      </div>

      <GuideCoverClient slug={index.slug} />
    </main>
  );
}
