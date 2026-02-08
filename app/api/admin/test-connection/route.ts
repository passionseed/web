import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireAdmin, safeServerError } from "@/lib/security/route-guards";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase.from("learning_maps").select("id").limit(1);

    return NextResponse.json({
      success: !error,
      status: error ? "unhealthy" : "healthy",
    });
  } catch (error) {
    return safeServerError("Internal server error", error);
  }
}
