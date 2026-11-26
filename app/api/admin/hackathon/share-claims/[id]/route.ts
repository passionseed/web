import { after, NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { notifyElementalPaid } from "@/lib/hackathon/elemental/notify";
import { requireAdmin, safeServerError } from "@/lib/security/route-guards";
import { decideShareClaim } from "@/lib/supabase/hackathon-share-claims";

const bodySchema = z.object({ action: z.enum(["approve", "reject"]) });

/**
 * Admin decision on a share claim, after checking the screenshot in the IG inbox:
 * approve gives the free seat, reject puts the school back in the pool.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  try {
    const result = await decideShareClaim(id, parsed.data.action, admin.value.userId);
    if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 409 });
    if (result.becamePaid) after(() => notifyElementalPaid(result.registrationId, "admin"));
    return NextResponse.json({ ok: true, becamePaid: result.becamePaid });
  } catch (error) {
    return safeServerError("Failed to decide the share claim", error);
  }
}
