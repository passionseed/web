/**
 * Public paths of the non-level art written by scripts/radar-guide/art.ts.
 * Level scenes use levelSceneSrc(slug, pageKey) from lib/radar-guide/story.
 */
export type GuideArt = "map" | "frame";

export function guideArtSrc(slug: string, art: GuideArt): string {
  return `/radar/guides/${slug}/${art}.webp`;
}
