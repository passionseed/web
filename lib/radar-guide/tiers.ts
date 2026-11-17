/**
 * Level 1 and Level 2 of a guide run. Level 1 (pages with no tier, or tier 1)
 * is the short run for a student who hasn't chosen anything yet. Level 2 goes
 * deep: the guide's tier-2 pages, or, when it has none, the career's DB deck
 * (/radar/<slug>?view=deck). Pure: shared by the server views and the client.
 */
import type { GuideIndexPage } from "./guide-types";

export type GuideTier = 1 | 2;

type TierPage = Pick<GuideIndexPage, "key" | "order" | "tier">;

export function pageTier(page: Pick<GuideIndexPage, "tier">): GuideTier {
  return page.tier === 2 ? 2 : 1;
}

function sorted<P extends TierPage>(pages: readonly P[]): P[] {
  return [...pages].sort((a, b) => a.order - b.order);
}

/** The pages of one tier, in order. */
export function tierPages<P extends TierPage>(pages: readonly P[], tier: GuideTier): P[] {
  return sorted(pages).filter((p) => pageTier(p) === tier);
}

export function levelOnePages<P extends TierPage>(pages: readonly P[]): P[] {
  return tierPages(pages, 1);
}

export function levelTwoPages<P extends TierPage>(pages: readonly P[]): P[] {
  return tierPages(pages, 2);
}

export type LevelTwoTarget = { kind: "pages"; firstKey: string } | { kind: "deck" };

/** Where "Level 2" leads: the first tier-2 page, else the DB deck. */
export function levelTwoTarget(pages: readonly TierPage[]): LevelTwoTarget {
  const first = levelTwoPages(pages)[0];
  return first ? { kind: "pages", firstKey: first.key } : { kind: "deck" };
}

/** True for the last Level 1 page and the last page overall: each ends a part of the run. */
export function endsPartOfRun(pages: readonly TierPage[], key: string): boolean {
  const all = sorted(pages);
  if (all[all.length - 1]?.key === key) return true;
  const one = levelOnePages(pages);
  return one[one.length - 1]?.key === key;
}

/** The page's number and the page count within its own Level ("ด่าน 2/5"). */
export function positionInTier(pages: readonly TierPage[], key: string): { tier: GuideTier; index: number; total: number } | null {
  const page = pages.find((p) => p.key === key);
  if (!page) return null;
  const tier = pageTier(page);
  const list = tierPages(pages, tier);
  return { tier, index: list.findIndex((p) => p.key === key) + 1, total: list.length };
}
