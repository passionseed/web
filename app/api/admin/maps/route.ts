import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, safeServerError } from "@/lib/security/route-guards";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { supabase } = admin.value;
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10)));
    const offset = (page - 1) * limit;

    const { data: maps, error } = await supabase
      .from("learning_maps")
      .select(
        `
          id,
          title,
          description,
          creator_id,
          difficulty,
          category,
          visibility,
          created_at,
          updated_at,
          metadata,
          profiles!creator_id (
            username,
            full_name
          )
        `
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: "Failed to fetch maps" }, { status: 500 });
    }

    const mapIds = maps?.map((m) => m.id) || [];
    let nodeCountByMap = new Map<string, number>();

    if (mapIds.length > 0) {
      const { data: nodeRows } = await supabase
        .from("map_nodes")
        .select("map_id")
        .in("map_id", mapIds);

      for (const row of nodeRows || []) {
        nodeCountByMap.set(row.map_id, (nodeCountByMap.get(row.map_id) || 0) + 1);
      }
    }

    const { count } = await supabase
      .from("learning_maps")
      .select("id", { count: "exact", head: true });

    return NextResponse.json({
      maps: (maps || []).map((map: any) => ({
        ...map,
        creator_name: map.profiles?.full_name || map.profiles?.username || "Unknown",
        node_count: nodeCountByMap.get(map.id) || 0,
      })),
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    return safeServerError("Internal server error", error);
  }
}
