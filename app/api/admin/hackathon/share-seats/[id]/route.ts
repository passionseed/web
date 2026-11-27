import { after, NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { notifyElementalPaid } from "@/lib/hackathon/elemental/notify";
import { requireAdmin, safeServerError } from "@/lib/security/route-guards";
import { isTrustedAdminRequest } from "@/lib/security/request-origin";
import { decideSeat } from "@/lib/supabase/hackathon-share-links";

const bodySchema = z.object({ action: z.enum(["confirm", "reject"]) });

/**
 * Staff decision on a school's free seat, after a quick fraud check:
 * confirm gives it (the sign-up becomes free), reject turns the link down
 * and opens the seat for the next link at that school to qualify.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isTrustedAdminRequest(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  try {
    const result = await decideSeat(id, parsed.data.action, admin.value.userId);
    if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 409 });
    const paidId = result.becamePaid ? result.registrationId : null;
    if (paidId) after(() => notifyElementalPaid(paidId, "admin"));
    return NextResponse.json({ ok: true, becamePaid: result.becamePaid });
  } catch (error) {
    return safeServerError("Failed to decide the school seat", error);
  }
}
