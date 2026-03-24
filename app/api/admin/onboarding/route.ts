import { NextResponse } from "next/server";
import { requireAdmin, safeServerError } from "@/lib/security/route-guards";
import { createAdminClient } from "@/utils/supabase/admin";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const db = createAdminClient();

    const { data: states, error } = await db
      .from("onboarding_state")
      .select("user_id, current_step, collected_data, updated_at")
      .order("updated_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch onboarding data" },
        { status: 500 }
      );
    }

    if (!states || states.length === 0) {
      return NextResponse.json([]);
    }

    const userIds = states.map((s) => s.user_id);
    const { data: profiles } = await db
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .in("id", userIds);

    const profileMap = new Map(
      (profiles ?? []).map((p) => [p.id, p])
    );

    const result = states.map((s) => ({
      ...s,
      profiles: profileMap.get(s.user_id) ?? null,
    }));

    return NextResponse.json(result);
  } catch (error) {
    return safeServerError("Failed to fetch onboarding data", error);
  }
}
