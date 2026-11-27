import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { shareOpen } from "@/lib/hackathon/elemental/share";
import { TEACHER_TOKEN_RE } from "@/lib/hackathon/elemental/share-rules";
import { safeServerError } from "@/lib/security/route-guards";
import { isTrustedAdminRequest } from "@/lib/security/request-origin";
import { getTeacherLink, linkView, nameRecipient, type ShareLink } from "@/lib/supabase/hackathon-share-links";

const studentBody = z.object({ studentCode: z.string().trim().min(8).max(20) });
const noStore = { "Cache-Control": "no-store" };

type Guarded = { ok: true; link: ShareLink } | { ok: false; response: NextResponse };

async function guard(request: NextRequest, token: string): Promise<Guarded> {
  if (!isTrustedAdminRequest(request)) return { ok: false, response: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  if (!TEACHER_TOKEN_RE.test(token)) return { ok: false, response: NextResponse.json({ error: "not_found" }, { status: 404 }) };
  if (!shareOpen()) return { ok: false, response: NextResponse.json({ error: "closed" }, { status: 409 }) };
  const link = await getTeacherLink(token);
  if (!link) return { ok: false, response: NextResponse.json({ error: "not_found" }, { status: 404 }) };
  return { ok: true, link };
}

/** The teacher link's live numbers, invite and school seat, for the page to refresh. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const g = await guard(request, token);
    if (!g.ok) return g.response;
    return NextResponse.json({ link: await linkView(ELEMENTAL.slug, g.link, null) }, { headers: noStore });
  } catch (error) {
    return safeServerError("Could not load the teacher link", error);
  }
}

/** The teacher names the unpaid student who gets the school's free seat (by the student's code). */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const g = await guard(request, token);
    if (!g.ok) return g.response;
    const parsed = studentBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
    const result = await nameRecipient(ELEMENTAL.slug, g.link, null, parsed.data.studentCode);
    if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 409 });
    return NextResponse.json({ link: result.view }, { headers: noStore });
  } catch (error) {
    return safeServerError("Could not name the student", error);
  }
}
