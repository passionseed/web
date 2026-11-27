import { NextResponse } from "next/server";

import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { demoPagesOn, SHARE_CODE_RE, SHARE_DEMO_CODE, TEACHER_DEMO_CODE, type ShareKind } from "@/lib/hackathon/elemental/share";
import { renderSharePoster } from "@/lib/hackathon/elemental/share-poster";
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
 */
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    if (!SHARE_CODE_RE.test(code)) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const kind = demoKind(code) ?? (await findLinkKind(ELEMENTAL.slug, code));
    if (!kind) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const jpg = await renderSharePoster(code, kind);
    const download = new URL(request.url).searchParams.get("download") === "1";
    return new NextResponse(new Uint8Array(jpg), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=86400, s-maxage=31536000, immutable",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="elemental-${code}.jpg"`,
      },
    });
  } catch (error) {
    return safeServerError("Could not make the poster", error);
  }
}
