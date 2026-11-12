/**
 * Guide page options for the admin reel mapper and links editor. Pure and
 * client-safe: reads only the light GUIDE_INDEX (titles and keys), never page
 * content.
 */
import { GUIDE_INDEX } from "@/lib/radar-guides";

export interface AdminPageOption {
  key: string;
  order: number;
  titleTh: string;
}

/** Pages of a career's code guide in level order (any status), or null for a deck career. */
export function adminGuidePages(slug: string | null | undefined): AdminPageOption[] | null {
  if (!slug || !Object.prototype.hasOwnProperty.call(GUIDE_INDEX, slug)) return null;
  return [...GUIDE_INDEX[slug].pages]
    .sort((a, b) => a.order - b.order)
    .map((page) => ({ key: page.key, order: page.order, titleTh: page.titleTh }));
}

/** "6. เงินเดือนจริงในไทย" for a known page, the raw key for anything else, "" for none. */
export function adminPageLabel(slug: string | null | undefined, pageKey: string | null | undefined): string {
  if (!pageKey) return "";
  const page = adminGuidePages(slug)?.find((p) => p.key === pageKey);
  return page ? `${page.order}. ${page.titleTh}` : pageKey;
}

/** Hook takes for a page's reel plan: take 0 is the hook, 1 and 2 the variants. */
export function reelPlanTakes(plan: { hookTh: string; variantsTh: readonly string[] } | null | undefined): string[] {
  return plan ? [plan.hookTh, ...plan.variantsTh] : [];
}
