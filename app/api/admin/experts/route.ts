import { NextRequest, NextResponse } from "next/server";
import { parsePositiveInt } from "@/lib/supabase/admin-list-params";
import { requireAdmin, safeServerError } from "@/lib/security/route-guards";

const EXPERT_LIST_COLUMNS =
  "id, name, title, company, field_category, status, mentoring_preference, created_at, reviewed_at, admin_notes";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { supabase } = admin.value;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";
    const page = parsePositiveInt(searchParams.get("page"), 1);
    const limit = parsePositiveInt(searchParams.get("limit"), 20, 50);
    const offset = (page - 1) * limit;

    const filtered = (columns: string, options: { count: "exact"; head?: boolean }) => {
      const query = supabase.from("expert_profiles").select(columns, options);
      return status !== "all" ? query.eq("status", status) : query;
    };

    const { data, error, count } = await filtered(EXPERT_LIST_COLUMNS, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error?.code === "PGRST103") {
      // The page is past the end (PostgREST 416, which carries no count). Send
      // the real total so the queue can offer a way back instead of an error.
      const { count: total, error: countError } = await filtered("id", { count: "exact", head: true });
      if (countError) return safeServerError("Failed to fetch experts", countError);
      return NextResponse.json({ experts: [], total: total ?? 0, page, limit });
    }
    if (error) {
      return safeServerError("Failed to fetch experts", error);
    }

    return NextResponse.json({ experts: data, total: count, page, limit });
  } catch (error) {
    return safeServerError("Failed to fetch experts", error);
  }
}
