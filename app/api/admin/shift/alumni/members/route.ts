import { NextResponse } from "next/server";
import { z } from "zod";

import { ALUMNI_MEMBER_STATUSES } from "@/lib/shift/alumniMember";
import { requireAdmin, safeServerError } from "@/lib/security/route-guards";
import { reviewAlumniMember } from "@/lib/supabase/shift-alumni-members";

const reviewSchema = z.object({
  userId: z.string().uuid(),
  status: z.enum(ALUMNI_MEMBER_STATUSES as [string, ...string[]]),
});

/** Admin confirms (or declines) that an account finished SHIFT. */
export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = reviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid review" }, { status: 422 });

  try {
    const { userId, status } = parsed.data;
    await reviewAlumniMember(userId, status as (typeof ALUMNI_MEMBER_STATUSES)[number], auth.value.userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return safeServerError("Failed to review alumni member", error);
  }
}
