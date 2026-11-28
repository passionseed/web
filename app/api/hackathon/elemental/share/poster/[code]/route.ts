import { NextResponse } from "next/server";

import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { demoPagesOn, SHARE_CODE_RE, SHARE_DEMO_CODE, TEACHER_DEMO_CODE, type ShareKind } from "@/lib/hackathon/elemental/share";
import { renderSharePoster, renderSharePosterOg, renderShareStory } from "@/lib/hackathon/elemental/share-poster";
import { safeServerError } from "@/lib/security/route-guards";
import { findLinkKind } from "@/lib/supabase/hackathon-share-links";

export const runtime = "nodejs";

/** The demo codes, where demo pages are on: their posters work without a link. */
function demoKind(code: string): ShareKind | null {
  if (!demoPagesOn()) return null;
  if (code === SHARE_DEMO_CODE) return "student";
  if (code === TEACHER_DEMO_CODE) return "teacher";
  return null;
}

/**
 * A student's or teacher's own poster, as a JPEG. The code is public (it's
 * printed on the poster), so the link holds no secret; it only works for a
 * code that has a share link. ?v= is the base image's version, so a new
 * export gets new links and the CDN keeps each one for good.
 * ?download=1 asks the browser to save it as a file.
 * ?format=og is the 1200×630 link preview (the landing page's og:image for
 * ?src=share-<code> and ?src=t-<code>), cached the same way.
 * ?format=story is the 1080×1920 Instagram Story (2160×3840), with a box for
 * the link sticker; its ?v= is storyVersion(). ?download=1 works for it too.
 */
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    if (!SHARE_CODE_RE.test(code)) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const kind = demoKind(code) ?? (await findLinkKind(ELEMENTAL.slug, code));
    if (!kind) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const query = new URL(request.url).searchParams;
    const format = query.get("format");
    const jpg =
      format === "og" ? await renderSharePosterOg(code, kind) : format === "story" ? await renderShareStory(code, kind) : await renderSharePoster(code, kind);
    const suffix = format === "og" ? "-og" : format === "story" ? "-story" : "";
    const download = query.get("download") === "1";
    return new NextResponse(new Uint8Array(jpg), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=86400, s-maxage=31536000, immutable",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="elemental-${code}${suffix}.jpg"`,
      },
    });
  } catch (error) {
    return safeServerError("Could not make the poster", error);
  }
}
