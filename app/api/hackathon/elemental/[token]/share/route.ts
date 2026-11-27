import { NextRequest, NextResponse } from "next/server";

import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { sharePhase, type SharePhase } from "@/lib/hackathon/elemental/share";
import { resolveSchool, schoolBody } from "@/lib/hackathon/elemental/share-school";
import { safeServerError } from "@/lib/security/route-guards";
import { isTrustedAdminRequest } from "@/lib/security/request-origin";
import { getShareContext, getStudentLink, linkView, setStudentSchool, type ShareContext } from "@/lib/supabase/hackathon-share-links";

type Guarded = { ok: true; reg: ShareContext } | { ok: false; response: NextResponse };

const noStore = { "Cache-Control": "no-store" };

/**
 * Same-site for changes, a real sign-up that isn't cancelled, and sharing in
 * one of `phases` ("open", or also "after-close" for reading). Paid or not,
 * anyone signed up can share.
 */
async function guard(request: NextRequest, token: string, phases: SharePhase[] = ["open", "after-close"]): Promise<Guarded> {
  if (!isTrustedAdminRequest(request)) return { ok: false, response: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  if (!phases.includes(sharePhase())) return { ok: false, response: NextResponse.json({ error: "closed" }, { status: 409 }) };
  const reg = await getShareContext(token);
  if (!reg) return { ok: false, response: NextResponse.json({ error: "not_found" }, { status: 404 }) };
  if (reg.status === "cancelled") return { ok: false, response: NextResponse.json({ error: "cancelled" }, { status: 409 }) };
  return { ok: true, reg };
}

/** The link's live view (ShareLinkView), for the share page to refresh. `link` is null before a school is picked. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const g = await guard(request, token);
    if (!g.ok) return g.response;
    const link = await getStudentLink(g.reg.id);
    return NextResponse.json({ link: link ? await linkView(ELEMENTAL.slug, link) : null }, { headers: noStore });
  } catch (error) {
    return safeServerError("Could not load the share link", error);
  }
}

/** Pick a school (makes the link), or change it. Only while sign-up is open. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const g = await guard(request, token, ["open"]);
    if (!g.ok) return g.response;

    const parsed = schoolBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
    const school = await resolveSchool(parsed.data);
    if (!school) return NextResponse.json({ error: "invalid" }, { status: 400 });

    const result = await setStudentSchool(ELEMENTAL.slug, g.reg, school);
    if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 409 });
    return NextResponse.json({ link: await linkView(ELEMENTAL.slug, result.link) }, { headers: noStore });
  } catch (error) {
    return safeServerError("Could not save the school", error);
  }
}
