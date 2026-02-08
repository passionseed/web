import { NextRequest, NextResponse } from "next/server";
import { requireDebugAccess, safeServerError } from "@/lib/security/route-guards";

export async function GET(request: NextRequest) {
  const debug = await requireDebugAccess();
  if (!debug.ok) return debug.response;

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  try {
    const { supabase } = debug.value;

    const [profileResult, rolesResult, isAdminResult] = await Promise.all([
      supabase.from("profiles").select("id, username, full_name").eq("id", userId).single(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.rpc("is_admin", { user_uuid: userId }),
    ]);

    return NextResponse.json({
      userId,
      profile: profileResult.data || null,
      roles: rolesResult.data || [],
      isAdmin: !!isAdminResult.data,
    });
  } catch (error) {
    return safeServerError("Internal server error", error);
  }
}
