import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, safeServerError } from "@/lib/security/route-guards";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { supabase } = admin.value;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, parseInt(searchParams.get("limit") || "20", 10));
    const offset = (page - 1) * limit;

    let query = supabase
      .from("expert_profiles")
      .select("id, name, title, company, field_category, status, mentoring_preference, created_at, reviewed_at, admin_notes", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error, count } = await query;

    if (error) {
      return safeServerError("Failed to fetch experts", error);
    }

    return NextResponse.json({ experts: data, total: count, page, limit });
  } catch (error) {
    return safeServerError("Failed to fetch experts", error);
  }
}
