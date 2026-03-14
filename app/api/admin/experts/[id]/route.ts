import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, safeServerError } from "@/lib/security/route-guards";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { supabase } = admin.value;
    const { id } = await params;

    const { data, error } = await supabase
      .from("expert_profiles")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Expert not found" }, { status: 404 });
    }

    const { data: pathlab } = await supabase
      .from("expert_pathlabs")
      .select("*")
      .eq("expert_profile_id", id)
      .maybeSingle();

    return NextResponse.json({ expert: data, pathlab });
  } catch (error) {
    return safeServerError("Failed to fetch expert", error);
  }
}
