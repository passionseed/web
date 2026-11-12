import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, safeServerError } from "@/lib/security/route-guards";
import { listAdminMaps, parseAdminMapsQuery } from "@/lib/supabase/admin-maps";

/**
 * GET /api/admin/maps?q=&visibility=&difficulty=&page=&limit=
 * Every filter runs in SQL, so search reaches maps on every page.
 */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const query = parseAdminMapsQuery(request.nextUrl.searchParams);
    const page = await listAdminMaps(admin.value.supabase, query);
    return NextResponse.json(page);
  } catch (error) {
    return safeServerError("Failed to fetch maps", error);
  }
}
