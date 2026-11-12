import { renderGuideOg } from "@/components/radar/guide/shell/guide-og";
import { OG_SIZE } from "@/lib/og/poster";
import { guideStaticParams, loadGuide } from "@/lib/radar-guides/registry.server";

// Per-level link preview, from code only (no database). The alt export is
// static per segment, so it stays generic.
export const alt = "Career Radar: ลองเล่นทีละด่าน รู้จักอาชีพจากงานจริง";
export const size = OG_SIZE;
export const contentType = "image/png";
export const runtime = "nodejs";
export const dynamicParams = false;

export function generateStaticParams() {
  return guideStaticParams();
}

export default async function Image({ params }: { params: Promise<{ slug: string; page: string }> }) {
  const { slug, page } = await params;
  const guide = loadGuide(slug);
  const level = guide?.pages.find((p) => p.key === page);
  return renderGuideOg({
    careerTh: guide?.meta.nameTh ?? "Career Radar",
    headlineTh: level?.og.headlineTh ?? level?.titleTh ?? "Career Radar",
    statTh: level?.og.stat?.th ?? null,
    badge: level ? `LV ${level.order}` : "RADAR",
    accent: guide?.meta.accent ?? "#5cff5c",
  });
}
