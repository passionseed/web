import { NextResponse } from "next/server";

import { FORMATS } from "@/lib/marketing/formats";
import { LINKEDIN_POSTS, STUDIO_SETS } from "@/lib/marketing/sets";

/**
 * Machine-readable list of studio sets and LinkedIn posts, read by
 * scripts/render-marketing.mjs so the exporter never has to import TS.
 */
export function GET() {
  return NextResponse.json({
    sets: STUDIO_SETS.map((set) => ({
      slug: set.slug,
      title: set.title,
      channel: set.channel,
      format: set.format,
      size: { width: FORMATS[set.format].width, height: FORMATS[set.format].height },
      audience: set.audience,
      angle: set.angle,
      sources: set.sources,
      caption: set.caption,
      hashtags: set.hashtags ?? [],
      slides: set.slides.length,
      pageOffset: set.pageOffset ?? 0,
      created: set.created,
    })),
    posts: LINKEDIN_POSTS,
  });
}
