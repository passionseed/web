import { NextResponse } from "next/server";
import { requireAdmin, safeServerError } from "@/lib/security/route-guards";
import { deleteMap } from "@/lib/supabase/maps";
import { bulkDeleteMaps, parseBulkDeleteIds } from "@/lib/supabase/admin-maps";

// Each map delete cascades through nodes, content and progress.
export const maxDuration = 60;

/**
 * POST /api/admin/maps/bulk-delete  { ids: string[] }
 * Deletes up to 100 maps, three at a time, and reports which ones failed.
 */
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const parsed = parseBulkDeleteIds(await request.json().catch(() => null));
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { supabase } = admin.value;
    const result = await bulkDeleteMaps(parsed.ids, (id) => deleteMap(id, supabase));

    return NextResponse.json(result, { status: result.deleted.length === 0 ? 500 : 200 });
  } catch (error) {
    return safeServerError("Failed to delete maps", error);
  }
}
