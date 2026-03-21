import { NextResponse } from "next/server";
import { requireAdmin, safeServerError } from "@/lib/security/route-guards";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { supabase } = admin.value;

    const { data, error } = await supabase
      .from("onboarding_state")
      .select(
        `
        user_id,
        current_step,
        collected_data,
        updated_at,
        profiles (
          username,
          full_name,
          avatar_url
        )
      `
      )
      .order("updated_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch onboarding data" },
        { status: 500 }
      );
    }

    return NextResponse.json(data ?? []);
  } catch (error) {
    return safeServerError("Failed to fetch onboarding data", error);
  }
}
