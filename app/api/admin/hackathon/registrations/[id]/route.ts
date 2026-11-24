import { after, NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { notifyElementalPaid } from "@/lib/hackathon/elemental/notify";
import { requireAdmin, safeServerError } from "@/lib/security/route-guards";
import { setRegistrationStatus } from "@/lib/supabase/hackathon-event-registrations";

const bodySchema = z.object({
  status: z.enum(["pending", "review", "paid", "cancelled"]),
  note: z.string().trim().max(1000).optional(),
});

/** Admin decision on a paid hackathon sign-up: confirm, reopen or cancel it. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  try {
    const becamePaid = await setRegistrationStatus(id, parsed.data.status, admin.value.userId, parsed.data.note);
    if (becamePaid) after(() => notifyElementalPaid(id, "admin"));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return safeServerError("Failed to update registration", error);
  }
}
