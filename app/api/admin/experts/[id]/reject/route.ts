import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, safeServerError } from "@/lib/security/route-guards";
import { z } from "zod";

const rejectSchema = z.object({
  reason: z.string().max(2000).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { supabase, userId } = admin.value;
    const { id } = await params;

    const body = await request.json().catch(() => ({}));
    const parsed = rejectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { error } = await supabase
      .from("expert_profiles")
      .update({
        status: "rejected",
        admin_notes: parsed.data.reason ?? null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: userId,
      })
      .eq("id", id);

    if (error) {
      return safeServerError("Failed to reject expert", error);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return safeServerError("Failed to reject expert", error);
  }
}
