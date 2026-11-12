import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GuidePageView } from "@/components/radar/guide/shell/GuidePageView";
import { GuideShellProvider } from "@/components/radar/guide/shell/GuideShellProvider";
import { buildDemoReelPlan } from "@/components/radar/reel/demoReel";
import { RADAR_REEL_FONT_VARS } from "@/components/radar/reel/fonts";
import { PageFrame } from "@/components/radar/reel/PageFrame";
import { RADAR_SLUG_PATTERN } from "@/lib/radar-guide/types";
import { loadGuidePage } from "@/lib/radar-guides/registry.server";

/**
 * Filming frame for demo reels (docs/features/radar-guides-in-code.md section 3):
 * one guide level in demo mode (no tracking, no storage writes, every step
 * revealed) inside a 432x768 viewport, between a hook card and the end card.
 * `pnpm radar:reel <slug> --page <key> --format demo` films it at
 * deviceScaleFactor 2.5 (1080x1920). `?render=1` waits for the script to start
 * the clock and hides the safe-zone guides; `?platform=tt` swaps the end card.
 * Content comes from code only: no Supabase. Never served in production.
 */

type Params = Promise<{ slug: string; page: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug, page } = await params;
  return {
    title: `Studio · Radar guide ${slug}/${page}`,
    robots: { index: false, follow: false },
  };
}

export default async function RadarGuideStudioPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  if (process.env.VERCEL_ENV === "production") notFound();
  const [{ slug, page: pageKey }, query] = await Promise.all([params, searchParams]);
  if (!RADAR_SLUG_PATTERN.test(slug)) notFound();
  const hit = loadGuidePage(slug, pageKey);
  if (!hit) notFound();

  const plan = buildDemoReelPlan({
    slug,
    alias: hit.guide.meta.alias,
    platform: query.platform === "tt" ? "tt" : "ig",
    page: hit.page,
  });

  return (
    <div className={`${RADAR_REEL_FONT_VARS} min-h-screen bg-neutral-950`}>
      <PageFrame plan={plan} render={query.render === "1"}>
        <GuideShellProvider index={hit.index} forceDemo chrome={false} pageKey={hit.page.key}>
          <GuidePageView index={hit.index} page={hit.page} clip={hit.clip} facts={hit.facts} />
        </GuideShellProvider>
      </PageFrame>
    </div>
  );
}
