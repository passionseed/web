import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin, safeServerError } from "@/lib/security/route-guards";
import { isTrustedAdminRequest } from "@/lib/security/request-origin";
import { setTeacherInvited } from "@/lib/supabase/hackathon-share-links";

const bodySchema = z.object({ invited: z.boolean() });

/** Staff mark that a teacher's Demo Day invite was sent (or undo the mark). */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isTrustedAdminRequest(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  try {
    if (!(await setTeacherInvited(id, parsed.data.invited, admin.value.userId))) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return safeServerError("Failed to save the Demo Day invite", error);
  }
}
