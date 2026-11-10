import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, safeServerError } from "@/lib/security/route-guards";
import { listAdminTrials } from "@/lib/supabase/admin-trials";

const querySchema = z.object({
  status: z
    .enum(["active", "pending", "paid", "expired", "all"])
    .default("pending"),
});

const MAX_ROWS = 100;

/** Trials for review, pending first, with the student's name and a signed slip URL. */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      status: searchParams.get("status") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // RLS limits student reads to their own rows; the loader uses the
    // service role, which is why the admin guard above runs first.
    const trials = await listAdminTrials({ status: parsed.data.status, limit: MAX_ROWS });
    return NextResponse.json({ trials });
  } catch (error) {
    return safeServerError("Failed to fetch trials", error);
  }
}
