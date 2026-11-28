import { NextRequest, NextResponse } from "next/server";

import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { sharePhase } from "@/lib/hackathon/elemental/share";
import { TEACHER_TOKEN_RE } from "@/lib/hackathon/elemental/share-rules";
import { safeServerError } from "@/lib/security/route-guards";
import { getTeacherLink, linkView } from "@/lib/supabase/hackathon-share-links";

const noStore = { "Cache-Control": "no-store" };

/** The teacher link's live view (ShareLinkView: devices, paid sign-ups, phase), for the page to refresh. Readable until the end of Demo Day. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    if (!TEACHER_TOKEN_RE.test(token)) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (sharePhase() === "off") return NextResponse.json({ error: "closed" }, { status: 409 });
    const link = await getTeacherLink(token);
    if (!link) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ link: await linkView(ELEMENTAL.slug, link) }, { headers: noStore });
  } catch (error) {
    return safeServerError("Could not load the teacher link", error);
  }
}
