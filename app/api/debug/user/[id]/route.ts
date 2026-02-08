import { NextResponse } from "next/server";
import { requireDebugAccess, safeServerError } from "@/lib/security/route-guards";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const debug = await requireDebugAccess();
  if (!debug.ok) return debug.response;

  try {
    const { id: userId } = await params;
    const { supabase } = debug.value;

    const [profileResult, rolesResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .eq("id", userId)
        .single(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);

    return NextResponse.json({
      userId,
      profile: profileResult.data || null,
      roles: rolesResult.data || [],
    });
  } catch (error) {
    return safeServerError("Internal server error", error);
  }
}
