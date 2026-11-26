import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { findSchool } from "@/lib/hackathon/elemental/schools";
import { customSchoolKey, foldSchoolName, shareOpen } from "@/lib/hackathon/elemental/share";
import { isRudeTeamName } from "@/lib/hackathon/elemental/team-name";
import { safeServerError } from "@/lib/security/route-guards";
import { isTrustedAdminRequest } from "@/lib/security/request-origin";
import {
  claimSchool,
  getShareContext,
  markClaimSent,
  releaseOwnHold,
  type ShareContext,
} from "@/lib/supabase/hackathon-share-claims";

const claimBody = z.union([
  z.object({ schoolKey: z.string().regex(/^(obec|bma|opec|satit|dla):[0-9a-z]{1,20}$/) }),
  z.object({ customName: z.string().trim().min(2).max(120), province: z.string().trim().max(60).optional() }),
]);
const patchBody = z.object({ action: z.enum(["sent", "release"]) });

type Guarded = { ok: true; reg: ShareContext } | { ok: false; response: NextResponse };

/** Same-site, sharing open, a real sign-up that hasn't paid. */
async function guard(request: NextRequest, token: string): Promise<Guarded> {
  if (!isTrustedAdminRequest(request)) return { ok: false, response: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  if (!shareOpen()) return { ok: false, response: NextResponse.json({ error: "closed" }, { status: 409 }) };
  const reg = await getShareContext(token);
  if (!reg) return { ok: false, response: NextResponse.json({ error: "not_found" }, { status: 404 }) };
  if (reg.status !== "pending") return { ok: false, response: NextResponse.json({ error: "not_pending" }, { status: 409 }) };
  return { ok: true, reg };
}

/** Pick a school: holds it for this sign-up for 24 hours. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const g = await guard(request, token);
    if (!g.ok) return g.response;

    const parsed = claimBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

    let school: { key: string; name: string; province: string | null };
    if ("schoolKey" in parsed.data) {
      const row = await findSchool(parsed.data.schoolKey);
      if (!row) return NextResponse.json({ error: "invalid" }, { status: 400 });
      school = { key: row[0], name: row[1], province: row[2] || null };
    } else {
      const name = parsed.data.customName.replace(/^(โรงเรียน|รร\.?)\s*/, "").trim();
      if (foldSchoolName(name).length < 2 || isRudeTeamName(name)) return NextResponse.json({ error: "invalid" }, { status: 400 });
      school = { key: customSchoolKey(name), name, province: parsed.data.province || null };
    }

    const result = await claimSchool(ELEMENTAL.slug, g.reg.id, school);
    if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 409 });
    return NextResponse.json({ claim: result.claim });
  } catch (error) {
    return safeServerError("Could not hold the school", error);
  }
}

/** "I sent the screenshot" (stops the 24-hour clock) or "wrong school" (lets it go). */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const g = await guard(request, token);
    if (!g.ok) return g.response;

    const parsed = patchBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

    if (parsed.data.action === "sent") {
      const claim = await markClaimSent(g.reg.id);
      if (!claim) return NextResponse.json({ error: "expired" }, { status: 409 });
      return NextResponse.json({ claim });
    }
    if (!(await releaseOwnHold(g.reg.id))) return NextResponse.json({ error: "not_held" }, { status: 409 });
    return NextResponse.json({ claim: null });
  } catch (error) {
    return safeServerError("Could not update the share", error);
  }
}
