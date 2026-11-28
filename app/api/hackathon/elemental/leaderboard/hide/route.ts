import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { requireAdmin, safeServerError } from "@/lib/security/route-guards";
import { isTrustedAdminRequest } from "@/lib/security/request-origin";
import { setBoardHidden } from "@/lib/supabase/hackathon-team-style";

const body = z.object({
  kind: z.enum(["team", "solo"]),
  id: z.string().uuid(),
  hidden: z.boolean(),
});

/** Staff: take a team off the public board (a name that slipped past the word check), or put it back. */
export async function POST(request: NextRequest) {
  try {
    if (!isTrustedAdminRequest(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const admin = await requireAdmin();
    if (!admin.ok) return admin.response;
    const parsed = body.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
    await setBoardHidden(ELEMENTAL.slug, { kind: parsed.data.kind, id: parsed.data.id }, parsed.data.hidden);
    return NextResponse.json({ hidden: parsed.data.hidden });
  } catch (error) {
    return safeServerError("Could not change the board", error);
  }
}
