import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { clientIp, isBotUserAgent, TRACKED_SOURCE_RE } from "@/lib/hackathon/elemental/link-views";
import { recordLinkView } from "@/lib/supabase/hackathon-link-views";

const bodySchema = z.object({ src: z.string().regex(TRACKED_SOURCE_RE) });

/**
 * A device opened a share link (sent by the landing page's script, so link
 * previews and crawlers that don't run scripts never count). Always 204:
 * the page doesn't care, and a failure must never show to the visitor.
 */
export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  const ua = request.headers.get("user-agent") ?? "";
  if (parsed.success && !isBotUserAgent(ua)) {
    try {
      await recordLinkView(ELEMENTAL.slug, parsed.data.src, clientIp(request.headers), ua);
    } catch (error) {
      console.error("Failed to record the link view", error);
    }
  }
  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
