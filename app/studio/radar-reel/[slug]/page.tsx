import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RADAR_REEL_FONT_VARS } from "@/components/radar/reel/fonts";
import { RadarReelStudio } from "@/components/radar/reel/RadarReelStudio";
import { RADAR_SLUG_PATTERN } from "@/lib/radar-guide/types";

/**
 * Career Radar motion reel ("อาชีพนี้ใน 30 วินาที"), 1080x1920. Render only:
 * the data comes from `window.__RADAR_REEL__`, injected by
 * scripts/radar-guide/reel.ts, never from Supabase. `?render=1` pauses it for
 * frame-by-frame capture; `?cover=1` shows the still cover frame.
 * Not served in production.
 */

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<{ render?: string; cover?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Studio · Radar reel ${slug}`,
    robots: { index: false, follow: false },
  };
}

export default async function RadarReelStudioPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  if (process.env.VERCEL_ENV === "production") notFound();
  const { slug } = await params;
  if (!RADAR_SLUG_PATTERN.test(slug)) notFound();
  const { render, cover } = await searchParams;
  return (
    <div className={`${RADAR_REEL_FONT_VARS} min-h-screen overflow-auto bg-neutral-950 p-10`}>
      {/* Keep the Next.js dev indicator out of filmed frames. */}
      <style>{"nextjs-portal{display:none!important}"}</style>
      <RadarReelStudio slug={slug} render={render === "1"} cover={cover === "1"} />
    </div>
  );
}
