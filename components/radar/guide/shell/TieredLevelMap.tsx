"use client";

/**
 * The level map split into the two parts of the run: Level 1 (the short run
 * for a student who hasn't chosen anything yet), then Level 2. Level 2 is the
 * guide's tier-2 pages on a second map followed by a door to the career's full
 * DB deck (?view=deck), or, when the guide has none, just that door. A guide with no tier-2 pages and no
 * deck door renders exactly like a single LevelMap.
 *
 * Numbers restart at 1 on each map: "Level 2, ด่าน 1".
 */
import Link from "next/link";
import type { GuideIndexPage, GuideState } from "@/lib/radar-guide/guide-types";
import { levelMap } from "@/lib/radar-guide/story";
import { levelOnePages, levelTwoPages } from "@/lib/radar-guide/tiers";
import { LevelMap } from "@/components/radar/guide/story";
import { deckHref } from "./guide-routes";

export const LEVEL_ONE_HEADING_TH = "Level 1 · ลองเล่นดูก่อน";
export const LEVEL_TWO_HEADING_TH = "Level 2 · เจาะลึกของจริง";
export const LEVEL_TWO_DECK_TH = "ข้อมูลจัดเต็มของสายนี้ ทั้งเงินเดือน ตลาดงาน และทางเรียน";
export const LEVEL_TWO_DECK_CTA_TH = "ไป Level 2";
/** Under the Level 2 map: the deck as the last stop of Level 2. */
export const LEVEL_TWO_FULL_DECK_CTA_TH = "ดูข้อมูลเต็ม";

export interface TieredLevelMapProps {
  slug: string;
  pages: readonly GuideIndexPage[];
  progress: GuideState;
  currentKey?: string | null;
  onJump?(key: string): void;
  hrefFor?(key: string): string;
  backgroundSrc?: string | null;
  reducedMotion?: boolean;
  className?: string;
  /** Show the deck door when the guide has no tier-2 pages. */
  deckDoor?: boolean;
  /** Called when the deck door is tapped (e.g. to close a sheet). */
  onDeckDoor?(): void;
}

/** Renumber a tier's pages 1..n so each map counts from 1. */
function renumber(pages: readonly GuideIndexPage[]): GuideIndexPage[] {
  return pages.map((p, i) => ({ ...p, order: i + 1 }));
}

export function TieredLevelMap({
  slug,
  pages,
  progress,
  currentKey,
  onJump,
  hrefFor,
  backgroundSrc,
  reducedMotion,
  className,
  deckDoor = true,
  onDeckDoor,
}: TieredLevelMapProps) {
  const one = levelOnePages(pages);
  const two = levelTwoPages(pages);
  const split = two.length > 0;
  const shared = { progress, onJump, hrefFor, backgroundSrc, reducedMotion } as const;

  if (!split && !deckDoor) {
    return <LevelMap pages={pages} currentKey={currentKey} className={className} {...shared} />;
  }

  // The one "current" level across both maps: the host stands on it only.
  const current = levelMap(progress, pages, currentKey ?? undefined).find((n) => n.status === "current")?.key ?? null;
  const currentTier = two.some((p) => p.key === current) ? 2 : 1;

  return (
    <div className={`rg-tiers ${className ?? ""}`}>
      <p className="rg-tiers__heading">{LEVEL_ONE_HEADING_TH}</p>
      <LevelMap
        pages={split ? renumber(one) : pages}
        currentKey={current}
        idle={currentTier !== 1}
        labelTh="แผนที่ด่าน Level 1"
        {...shared}
      />
      <p className="rg-tiers__heading">{LEVEL_TWO_HEADING_TH}</p>
      {split ? (
        <>
          <LevelMap
            pages={renumber(two)}
            currentKey={current}
            idle={currentTier !== 2}
            labelTh="แผนที่ด่าน Level 2"
            {...shared}
          />
          {deckDoor ? (
            <Link href={deckHref(slug)} className="rg-tiers__door" data-testid="level-two-deck" onClick={onDeckDoor}>
              <span className="rg-tiers__doortext">{LEVEL_TWO_DECK_TH}</span>
              <span className="rg-pixel-btn rg-pixel-btn--accent rg-tiers__doorcta">{LEVEL_TWO_FULL_DECK_CTA_TH}</span>
            </Link>
          ) : null}
        </>
      ) : (
        <Link href={deckHref(slug)} className="rg-tiers__door" data-testid="level-two-deck" onClick={onDeckDoor}>
          <span className="rg-tiers__doortext">{LEVEL_TWO_DECK_TH}</span>
          <span className="rg-pixel-btn rg-pixel-btn--accent rg-tiers__doorcta">{LEVEL_TWO_DECK_CTA_TH}</span>
        </Link>
      )}
    </div>
  );
}
