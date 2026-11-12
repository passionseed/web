import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GuidePageView } from "@/components/radar/guide/shell/GuidePageView";
import { guidePageMetadata } from "@/components/radar/guide/shell/guide-routes";
import { guideStaticParams, loadGuidePage } from "@/lib/radar-guides/registry.server";

// Levels come from code only. Unknown slug/page pairs 404 without rendering.
export const dynamicParams = false;
// The root layout reads cookies (supabase.auth.getSession, value unused).
// force-static makes cookies() empty here so every level prerenders at build
// with no network. Precedent: app/epic-sprint/page.tsx.
export const dynamic = "force-static";

type Params = Promise<{ slug: string; page: string }>;

export function generateStaticParams() {
  // Live guides always; draft guides too unless VERCEL_ENV === "production".
  return guideStaticParams();
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug, page } = await params;
  const hit = loadGuidePage(slug, page);
  if (!hit) return {};
  return guidePageMetadata(hit.guide.meta, hit.page);
}

export default async function GuideLevelPage({ params }: { params: Params }) {
  const { slug, page } = await params;
  const hit = loadGuidePage(slug, page);
  if (!hit) notFound();
  return <GuidePageView index={hit.index} page={hit.page} clip={hit.clip} facts={hit.facts} />;
}
